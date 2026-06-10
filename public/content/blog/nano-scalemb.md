# 开源 nano-scalemb：Engram 记忆，真的在记吗？

*我们开源了 nano-scalemb，一个小型、nanochat 风格的研究框架。本文用它来回答一个很具体的问题：给 Transformer 接上一块 n-gram 记忆表之后，分数确实涨了；但模型到底是在使用这块记忆，还是只是新增了一条计算分支？*

<i class="fab fa-github"></i> **仓库：** [github.com/zy-ning/nano-scalemb](https://github.com/zy-ning/nano-scalemb)

> 这是我们
> [对 Engram 的复现与再评估](https://zhuanlan.zhihu.com/p/2027403480428558123)
> 的可复现续篇。前面那篇文章本身是对栀染广为流传的
> [《DeepSeek Engram 里没有记忆，就像 MoE 里没有专家》](https://zhuanlan.zhihu.com/p/2026419832371836848)
> 的回应，后者主张那张被津津乐道的记忆表，本质上更像一个精心包装过的正则化器。

---

## TL;DR

nano-scalemb（[github.com/zy-ning/nano-scalemb](https://github.com/zy-ning/nano-scalemb)）
是一个极简、可读、覆盖完整训练流程的脚手架。下面所有实验都是用它跑出来的。

我们放到显微镜下看的，是 **Engram + mHC**：一块 n-gram 哈希*记忆*（哈希寻址固定、表内容可学习），嵌进了一个多残差流（multi-stream）的 Transformer。单看指标，它确实有效：真实 Engram 在 CORE（0.271 对 0.263）、ChatCORE（0.410 对 0.377）、ARC-Challenge（0.563 对 0.496）等任务上都超过了无记忆基线。

真正有意思的是另一部分结果：往这块记忆里填入无用内容之后会发生什么。把学到的表换成冻结噪声，或者换成每一行都相同的空表（两种表都不含任何有用信息），chat-suite 上仍然有相当一部分增益保留下来。参数量对齐的 MLP control 进一步验证了这一点：它删掉查表，只在这条分支里保留同等规模的可训练参数，也能复现这部分增益。（不过在 pretrain 结果里，两种无内容表反而都低于基线，可训练的 MLP control 则高于基线，这本身就是一条线索。）可见分数上涨背后不止一种原因；只看下游指标，很难判断模型究竟用了什么。

为此，我们又往模型内部看：一个**因果读取测试**，在记忆里翻转单个事实，看预测会不会跟着动；一个**权重探针**，直接从每个 checkpoint 的 `state_dict` 里读模型学到了什么；另一个是**前向探针**，看模型在真实 token 上实际怎么使用 Engram 分支。合起来看，结论分成两层：模型确实学到并使用了一块 n-gram 存储，读取到的内容有可验证的因果作用；但最显眼的分数增益里，有相当一部分来自机制本身，而不是表里的内容。

下面六张图都是交互式的，鼠标悬停可以看到精确数值。

---

## nano-scalemb 是什么

它是一个精简版 [nanochat](https://github.com/karpathy/nanochat) 风格脚手架，服务于 embedding-scaling 和 Engram 实验。设计上我们尽量不把它做成复杂框架：没有复杂抽象，主要是普通脚本、dataclass，以及可以从头读到尾、直接改的控制流。模型代码在 `nano_scalemb/`（`gpt.py`、`engram.py`、`mhc.py` 等），训练流水线是 `runs/` 里的 shell 脚本，分析代码则放在 `scripts/`。本文所有实验都基于这些脚本跑出。

```bash
uv venv && source .venv/bin/activate
uv sync --extra gpu          # 或 --extra cpu / MPS
bash runs/speedrun.sh        # 基线 GPU 流水线
bash runs/nano_engram_speedrun.sh
python -m pytest             # tests/ 下的测试
```

---

## 受测架构：Engram + mHC

这次测试的模型是一个 **d24** decoder（24 层，`n_embd=1536`，12 个头，32,768 词表，2048 上下文，约 1.95 B 参数），在 [ClimbMix](https://huggingface.co/datasets/karpathy/climbmix-400b-shuffle) 上训练，训练量约为 9.5 tokens/参数。它叠加了两个 DeepSeek 近期提出的想法，我们都按论文做了复现：[Engram](https://arxiv.org/abs/2601.07372) 与 [mHC](https://arxiv.org/abs/2512.24880)。

**mHC（Manifold-Constrained Hyper-Connections，流形约束超连接）** 不再使用单条残差流，而是维护四条常驻残差流（扩张率 *n* = 4）。每个 block 里，一个依赖内容的路由器会产生三个变换：**H_pre** 把多条流混合成子层输入，**H_res** 在流之间调配，**H_post** 再把输出写回各条流。所谓“流形约束”的关键在于，H_res 会通过 Sinkhorn-Knopp（Birkhoff 多胞形上的投影）被约束成*双随机矩阵*，从而在深度方向上保持信号能量，避开朴素 Hyper-Connections 可能出现的不稳定。最后，一个可学习的 `MHCHead` 会在 LM head 之前把四条流合成一条。（`nano_scalemb/mhc.py`。）

**Engram** 就是那块 n-gram 记忆。按 DeepSeek 的说法，它是一种“条件记忆”：基于查表，和 MoE 的算力稀疏形成互补。在若干层上，它把当前 2-gram、3-gram 上下文哈希到一张大 embedding 表里，取出对应向量，再和隐状态做门控，最后经过一段短的深度可分因果卷积加回残差。关键的一点是：寻址方式（哈希）在初始化时就固定了，能学的只有表内容、读取门控和投影。“去哪里看”是固定的，“那里有什么”才是学出来的。（`nano_scalemb/engram.py`。）

在本文主消融里，记忆沿用第 2、12、18 层（`memory_dim=1280`，最大 3-gram，每个 n-gram 8 个头，4 条流），为每条残差流输出一份记忆写入向量，再交给 mHC 路由器放进各条残差流。这个设置是为了和前一篇复现对齐；后面的层位扫描会单独检查，本文结论对放置方式有多敏感。

### 五个旋钮

整个分析围绕一组 checkpoint 展开。它们共享同一个主干，只在记忆分支的输入或表内容上不同：

| 变体 | 记忆表 | 它隔离出什么 |
|---|---|---|
| **mHC baseline** | 关闭 Engram | 只有主干 |
| **Real engram** | 学到的 n-gram 记忆 | 完整方法 |
| **Randomized** | 冻结的 `N(0,1)` 噪声，从不训练 | 同样的读取与门控机制，但表项是可区分的冻结噪声 |
| **Uniform** | 每一行都相同 | 同样的读取与门控机制，但所有表项完全相同 |
| **MLP control** | 完全没有查表；查表输出换成隐状态的可学习投影 | 隔离出路由分支的可训练参数量，零 n-gram 查表 |

判断逻辑很直接。如果真正起作用的是 n-gram *内容*，那应该只有 Real 有用；如果起作用的是*机制*本身，也就是额外的门控算力和额外的路由分支，那么 Randomized 和 Uniform 也可能带来收益。后文一直在追问这两种解释各占多少。

前四个变体只在表内容上有区别；Randomized 和 Uniform 的表被冻结，不参与训练、不增加任何可训练参数。MLP control 则再往前走一步，完全删掉查表，把查表输出换成一个小的可学习投影。这样它的可训练预算几乎正好与这些消融对齐（相对基线约 +36M，全部来自路由分支，没有 n-gram 记忆），回答一个更尖锐的问题：分数上涨是不是只是因为这条分支里多了可训练参数量？

---

## 下游指标：记忆有用，但不只因为记忆

**Pretrain 结果 + SFT 结果，五个变体。**

<iframe src="/content/blog/nano-scalemb/ablation_sweep.html" title="Ablation sweep: base + SFT metrics across five variants" loading="lazy" style="aspect-ratio: 1180 / 820;"></iframe>

先看整体指标。真实 Engram 几乎在每一项上都是最好的：

| 指标（除特注外↑更好） | mHC baseline | **Real** | Randomized | Uniform | MLP control |
|---|---|---|---|---|---|
| CORE | 0.2626 | 0.2707 | 0.2520 | 0.2534 | **0.2767** |
| val bpb（↓） | 0.7107 | **0.7048** | 0.7237 | 0.7127 | 0.7170 |
| ChatCORE | 0.3765 | **0.4095** | 0.3853 | 0.3946 | 0.3854 |
| ARC-Easy | 0.6494 | **0.6970** | 0.6768 | 0.6928 | 0.6738 |
| ARC-Challenge | 0.4957 | **0.5631** | 0.5265 | 0.5316 | 0.5094 |
| MMLU | 0.3660 | **0.4047** | 0.3829 | 0.3862 | 0.3785 |
| HumanEval | 0.1280 | **0.1402** | 0.1098 | 0.1341 | 0.1220 |
| GSM8K | **0.1198** | 0.1008 | 0.1069 | 0.1016 | 0.1122 |

先分开看 pretrain 结果和 SFT 结果。pretrain 结果里，真实 Engram 的 val bpb 最低，CORE 也高于无记忆基线；这和前一篇[知乎报告](https://zhuanlan.zhihu.com/p/2027403480428558123)一致，说明真实 Engram 表在预训练阶段确实有用。SFT 结果也类似，Real 在 ChatCORE、ARC、MMLU 等指标上继续领先。GSM8K 是例外，基线分数更高。

但前一篇还留下了一个困惑：SFT 之后，Uniform 和 Randomized 这两个无内容消融在 chat 指标上表现意外地好。单看那个现象，很容易得出“记忆内容没用”的印象。这一篇要分析的正是这个困惑。

再看两个无内容列。Uniform 没有信息，Randomized 也没有有用信息，可它们仍然在 ChatCORE（0.395 与 0.385，对基线的 0.377）、ARC、MMLU 上超过了基线。空表没什么可教给模型，模型的表现却还是变好了。（不过不是所有指标都这样：pretrain 结果上结论相反，马上会说到。）

MLP control 用数字验证了这个猜测。它的可训练参数量跟 Randomized 和 Uniform 同级，但完全没有查表，结果正好落在它们的 ChatCORE 区间里（0.385，对 0.385 和 0.395），同时又超过了基线的 0.377。换句话说：把记忆拿掉，只留那条额外的可训练路由分支（约 +36M 参数），chat-suite 的增益大部分还在，跟表里的内容可能没什么关系。真实 Engram 比 MLP control 这条参数量基线多出的那一段（从 ≈0.385 爬到 0.410），才是记忆内容额外贡献的；这一步背后是一张 1.6B 参数的可学习表。

pretrain 结果给出了相反的信号。Randomized 和 Uniform 不仅不如 Real，在 CORE 上甚至连 MLP control 都不如：冻结的无内容表拖低了 CORE（0.252/0.253，低于基线 0.263），同等参数量的可训练 MLP control 反而给出了全场最好的 CORE（0.2767）。冻结的无内容表输出更像是预训练时主干必须绕过去的噪声；可训练投影则会变成额外的有用算力。所以，额外可训练参数和冻结的无内容表不是同一种干预：它们在 SFT 结果上数字接近，pretrain 结果上却被拉向了相反的方向。

这里每个格子都是一次训练 run，评测本身是确定性的，所以要提醒的不是测量噪声，而是 run-to-run 的训练波动。尤其是 MLP control 的 CORE 领先，应该当作一个有参考价值的信号，而不是确定结论。总分能说明加记忆有用，但它测到的显然不只是真正的记忆内容；接下来不能只看总分了，得往模型里面看。

```bash
# 复现：在同一主干上训练四个表变体……
bash runs/run_engram_ablation_sweep_21218_mhc.sh
# ……再训练参数量对齐、无查表的 MLP control，最后绘制五个变体
bash runs/run_engram_mlp_control_21218_mhc.sh
python docs/blog/plot_ablation_sweep.py
```

---

## 记忆层要几层、放哪儿？

前一篇[知乎报告](https://zhuanlan.zhihu.com/p/2027403480428558123)里已经看到：Engram 放在不同深度位置，内容和机制的占比会变。稀疏的中到晚层布局让内容贡献更清楚；密集铺满时，机制效应会盖过内容差距。所以这里我们把层数和位置系统性地扫了一遍。

**训练 loss、val bpb、CORE、ChatCORE 随 Engram 层数与位置的变化，并画出每个层数下的最优前沿。**

<iframe src="/content/blog/nano-scalemb/layer_count_sweep.html" title="Layer count sweep: metrics vs number and placement of Engram layers" loading="lazy" style="aspect-ratio: 1180 / 900;"></iframe>

扫过 1 层、2 层、3 层的不同放置后，结果大体符合直觉：记忆层越多，loss 和 bpb 越好，但收益会递减；而且放在哪里很关键。最强的配置不是把记忆挤在一处，而是分布在早、中、晚三个深度段上。

- 最佳 1 层：`3` → 训练 loss 2.352，val bpb 0.709
- 最佳 2 层：`3,12` → 训练 loss 2.328，val bpb 0.705
- 最佳 3 层（CORE）：`8,12,17` → CORE 0.269

图里的虚线网格把每个配置连到它的超集（`3 → 3,12 → 3,12,17`），方便直接看出：在某个基础上再加一层，到底值不值。

不过这里有个前提容易被忽略。三层附近的前沿确实变平了，但这不等于架构已经到头。所有配置训练步数相同；一个 3 层 Engram 要在相同 token 预算下填满大约三倍数量的记忆表，于是每张表得到的有效更新更少。3 层配置没能继续拉开差距，恐怕有一部分原因只是额外记忆*还没训够*，而不是它们已经没有潜力。更稳妥的读法是：把这个趋平前沿当成下界。如果训练更久，或者让每张表的更新次数对齐，差距可能还会变大。带着这个前提看，趋平仍然和前面的消融相吻合：我们得到的一部分收益来自参数量和算力，而这一部分会先饱和。

```bash
# 复现：在 1 / 2 / 3+ 层扫描 Engram 放置，再绘图
bash runs/run_one_layer_sweep_mhc.sh
bash runs/run_two_layer_sweep_mhc.sh
bash runs/run_four_layer_sweep_mhc.sh   # 在最佳 3 层配置上扩展
python docs/blog/plot_layer_count_sweep.py
```

---

## 这个读取真的有因果作用吗？

**替换记忆的输入，盯住目标 token。**

<iframe src="/content/blog/nano-scalemb/donor_probe.html" title="Donor probe: swapping the Engram input stream and watching the target token" loading="lazy" style="aspect-ratio: 1100 / 600;"></iframe>

这个测试在 Engram 上很好做。如前所述，Engram 不是拿整段文本做检索：它在每个位置上，把局部窗口里的 2～3 个连续 token id（当前的 2-gram、3-gram）哈希成查表的键。这条 token 流就是 `engram_input_ids`，正常情况下它等于 prompt 本身。但我们也可以*固定 prompt*，只把喂给记忆的 token 流换成另一段“供体”（donor）文本：一段与目标事实匹配的、一段与目标事实冲突的、一段无关的，然后观察目标 token 的 logit 怎么变。如果读取机制没有作用，logit 就不该动。

结果是，logit 确实动了。在三个事实回忆案例上（*法国 → 巴黎*、*金 → Au*、*最大的行星 → 木星*），替换供体可以让目标 logit 最多移动 **−1.4**，幅度清楚且可复现。这个粗粒度测试至少说明：记忆输入不是摆设，换掉它会实实在在改变目标 logit。不过，正如下面两个现象所示，这个下降始终不足以让排名第二的 token 反超目标。每个“案例 × 供体”组合都满足两点：

1. 变化永远是*下降*。把 prompt 自己的记忆喂回去时，目标 logit 最高；换成任何其他供体，置信度都会下降。
2. 预测从不翻转。全部九个组合里，目标 token 始终是 **rank-1**。

所以，读取机制确实接进了网络，也确实会影响预测；但这个版本还不能干净证明它读到了对应事实。在主干本来就很熟的事实上，它更像一个置信度调节项，而不是最终决策依据。作用是真的，但不强。

问题就在这里：第一版 donor probe 分不清模型是在响应*事实内容*，还是仅仅在响应“记忆输入变了”。它把一整段外来文档平铺进记忆流，再和“prompt 本身作为记忆输入”的条件比较，这同时混进了两种效应：读取机制对事实内容的反应，和对输入分布整体偏移的反应。

更麻烦的是，这个设置本身就双重 OOD。记忆训练时读的是模型自己的连续上下文，不是一段平铺进去的外来段落；它的读取也靠位置对齐的 n-gram 哈希查表，不是那种能在 donor 里搜到相关事实的检索器。所以，当事实信号很弱时（匹配供体减对抗供体只有约 +0.04 logit，和冻结随机控制差不多），它更像是在说明测试设置不够干净，而不是在证明读取没有内容。于是我们做了一个更精确的版本。

### 一个更精确的测试：在分布内翻转单个事实 token

**固定 prompt，只翻转记忆里的那一个事实 token。**

<iframe src="/content/blog/nano-scalemb/flip_probe.html" title="Flip probe: single-token factual flip inside the Engram memory stream" loading="lazy" style="aspect-ratio: 1180 / 620;"></iframe>

新版测试改成了更严格的控制变量实验：主干 prompt 固定为“法国的首都是”，只对喂给 Engram 模块的那条输入句子下手，翻转其中承载事实主体的 token（例如“法国”），句子其余部分一字不动。于是记忆流读到的，要么是与 prompt 一致的句子（`self`：“法国……”），要么是只把主体从“法国”换成“日本”的版本（`flip`：把“法国的首都是”改成“日本的首都是”）。

我们刻意只挑那些本身就是单个 token 的实体，于是“翻一个事实”恰好等于“翻一个 token”（实现上的限制见下文）。这样一来，记忆读到的就是它训练时天天见的那种真实、连续的上下文，被翻掉的 token 也落在读取实际查表所用的 n-gram 窗口内（读取会把记忆流和主干右对齐），而唯一变化的只有这句话在断言哪个事实。说白了：当模型被问到“法国的首都是”时，我们让 Engram 错误地去召回与“日本”相关的记忆，再看预测会不会相对抬高“东京”、压低“巴黎”。

记 $\ell(t \mid e)$ 为记忆流读到 $e$ 时 token $t$ 的 logit。对原答案（home answer）为 $a$、翻转后匹配答案（flip answer）为 $b$ 的样例，信号就是双重差分：

$$\text{signal} = \big[\ell(b \mid \text{flip}) - \ell(a \mid \text{flip})\big] - \big[\ell(b \mid \text{self}) - \ell(a \mid \text{self})\big]$$

即相对于“记忆输入与 prompt 一致”的条件，翻转事实之后，记忆让模型更偏向翻转后匹配答案、而不是原答案的幅度。实现上有一个小限制：被翻的实体必须是固定位置的单 token；很多实体一换就会触发重新分词，所以生成样例时会直接排除这些实体对。

结果确实有信号。在 **5 个知识域共 36 个样例**上（首都、语言、化学符号、大洲、行星顺序），单 token 翻转平均把匹配答案抬高了 **+0.36 logit**，**28/36** 的方向是正确的。两个无内容控制组没有显示同样的事实信号：Randomized 在零附近波动；Uniform 因为每一行完全相同，翻转在表这个层面等于什么都没改，所以每个样例都是**严格的零**——一个很干净的下界。这说明，在分布内条件下，读取确实携带着事实信息。

有两个局限需要说明：

1. **幅度的变化并不独特。** 任意实体替换（哪怕换成一个没有任何事实含义的填充词）都会让 logit 以相近幅度变化。真正跟事实绑定的是*方向*（抬高匹配答案），不是*幅度*本身。用填充词控制掉这层表面扰动之后，信号为 +0.23，21/36 为正；小了些，但仍然明显高于控制组。
2. **主干仍然主导。** 被翻出来的首都几乎从不会真的超过 home answer。读取改变的是预测倾向，不是最终输出。

把 8 个失败的案例拆到 token 级别看，反而更验证了这一点：一个属于统计上的假象（表面扰动把尾部目标 token 拉得比 rank-1 的 home token 更快掉了），四个来自模型本来就不稳定的知识域，信号接近随机波动，真正算得上失误的只有三个。这三个恰好落在记忆最不容易学扎实的地方：多义单字符答案 token（`O`、`H`）和一个弱关联（Greece → Athens）。所以更准确的说法是：读取是真的，方向跟内容有关，但它不是决策者，主干才是。

```bash
# 原始 donor swap（保留作对照）
bash runs/run_engram_donor_probe_21218.sh   # 封装 scripts/engram_donor_eval.py
python docs/blog/plot_donor_probe.py

# 分布内的单 token 翻转探针（real + randomize + uniform），再绘图
python -m runs.gen_engram_flip_cases        # 重新生成并校验 36 个样例
bash runs/run_engram_flip_probe_all.sh      # 封装 scripts/engram_flip_eval.py
python docs/blog/plot_flip_probe.py
```

---

## 它学到了什么？读权重

**代码：`scripts/engram_weight_probe.py`。**

<iframe src="/content/blog/nano-scalemb/weight_probe.html" title="Weight probe: drift-from-init signals read straight from the checkpoint" loading="lazy" style="aspect-ratio: 1280 / 560;"></iframe>

这里有个很省事的切入点。Engram 里几乎每个关键参数都有明确的初始值：`value_proj` 是 **0**，短卷积是 **0**，读取门控投影从一个均匀尺度出发，表本身来自 `N(0,1)`。因此，训练后的权重离初始值漂了多远，本身就是一个不用重新训练、也不用跑前向的信号：它告诉我们模型最后主要调整了哪些部分。直接从 checkpoint 里读就可以。这就是权重探针。

它逐个变体追踪三件事：这一层往残差里写入了多大向量（`value_proj` RMS，初始 0）、读取门控投影相对初始值放大了多少（`stream_key_proj` 范数除以初始值），以及 embedding 表的行范数是否明显增大。

三个变体的差异很清楚：

- **Real** 的 embedding 表行范数增大到初始的约 **50 倍**（～440 对 ～9），同时写入投影从 0 明显偏离（`value_proj` RMS ≈ 0.13–0.15），读取门控投影也放大到初始的 ～4–5 倍。

- **Randomized** 改不了那张冻结表，只好把读取门控投影放大得更多（～5 倍初始），试图利用冻结噪声中的差异。

- **Uniform** 则走向相反方向：它几乎关掉了写入机制（`value_proj` RMS 降到 ～0.005–0.03），并把读取门控投影拉到*低于*初始值。一张没有信息的表不值得读取，权重变化也反映了这一点。

三种行为差异明显。不过，权重只能说明模型*可能*怎么做；真正有文本流过时，它实际做了什么，还得看前向。

```bash
# 复现：直接从 checkpoint 读“相对初始的漂移”（无需前向）
python -m scripts.engram_weight_probe \
    --checkpoint REAL_CKPT:STEP \
    --checkpoint RANDOMIZE_CKPT:STEP \
    --checkpoint UNIFORM_CKPT:STEP \
    --output-dir docs/blog/weight_probe
python docs/blog/plot_weight_probe.py
```

---

## 它实际做了什么？看前向

**代码：`scripts/engram_forward_probe.py`。**

<iframe src="/content/blog/nano-scalemb/forward_probe.html" title="Forward probe: read gate distribution, selectivity, and written contribution on real tokens" loading="lazy" style="aspect-ratio: 1280 / 560;"></iframe>

前向探针把一小批真实验证 token 推过每个 checkpoint，读出只有在前向传播时才会出现的激活信号。它不训练、不反传，只需要约 4k token。采集时，我们用轻量封装从模块*自己*训练好的权重里重算内部量，并始终返回模型原本的真实输出；因此，前向传播本身以及报告出来的 loss 都没有被改动。

三个面板，全部基于真实文本。

**读取门控。** 逐 token、逐流地看，gate 值是一个落在 (0,1) 的 sigmoid；更有信息量的是它的分布形状：

| 变体（第 12 层） | gate 值 Q1–中位数–Q3 | 形状 |
|---|---|---|
| **Real** | 0.23 – 0.37 – 0.53 | 渐变，落在中低位 |
| **Randomized** | 0.01 – 0.55 – **0.995** | 撞向两端（0/1） |
| **Uniform** | 0 – 0 – 0 | 关闭 |

Real 的 gate 值是连续渐变的、随内容变化的。Randomized 的 gate 值冲向两个极端；它分不清自己读到的 token，只能在接近 0 和接近 1 之间切换。Uniform 则在深层把 gate 基本关掉。

**gate 值的选择性**（跨 token 的标准差）给出了同样的排序。第三个面板，也就是记忆实际*写入*了多少，才是关键：

| 变体 | Engram 输出 RMS（第 2/12/18 层） |
|---|---|
| **Real** | **～100 – 145** |
| **Randomized** | ～4 – 6 |
| **Uniform** | ～0.3 – 6 |

真实 Engram 写进残差的量级，大约是两个消融的 **25 倍**。这正好是权重结果在推理期的对应面：Randomized 的表输出范数很小，因为冻结噪声从来没有被训练放大；Uniform 把自己的写入压到了接近零。于是，就算它们的 gate 值偶尔不为零，gate 的另一端也几乎没有可写入的内容。还有一个细节：Uniform 的 `MHCHead` 坍缩到单一一条流上（`[0, 0, 0, 1.0]`），等于绕开了 Uniform 表本来会写入的几条流。

单批 loss 也和这些现象对得上：Real 最好，Randomized 最差；这与消融部分的全量 val bpb 互相印证。

```bash
# 复现：在真实 token 上跑前向信号
python -m scripts.engram_forward_probe \
    --checkpoint REAL_CKPT:STEP \
    --checkpoint RANDOMIZE_CKPT:STEP \
    --checkpoint UNIFORM_CKPT:STEP \
    --checkpoint MHC_BASELINE_CKPT:STEP \
    --device cpu --batch-size 8 --seq-len 512 \
    --output-dir docs/blog/forward_probe
python docs/blog/plot_forward_probe.py
```

---

## Jigsaw Falling Into Place

把证据放在一起，图景就比较清楚了：

- **下游指标：** Real 总体最好；但无内容消融在 chat-suite 上保留了不少增益，同时在 pretrain 结果上反而低于基线。MLP control 证明这部分 chat 增益来自路由分支的额外参数量，而非表内容——内容和机制影响不同的指标。
- **模型内部：** 读取机制确实被使用，也对内容敏感；但在主干已掌握的事实上主要起调节作用。Real 的表行范数和写入量都明显增大，Uniform 几乎关掉写入，Randomized 则提高读取门控，试图利用冻结噪声。

这两种解释并不互斥，而是同时成立。真实 Engram 确实学到并使用了一块 n-gram 记忆，三类探针都确认了这一点。但最显眼的增益里，有相当一块来自机制而非内容：哪怕表是空的，甚至没有表、只剩一个参数量对齐的可训练分支，额外的门控和路由也会带来收益。只看总分，会把这两件事混在一起。

这也回应了“记忆表只是正则化”的说法——栀染提供了一种有用的消融思路，但我们的结论在很多地方并不相同。内容并不是惰性的：真实表的行范数增加到初始的约 50 倍，写入量是消融的约 25 倍，pretrain 结果也随之移动，它绝不是一个只为约束训练而存在的惰性正则项。我们唯一认可的、也更弱的一点是：在最显眼的那部分增益里，确实有相当一块来自额外的门控与路由分支，而不是查表内容本身。而且内容与机制各占多少并不固定，会随记忆放在哪些层而变化：相比我们在单残差流下的复现，mHC 的多残差流架构让真实 Engram 相对消融的领先幅度大得多，多残差流似乎放大了记忆内容的贡献。

做架构研究一段时间，一个体会是：这类结论可以非常微妙。换一组特征、换一种层排布、换个实现细节、甚至换个模型规模，实验结果就可能完全不同。所以，一边要谨慎，别把单一配置下的发现轻易当成普适规律；另一边，充足的消融和超参扫描也不是可有可无的补充，而是必须认真做的实验。后续我们也计划在更大的 scale 上做 scaling ladder 对照实验，把 Engram 和 STEM、Gemma4 PLE、MoE 等方案拉到同一张表里，看看各自的 scaling behavior 到底有什么不同。

回到标题的问题：Engram 记忆，真的在记吗？答案是会——探针清楚地表明模型学到并使用了一块依赖内容的存储。pretrain 结果也支持这一点：真实表提升了 val bpb 和 CORE，而无内容表会拖低 CORE。但在主干本就熟悉的事实上，这块记忆更像是一个置信度调节项，而不是最终决策者；SFT 结果里 chat-suite 上那部分最显眼的提升，更可能来自这条分支额外的可训练参数。只有往模型内部看，才能把这些拆清楚，这也是本文想说的全部。

---

## 获取 nano-scalemb

代码在 GitHub：**[github.com/zy-ning/nano-scalemb](https://github.com/zy-ning/nano-scalemb)**。

上面提到的内容都在仓库里。每一节的 `复现` 代码块都是可以直接复制粘贴的命令；探针脚本也都在 `scripts/` 和 `docs/blog/` 下。

```bash
uv venv && source .venv/bin/activate
uv sync --extra gpu          # 或 --extra cpu
bash runs/speedrun.sh        # 先训一个基线，再去探它
```

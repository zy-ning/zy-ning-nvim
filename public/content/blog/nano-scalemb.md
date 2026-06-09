# 开源 nano-scalemb：Engram 记忆真的会「记住」吗？

*我们开源了 nano-scalemb，一个小型、nanochat 风格的研究框架。本文用它来回答一个很具体的问题：给 Transformer 加上一块 n-gram 记忆之后，分数确实涨了；但模型到底是在使用这块记忆，还是只是多了一条计算分支？*

<i class="fab fa-github"></i> **仓库：** [github.com/zy-ning/nano-scalemb](https://github.com/zy-ning/nano-scalemb)

> 这是我们
> [对 Engram 的复现与再评估](https://zhuanlan.zhihu.com/p/2027403480428558123)
> 的可复现续篇。前面那篇文章本身是对栀染广为流传的
> [《DeepSeek Engram 里没有记忆，就像 MoE 里没有专家》](https://zhuanlan.zhihu.com/p/2026419832371836848)
> 的回应——后者主张那张被津津乐道的记忆表，本质上更像一个精心包装过的正则化器。

---

## TL;DR

nano-scalemb（[github.com/zy-ning/nano-scalemb](https://github.com/zy-ning/nano-scalemb)）
是一个极简、可读、覆盖完整训练流程的脚手架。下面所有实验都是用它跑出来的。

我们放到显微镜下看的，是 **Engram + mHC**：一块 n-gram 哈希*记忆*（哈希寻址固定、表内容可学习），嵌进了一个多残差流（multi-stream）的 Transformer。单看指标，它确实有效：真实记忆在 CORE（0.271 对 0.263）、ChatCORE（0.410 对 0.377）、ARC-Challenge（0.563 对 0.496）等任务上都超过了无记忆基线。

真正有意思的是垃圾表实验。把学到的表换成冻结噪声，或者换成每一行都相同的空表之后，chat-suite 上居然还有相当一部分增益保留下来，尽管这些表里没有任何有用信息。（但在 base 指标上，这些增益并没有保住。这也是一条线索。）所以，分数上涨背后不止一种原因；只看下游指标，很难判断模型到底用了什么。

为此，我们又做了两个内部探针。一个是**权重探针**，直接从每个 checkpoint 的 `state_dict` 里读模型学到了什么；另一个是**前向探针**，看模型在真实 token 上实际怎么用这条机制。两者合起来给出的结论是：真实记忆确实学到了、也确实使用了一块 n-gram 存储；但最显眼的分数增益里，有相当一部分来自结构本身，而不是表里的内容。

下面五张图都是交互式的，鼠标悬停可以看到精确数值。

---

## nano-scalemb 是什么

它是一个精简过的 [nanochat](https://github.com/karpathy/nanochat) 风格脚手架，服务于 embedding-scaling 和 Engram 实验。设计上我们尽量不把它做成「框架」：没有复杂抽象，主要是普通脚本、dataclass，以及可以从头读到尾、直接改的控制流。模型代码在 `nano_scalemb/`（`gpt.py`、`engram.py`、`mhc.py` 等），训练流水线是 `runs/` 里的 shell 脚本，分析代码则放在 `scripts/`。本文所有实验都从这里跑出；两个可解释性探针甚至不需要 GPU，一个 checkpoint 加几分钟 CPU 时间就够了。

```bash
uv venv && source .venv/bin/activate
uv sync --extra gpu          # 或 --extra cpu / MPS
bash runs/speedrun.sh        # 基线 GPU 流水线
bash runs/nano_engram_speedrun.sh
python -m pytest             # tests/ 下的测试
```

---

## 受测架构：Engram + mHC

这次测试的模型是一个 **d24** 解码器（24 层，`n_embd=1536`，12 个头，32,768 词表，2048 上下文，约 1.95 B 参数），在 [ClimbMix](https://huggingface.co/datasets/karpathy/climbmix-400b-shuffle) 上训练，训练量约为 9.5 tokens/参数。它叠加了两个 DeepSeek 近期提出的想法，我们都按论文做了复现：[Engram](https://arxiv.org/abs/2601.07372) 与 [mHC](https://arxiv.org/abs/2512.24880)。

**mHC（Manifold-Constrained Hyper-Connections，流形约束超连接）** 不再使用单条残差流，而是维护四条常驻残差流（扩张率 *n* = 4）。每个 block 里，一个依赖内容的路由器会产生三个变换：**H_pre** 把多条流混合成子层输入，**H_res** 在流之间重新混合，**H_post** 再把输出写回各条流。所谓「流形约束」的关键在于，H_res 会通过 Sinkhorn-Knopp（Birkhoff 多胞形上的投影）被约束成*双随机矩阵*，从而在深度方向上保持信号能量，避开朴素 Hyper-Connections 可能出现的不稳定。最后，一个可学习的 `MHCHead` 会在 LM head 之前把四条流合成一条。（`nano_scalemb/mhc.py`。）

**Engram** 就是那块 n-gram 记忆。按 DeepSeek 的说法，它是一种「条件记忆」：基于查表，和 MoE 的算力稀疏形成互补。在若干层上，它把当前 2-gram、3-gram 上下文哈希到一张大 embedding 表里，取出对应向量，再和隐状态做门控，最后经过一段短的深度可分因果卷积加回残差。对下文来说，关键的一点是：寻址方式（哈希）在初始化时就固定了，能学的只有表内容、读取门控和投影。「去哪里看」是固定的，「那里有什么」才是学出来的。（`nano_scalemb/engram.py`。）

在本文实验里，记忆放在第 2、12、18 层（`memory_dim=1280`，最大 3-gram，每个 n-gram 8 个头，4 条流），输出 per-stream 的贡献，再交给 mHC 路由器放进各条残差流。

### 四个旋钮

整个分析围绕四个 checkpoint 展开。它们除了记忆表里放的东西不同，其他设置完全一致：

| 变体 | 记忆表 | 它隔离出什么 |
|---|---|---|
| **mHC baseline** | 关闭 Engram | 只有主干 |
| **Real engram** | 学到的 n-gram 记忆 | 完整方法 |
| **Randomized** | 冻结的 `N(0,1)` 噪声，从不训练 | 读取与门控机制，配一个无内容但*可区分*的载荷 |
| **Uniform** | 每一行都相同 | 同样的机制，配完全没有信息的载荷 |

判断逻辑很直接。如果真正起作用的是 n-gram *内容*，那应该只有 Real 有用；如果起作用的是*机制*本身，也就是额外的门控算力和额外的路由分支，那么 Randomized 和 Uniform 也可能带来收益。后文其实一直在追问这两种解释各占多少。

---

## 记忆到底有没有用？

**Base + SFT 指标，四个变体。**

<iframe src="/content/blog/nano-scalemb/ablation_sweep.html" title="Ablation sweep: base + SFT metrics across four variants" loading="lazy" style="aspect-ratio: 1180 / 820;"></iframe>

先看整体指标。真实 Engram 几乎在每一项上都是最好的：

| 指标（除特注外↑更好） | mHC baseline | **Real** | Randomized | Uniform |
|---|---|---|---|---|
| CORE | 0.2626 | **0.2707** | 0.2520 | 0.2534 |
| val bpb（↓） | 0.7107 | **0.7048** | 0.7237 | 0.7127 |
| ChatCORE | 0.3765 | **0.4095** | 0.3853 | 0.3946 |
| ARC-Easy | 0.6494 | **0.6970** | 0.6768 | 0.6928 |
| ARC-Challenge | 0.4957 | **0.5631** | 0.5265 | 0.5316 |
| MMLU | 0.3660 | **0.4047** | 0.3829 | 0.3862 |
| HumanEval | 0.1280 | **0.1402** | 0.1098 | 0.1341 |
| GSM8K | **0.1198** | 0.1008 | 0.1069 | 0.1016 |

到这里，故事还很顺：这块记忆在 CORE、val bpb 和整个 chat suite 上都对得起它的开销，只有 GSM8K 是基线赢回一局。

再看旁边两列。Uniform 没有信息，Randomized 没有有用信息，可它们仍然在 ChatCORE（0.395 与 0.385 对 0.377）、ARC、MMLU 上超过基线。空表本来没什么可教给模型，模型却还是变好了。（当然不是所有地方都这样：在 base 指标上，两个消融都*低于*基线，CORE 0.252/0.253 对 0.263，val bpb 也更差。这说明内容和机制会在不同指标上产生不同作用。）这就是后文要拆开的谜题：分数说「加记忆有用」，但它测到的显然不只是真正的记忆内容。接下来不能再只看总分了，得往模型内部看。

```bash
# 复现：在同一主干上训练全部四个变体，再绘图
bash runs/run_engram_ablation_sweep_21218_mhc.sh
python docs/blog/plot_ablation_sweep.py
```

---

## 记忆层要几层、放哪儿？

**训练 loss、val bpb、CORE、ChatCORE 随 Engram 层数与位置的变化，并画出「每个层数下的最优」前沿。**

<iframe src="/content/blog/nano-scalemb/layer_count_sweep.html" title="Layer count sweep: metrics vs number and placement of Engram layers" loading="lazy" style="aspect-ratio: 1180 / 900;"></iframe>

扫过 1 层、2 层、3 层的不同放置后，结果大体符合直觉：记忆层越多，loss 和 bpb 越好，但收益会递减；而且放在哪里很关键。最强的配置不是把记忆挤在一处，而是分布在早、中、晚三个深度段上。

- 最佳 1 层：`3` → 训练 loss 2.352，val bpb 0.709
- 最佳 2 层：`3,12` → 训练 loss 2.328，val bpb 0.705
- 最佳 3 层（CORE）：`8,12,17` → CORE 0.269

图里的虚线网格把每个配置连到它的超集（`3 → 3,12 → 3,12,17`），方便直接看出：在某个基础上再加一层，到底值不值。

不过这里有个容易被忽略的前提。三层附近的前沿确实变平了，但不能马上解读成「架构已经到头」。这些配置训练步数相同；一个 3 层 Engram 要在相同 token 预算下填满大约三倍数量的记忆表，于是每张表得到的有效更新更少。3 层配置没能继续拉开差距，这里面恐怕有一部分原因只是额外记忆*还没训够*，而不是它们已经没有潜力。更稳妥的解读是：把这个趋平前沿当成下界。如果训练更久，或者让每张表的更新次数对齐，差距可能还会变大。带着这个前提看，趋平仍然和前面的消融相吻合：我们买到的一部分收益来自容量和算力，而这一部分会先饱和。

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

这个测试在 Engram 上很好做。Engram 从一条 token 流（`engram_input_ids`）读取；正常情况下，这条流就是 prompt 本身。但我们也可以*固定 prompt*，只把喂给记忆的文本换成另一段「供体」（donor）文本：一段匹配的、一段对抗的、一段无关的。然后观察目标 token 的 logit 怎么变。如果读取机制没有作用，logit 就不该动。

结果是，它确实动了。在三个事实回忆案例上（*法国 → 巴黎*、*金 → Au*、*最大的行星 → 木星*），读取机制确实在工作：替换供体可以让目标 logit 最多移动 **−1.4**，幅度清楚且可复现。不过，正如下面两个现象所示，这个移动始终还不足以追平 rank-2 的差距。每个「案例 × 供体」组合都满足两点：

1. 变化永远是*下降*。把 prompt 自己的记忆喂回去时，目标 logit 最高；换成任何其他供体，置信度都会下降。
2. 预测从不翻转。全部九个组合里，目标 token 始终是 **rank-1**。

所以，读取机制确实接进了网络，也确实对内容敏感；但在主干本来就很熟的事实上，它更像一个置信度旋钮，而不是最终拍板的人。作用是真的，但不强。

```bash
# 复现：在 real-Engram checkpoint 上替换供体流，再绘图
bash runs/run_engram_donor_probe_21218.sh   # 封装 scripts/engram_donor_eval.py
python docs/blog/plot_donor_probe.py
```

---

## 它学到了什么？读权重

**代码：`scripts/engram_weight_probe.py`。**

<iframe src="/content/blog/nano-scalemb/weight_probe.html" title="Weight probe: drift-from-init signals read straight from the checkpoint" loading="lazy" style="aspect-ratio: 1280 / 560;"></iframe>

这里有个很省事的切入点。Engram 里几乎每个关键旋钮都有明确的初始值：`value_proj` 是 **0**，短卷积是 **0**，读取门控投影从一个均匀尺度出发，表本身来自 `N(0,1)`。因此，训练后的权重离初始值漂了多远，本身就是一个不用训练、也不用前向传播的信号：它告诉我们模型最后选择依赖什么。直接在 CPU 上从 checkpoint 里读就可以。这就是权重探针。

它逐个变体追踪三件事：这一层往残差里写得有多用力（`value_proj` RMS，初始 0）、读取机制长大了多少（`stream_key_proj` 范数除以初始值），以及表是不是真的被填起来了（embedding 行范数的分布）。

三个变体的行为分得很干净：

- **Real** 把记忆长到了初始的约 **50 倍**（行范数 ~440 对 ~9），同时打开了写入（`value_proj` RMS ≈ 0.13–0.15）和读取门控（~4–5 倍初始）。
- **Randomized** 改不了那张冻结表，只好把读取门控*开得更猛*（~5 倍初始），试图从无法改进的噪声里读出点东西。
- **Uniform** 则走向相反方向：它几乎关掉了写入机制（`value_proj` RMS 降到 ~0.005–0.03），并把读取门控拉到*低于*初始值。一张没有信息的表不值得看，权重也这么说。

三种行为泾渭分明。不过，权重只能说明模型*可能*怎么做；真正有文本流过时，它实际做了什么，还得看前向。

```bash
# 复现：直接从 checkpoint 读「相对初始的漂移」（CPU，无需前向）
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

前向探针把一小批真实验证 token 推过每个 checkpoint，读出那些只有激活真正流动起来才会出现的信号。它和权重探针一样便宜：不训练、不反传，大约 4k token，在 CPU 上几分钟就能跑完。采集时，我们用轻量包装器从模块*自己*训练好的权重里重算内部量，并始终返回模型原本的真实输出；因此，前向传播本身以及报告出来的 loss 都没有被改动。

三个面板，全部基于真实文本。

**读取门控。** 逐 token、逐流地看，gate 值是一个落在 (0,1) 的 sigmoid；真正有信息的是它的*形状*：

| 变体（第 12 层） | gate 值 Q1–中位数–Q3 | 形状 |
|---|---|---|
| **Real** | 0.23 – 0.37 – 0.53 | 渐变，落在中低位 |
| **Randomized** | 0.01 – 0.55 – **0.995** | 撞向两端（0/1） |
| **Uniform** | 0 – 0 – 0 | 关闭 |

Real 的 gate 值是连续渐变的、随内容变化的。Randomized 的 gate 值冲向两个极端；它分不清自己读到的 token，只能在全开和全关之间来回摆。Uniform 则在深层干脆把 gate 彻底关掉。

**gate 值的选择性**（跨 token 的标准差）给出了同样的排序。第三个面板，也就是记忆实际*写入*了多少，才是关键：

| 变体 | Engram 输出 RMS（第 2/12/18 层） |
|---|---|
| **Real** | **~100 – 145** |
| **Randomized** | ~4 – 6 |
| **Uniform** | ~0.3 – 6 |

真实记忆写进残差的量级，大约是两个消融的 **25 倍**。这正好是权重结果在推理期的对应面：Randomized 的载荷范数很小，因为冻结噪声从来没有长大；Uniform 把自己的写入压到了接近零。于是，就算它们的 gate 偶尔开一条缝，gate 的另一端也几乎空无一物。还有一个细节：Uniform 的 `MHCHead` 坍缩到单一一条流上（`[0, 0, 0, 1.0]`），等于把信号从那块死记忆馈入的几条流上绕开了。

单批 loss 也和这些现象对得上：Real 最好，Randomized 最差；这与消融部分的全量 val bpb 互相印证。

```bash
# 复现：在真实 token 上跑廉价的前向信号（CPU，几分钟）
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

## 把证据拼起来

把证据放在一起，图景就比较清楚了：

- **下游指标：** Real 赢了；但无信息消融在 *chat-suite* 上拿回了不少增益，同时又在 base 指标（CORE、val bpb）上*低于*基线。也就是说，内容和机制会影响不同的指标。
- **模型内部：** 读取机制是活的，也对内容敏感（虽然在主干已掌握的事实上主要起调制作用）；Real 会长大并打开自己的记忆，Uniform 会把它关掉，Randomized 则拼命想从冻结噪声里读出东西；真正跑真实 token 时，Real 写入的是一个大得多、连续变化、带选择性的贡献，而两个消融几乎什么都没写。

结论不是二选一。真实 Engram 确实学到并使用了一块 n-gram 记忆——权重探针和前向探针都明确了这一点，它也带来了真实的下游质量提升。但最显眼的增益里，有相当一块来自*机制*而非*内容*：哪怕表是空的，额外的门控和路由分支也会帮忙。这一点直接回应了记忆表「只是正则化」的说法：方向对，但「只是」说过了。内容并非惰性——真实表长了约 50 倍，写入量是消融的约 25 倍。相比我们在单残差流下的复现，mHC 的多残差流架构让真实 Engram 相对消融的领先幅度大得多，多残差流似乎放大了记忆内容的贡献。在其他位置的实验中，稀疏的中到晚层布局让内容贡献干净明确，密集铺满时则结构占优。

做架构研究久了，一个体会是：这类结论可以非常微妙。换一组特征、换一种层排布、换个实现细节、甚至换个模型规模，实验结果就可能完全不同。所以，一边要保持谦卑，别把单一配置下的发现轻易当成普适规律；另一边，充足的消融和超参扫描也真的不是锦上添花，是需要老老实实做的事。后续我们也计划在更大的 scale 上做 scaling ladder 对照实验，把 Engram 和 STEM、Gemma4 PLE、MoE 等方案拉到同一张表里，看看各自的 scaling behavior 到底有什么不同。

回到标题的问题：Engram 记忆真的会「记住」吗？答案是会，探针清楚地表明模型学到并使用了一块真实的、依赖内容的存储。但在主干本就熟悉的事实上，这块记忆更像是一个置信度旋钮。只有往模型内部看，才能把这些拆清楚——这也是本文想说的全部。

---

## 获取 nano-scalemb

代码在 GitHub：**[github.com/zy-ning/nano-scalemb](https://github.com/zy-ning/nano-scalemb)**。

上面提到的内容都在仓库里。每一节的 `复现` 代码块都是可以直接复制粘贴的命令；两个探针需要的，也不过是一个 checkpoint 和一颗 CPU。

```bash
uv venv && source .venv/bin/activate
uv sync --extra gpu          # 或 --extra cpu
bash runs/speedrun.sh        # 先训一个基线，再去探它
```

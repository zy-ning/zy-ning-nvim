# Attention Residuals: Another Step Towards a Highly Interconnected 3D Brain

> 为了方便**GPU 的大规模并行训练**和**模型 Scaling**，模型架构普遍选择了极其简单、线性的网络拓扑结构。
>
> 然而人类大脑神经回路的强大，很大程度上源于其密集的跨区域投射、复杂的分支以及自适应的突触连接，而不是像流水线一样的逐层传递。
>
> 当前的神经网络前向传播依然是有向无环(DAG)，但 AttnRes 和 mHC 确实打破了传统模型的“一维线性深度”束缚。它们让深度的信息传递从一条单行道，变成了一张**高度互联、动态分配的复杂路由网。**

## Preliminary

Background: Scaling the **Depth** of DNN

### Why Residual?

残差连接显著缓解了**深层训练**中的几个核心困难：梯度消失/爆炸、退化问题（degradation problem），以及更进一步的**增量爆炸**（exploding update）问题。



#### 为什么深层网络会难训？

设一个 $L$ 层网络写成复合形式 $h_L = f_L \circ f_{L-1} \circ \cdots \circ f_1(x).$

其反向传播梯度满足链式法则：$\frac{\partial \mathcal{L}}{\partial h_L}\prod_{j=l}^{L-1}\frac{\partial h_{j+1}}{\partial h_j}.$

当每层 Jacobian 的谱范数略小于 $1$ 时，连乘后梯度会指数衰减；略大于 $1$ 时，则会指数放大。这就是经典的梯度消失/爆炸问题。

ResNet ([Deep Residual Learning for Image Recognition](https://arxiv.org/abs/1512.03385) ) 的关键观察是：即使使用了adaptive初始化和归一化，更深的**plain network **仍然会出现 **degradation problem**：层数加深后，不只是测试误差变差，连训练误差也会上升，这说明问题不只是过拟合，而是优化本身变难了。

而一个合理的直觉是：更深的网络至少应该能模拟更浅的网络，只要新增层学会“什么都不做”即可。

![](https://i.ibb.co/WpppjK27/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-14.png)

对 Transformer / LLM 来说，还有一个更细的视角：**增量爆炸**。设参数更新为 $\Delta\theta$，损失的一阶变化近似为
$\Delta \mathcal{L}\approx\langle \nabla_\theta \mathcal{L}(\theta), \Delta\theta \rangle.$

即使单层梯度已经被控制住，随着网络深度增加，所有层的微小更新仍可能叠加成很大的整体函数扰动。于是模型虽然“梯度看起来还行”，但一次参数更新对整体映射造成的改变量可能过大，训练早期就会变得很不稳定。这也是为什么深层 Transformer 往往不仅要解决梯度问题，还要解决**更新尺度**问题。



#### 残差如何缓解这些问题？

残差把层更新改写为 $h_l = h_{l-1} + f_{l-1}(h_{l-1}).$ 展开后有 $h_l = h_1 + \sum_{i=1}^{l-1} f_i(h_i).$

这意味着每层都保留了一条显式的恒等路径。其梯度为 $$\frac{\partial \mathcal{L}}{\partial h_L}\prod_{j=l}^{L-1}\left(I + \frac{\partial f_j}{\partial h_j}\right).$$

这个乘积展开后始终包含一个 $I$ 项，因此无论残差分支的 Jacobian 如何变化，梯度至少存在一条不经过复杂变换的直达路径。于是，残差连接显著减轻了梯度消失/爆炸问题，也让深层优化更可控。

更进一步，如果写成带缩放的形式 $h_l = h_{l-1} + \alpha f_{l-1}(h_{l-1}),$ 那么$I + \alpha \frac{\partial f_{l-1}}{\partial h_{l-1}}.$ 当 $\alpha$ 较小时，网络前向接近恒等映射，反向也保留稳定的 identity path，同时参数更新对整体函数的影响也更平滑。

> Ref: [ReZero is All You Need: Fast Convergence at Large Depth](https://arxiv.org/abs/2003.04887)



#### Another Prospect of View: 为什么“学恒等映射”本身很关键？

残差连接之所以成为现代深度网络，尤其是 Transformer / LLM 的基础结构，首先是因为它把“学习完整映射”改写成了“学习对恒等映射的修正”。

> Btw, 这种思想在今年另一篇影响力较大的文章[Deep Delta Learning](https://arxiv.org/abs/2601.00417)中也有讨论

对于足够深的模型，不同层之间往往会形成某种**分工**。因此，对某些输入或某些Representation子空间，一层理应做强变换；但对另一些输入，它需要近似执行**恒等映射**，即“不动它”。

问题在于，对一个普通**非线性层**而言，直接学出 $\mathcal{H}(x)=x$ 往往需要参数之间相当精细的协调

而学出 $\mathcal{F}(x)\approx 0$通常更容易，因为这更像是在做“抑制输出”而不是“精确复制输入”。

残差正是把目标映射 $\mathcal{H}(x)$改写成$\mathcal{H}(x)=x+\mathcal{F}(x).$ 这样一来，原本困难的“精确学恒等映射”被转化成了更容易的“让残差分支输出接近零”。

> 那么，如果没有残差链接，怎么学习恒等映射？
>
> [ReLU/GeLU/Swish的一个恒等式](https://kexue.fm/archives/11233)
>
> ![](https://i.ibb.co/ksZnB0C1/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-13.png)

一个很直观的 toy example是 $y(x)={relu}(x W_{up}) W_{down}$

如果目标是输出零函数 $y(x)=0$，只需让 $x W_{up} $的每一项较小或者为负数

但如果目标是恒等映射 $y(x)=x$，则需要 $W_{up}$对于$x$近似于$[1,-1]$,  $W_{down}$对于$x$近似于$\begin{bmatrix}
1\\
-1
\end{bmatrix}$,

这说明：**“把输出选择性压到很小”通常比“精确实现恒等映射”更容易优化。**

因此，残差连接的一个深层意义是：它把“保留输入”这件事直接写进了网络结构，而不是逼着每一层都在参数空间里重新学会 identity mapping。



### Why is Residual **NOT **Enough?

尽管残差连接显著提升了深层网络的可训练性，但它并没有彻底解决“深度上的信息如何组织和利用”这个问题。标准残差仍然是一个**单状态递推**：$h_l = h_{l-1} + f_{l-1}(h_{l-1}),$ 展开以后得到 $h_l = h_1 + \sum_{i=1}^{l-1} f_i(h_i).$

这说明：当到第 $l$ 层时，模型拿到的是一个把所有历史层输出都压进来的**单一聚合状态**，而不是可以自由访问的独立历史表示。当前层只能访问 $h_{l-1}$，而 $h_{l-1}$ 已经是所有更早层信息混合后的结果。于是会出现几个结构性限制：

1. **没有 selective access**：不同类型的层（如 Attention 与 MLP）可能需要不同的历史表示，但它们只能读取同一个聚合状态。

2. **信息丢失不可逆**：某些信息一旦在逐层累加中被淹没或抵消，后续层很难再单独取回。

3) **后层“发声”越来越难**：随着累积状态越来越大，晚近层若想影响总表示，往往需要产生越来越大的输出。

这正是标准 residual 的 **single-state bottleneck**。

#### 深层不一定真的“被用好”

> Ref: [The Curse of Depth in Large Language Models](https://arxiv.org/abs/2502.05795)
>
> ![](https://i.ibb.co/C3ztD3gP/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image.png)
>
> ![](https://i.ibb.co/B2PJ6W2M/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-1.png)

近期文献对现代 LLM 的分析发现，很多深层 block 的实际贡献并没有想象中那么大。更具体地说，部分深层对 pruning、扰动或替换表现出异常鲁棒，说明这些层虽然存在，但不一定在做强而必要的变换。

> Ref: [On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)

一个代表性问题是：在 Pre-LN 架构中，残差流的总体幅值会随着深度增长。于是单层输出在总状态中的相对占比越来越小，深层如果想保留影响力，就不得不输出更大幅值。这会导致所谓的 **PreNorm dilution**：模型能稳定训练到很深，但深层新增变换越来越“难被看见”。

从这个角度看，残差解决的是trainability问题，但没有自动解决effective depth问题。也就是说，模型可以“训得很深”，却不代表它“真正有效利用了这些深度”。

####  为什么这在 LLM 里尤其重要？

在现代 Transformer / LLM 中，不同层的功能分工往往比 CNN 更明显：浅层偏局部模式与词法，中层偏组合与结构，深层偏抽象语义、路由与决策。如果所有层都只能继承同一条 residual stream，那么模型虽然有很多层，但这些层之间不一定拥有足够灵活的历史访问能力。

这也是为什么后续工作开始尝试：

* 用缩放、归一化和门控缓解深度上的数值问题；

* 用多流状态减轻单状态压缩；

* 用显式跨层连接或深度注意力，让当前层能选择性访问更早层输出。



## Three Kinds of Residual Updates

![](https://i.ibb.co/Nd4qnvY2/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-2.png)

**不同方法的本质区别在于 layer **$l$** 能访问哪些 earlier sources，以及这些 mixing weights 是 fixed / static / dynamic 的哪一种。**

设网络深度为 $L$，token embedding 为 $v_0 \equiv h_1,$ 第 $i$个层变换输出为$v_i \equiv f_i(h_i), \qquad i \ge 1.$

那么第 $l$ 层的输入都可以统一写成$h_l = \sum_{i=0}^{l-1} M_{i\to l}(x)\, v_i,$ 其中：

$M_{i\to l}(x)$ 表示第 $l$ 层对第 $i$ 个 source 的权重；

* 若权重与输入无关，则写作 $M_{i\to l}$；

* 所有方法都可以理解成在构造一个**下三角 depth-mixing matrix **$M \in \mathbb{R}^{L\times L}.$

于是三类方法其实就是三种不同的约束：

1. **Single-state recurrence**：第 $l$ 层只能看到 $h_{l-1}$；

2. **Multi-state recurrence**：第 $l$ 层看到的是一个扩展后的状态 $H_{l-1}$；

3) **Cross-layer access**：第 $l$ 层可以直接访问 individual earlier outputs $v_0,\dots,v_{l-1}$。

AttnRes 的统一观点正是：前两类本质上仍属于 **depth-wise recurrence/linear attention**，而 AttnRes 把它推广成了 **depth-wise softmax attention**。

### 1. Single-state recurrence 可统一成“加权一阶递推”

这一类最一般可以写成 $h_l = a_l \odot h_{l-1} + b_l \odot v_{l-1},$
其中 $a_l,b_l \in \mathbb{R}^d$ 可以是常数、可学习参数，或输入相关 gate。

把它递推展开：

$$\begin{aligned} h_l &= a_l \odot h_{l-1} + b_l \odot v_{l-1} \\ &= a_l \odot \left(a_{l-1}\odot h_{l-2} + b_{l-1}\odot v_{l-2}\right) + b_l\odot v_{l-1} \\ &= \sum_{i=1}^{l-1} \left( b_{i+1}\odot \prod_{t=i+2}^{l} a_t \right)\odot v_i. \end{aligned}$$

所以，虽然表面上它“每次只看上一层”，但展开后仍然等价于对所有 earlier outputs 的加权求和；只是这些权重不是自由学习的 dense matrix，而是由递推结构**隐式生成**出来的。

#### 1.1 Standard Residual

标准 residual:$h_l = h_{l-1} + v_{l-1}.$ 对应 $a_l = \mathbf{1}, \quad b_l = \mathbf{1}.$

于是展开后得到 $h_l = h_1 + \sum_{i=1}^{l-1} v_i,$也即 $M_{i\to l} = 1,\quad \forall i$

这说明标准 residual 的本质是：**它在深度维上做的是固定单位权重的均匀累加**。

#### 1.2 Highway：single-state 里的动态加权代表

Highway 的写法是$h_l = (1-g_l)\odot h_{l-1} + g_l\odot v_{l-1},$其中$g_l \in [0,1]^d$通常由输入动态生成。这正是上式的特例：$a_l = 1-g_l,\quad b_l = g_l.$因此展开后可得:

$$\left(\prod_{t=2}^{l}(1-g_t)\right)\odot h_1+\sum_{i=1}^{l-1}\left(g_{i+1}\odot \prod_{t=i+2}^{l}(1-g_t)
\right)\odot v_i.
$$

这个式子很重要，因为它说明 Highway 虽然是 **dynamic, **但它仍然只是对 single-state recurrence 的加权修正, 它并没有让第 $l$ 层“直接点名访问”某个更早层 $v_i$，而是通过一连串门控乘积，**间接决定** earlier outputs 最终留下多少。所以它改善的是“递推如何混合”，没有直接决定“source set 是什么”。

#### 1.3 ReZero / LayerScale / DeepNorm 也属于这一类

它们都只是把 $h_l = h_{l-1} + v_{l-1}$改成了某种缩放版，例如：

* ReZero: $h_l = h_{l-1} + \alpha_l v_{l-1}$

* LayerScale: $h_l = h_{l-1} + \mathrm{diag}(\lambda_l)\, v_{l-1}$

* DeepNorm: $h_l = \mathrm{Norm}(\alpha h_{l-1} + v_{l-1})$

### 2. Multi-state recurrence 把单个 residual state 扩成矩阵状态

这一类的关键思想是：既然单个 $h_{l-1}$ 太“挤”，那就维护一个更大的状态$H_l \in \mathbb{R}^{d\times m},$也就是 $m$ 条 stream。

#### 2.1 用 HC / mHC 做代表

> [mHC: Manifold-Constrained Hyper-Connections](https://arxiv.org/abs/2512.24880)
>
> ![](https://i.ibb.co/tMjV9rZG/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-3.png)
>
> [你的deepseek mHC可能不需要"m"](https://zhuanlan.zhihu.com/p/2010852389670908320)
>
> ![](https://i.ibb.co/qMS5MJym/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-4.png)

Table 5 中 HC / mHC 的写法是$H_l = H_{l-1}A_l + f_{l-1}(H_{l-1}\alpha_{l-1})\,\beta_{l-1}^{\top}.$

为了更清楚，记$u_{l-1} \equiv f_{l-1}(H_{l-1}\alpha_{l-1}) \in \mathbb{R}^{d},$则 $H_l = H_{l-1}A_l + u_{l-1}\beta_{l-1}^{\top}.$

这里：

$A_l \in \mathbb{R}^{m\times m}$ 负责 stream 之间的传播/混合；

$\alpha_{l-1}\in\mathbb{R}^m$ 相当于“从 $m$ 个 stream 中读出当前层输入”的 query；

$\beta_{l-1}\in\mathbb{R}^m$ 相当于“把新信息写回 $m$ 个 stream”的 key/write vector。

#### 2.2 简单展开：它其实是 depth-wise **linear attention**

把上式递推展开：

$$\begin{aligned} H_{l-1} &= H_{l-2}A_{l-1} + u_{l-2}\beta_{l-2}^{\top} \\ &= u_{l-2}\beta_{l-2}^{\top}.\end{aligned}$$

继续展开可得
$$H_{l-1} =
H_0 A_{1:l-1} +
\sum_{i=1}^{l-2}
u_i,\beta_i^{\top} A_{i+1:l-1},
\text{ where }
A_{i+1:l-1} \equiv A_{i+1}A_{i+2}\cdots A_{l-1}.$$

而第 $l$ 层真正读取到的是 $h_l = H_{l-1}\alpha_l.$ 代入上式：
$$h_l =
H_0A_{1:l-1}\alpha_l +
\sum_{i=1}^{l-2}
\left(\beta_i^{\top}A_{i+1:l-1}\alpha_l\right)u_i.$$

于是我们得到了一个和 $h_l = \sum_{i<l} M_{i\to l} v_i$ 完全同构的表达式，其中标量权重变成了$M_{i\to l}(x)\sim\beta_i^{\top}A_{i+1:l-1}\alpha_l.$

所以 HC / mHC 的本质可以理解为：

* 它仍然是在做深度上的 weighted aggregation；

* 只是把单状态 $h$ 扩展成了矩阵状态 $H$；

* mixing matrix $M$ 不再是 rank-1 式的一阶递推，而是通过 $m$ streams 提升了表达力；

从 AttnRes 的语言看，它是 **depth-wise linear attention with matrix-valued state**。

> [Attention Residuals 回忆录](https://kexue.fm/archives/11664)
>
> HC其实相当于“旋转90度”的DeltaNet

#### 2.3 这一类的核心局限

虽然 source capacity 变大了，但第 $l$ 层读到的仍不是原始的 individual earlier outputs，而是一个**被压缩后的状态** $H_{l-1}$。所以它缓解的是信息压缩，却还没有做到真正的 **direct cross-layer access**。

### 3. Cross-layer access 直接对 earlier-layer outputs 做聚合

这一类不再坚持“只看递推状态”，而是直接让第 $l$ 层访问 $\{v_0,v_1,\dots,v_{l-1}\}.$

 其统一形式最自然就是 $h_l = \sum_{i=0}^{l-1}\alpha_{i\to l}(x)\,v_i.$

和前两类的区别在于：这里的 $\alpha_{i\to l}$ 是**直接定义在 source index 上**的，而不是由递推链条隐式产生。

#### 3.1 DenseFormer：static cross-layer access 的代表

DenseFormer 的形式就是$h_l = \alpha_{0\to l} h_1 + \sum_{i=1}^{l-1} \alpha_{i\to l} v_i,$其中$\alpha_{i\to l}$是 learned scalar，但**训练后固定**。

这一步其实已经很关键了，因为它第一次从数学上摆脱了“只看 $h_{l-1}$”的瓶颈，让 layer $l$ 可以直接访问任意 earlier source。 但它仍然是 **static**：不同 token、不同上下文下，权重不变。也因此它只能学习“平均意义上哪几层重要”，却不能做 content-dependent retrieval。AttnRes 论文的消融里，DenseFormer 基本没有优于 baseline，也正好说明仅有 cross-layer access 而没有 dynamic selection 还不够。

#### 3.2 MRLA：dynamic cross-layer，但更像 linear attention

> [Cross-Layer Retrospective Retrieving via Layer Attention](https://arxiv.org/abs/2302.03985)
>
> ![](https://i.ibb.co/j9060V3k/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-5.png)

MRLA 进一步让权重变成输入相关；不过它采用的是一种可分离的 gating / linear-attention 风格，而不是标准 softmax retrieval。AttnRes 论文把它归为 cross-layer access，但同时指出它的 separable query-key product 更接近 linear attention，而不是 softmax attention。

所以，cross-layer access 这条线里，也可以再分两步：

1. **Static cross-layer**：DenseFormer

2. **Dynamic but linear-like**：MRLA

3) **Dynamic + softmax-normalized**：AttnRes

## Why AttnRes ?

到这里，逻辑就很清楚了：

* **single-state recurrence**：source 太少，只能看 $h_{l-1}$；

* **multi-state recurrence**：source 变宽，但仍然是压缩状态；

* **cross-layer access**：终于能直接访问 $v_0,\dots,v_{l-1}$；

* **AttnRes**：在 cross-layer access 上再加入 softmax 的 input-dependent selection。

![](https://i.ibb.co/LdNFndGv/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-6.png)

AttnRes 的核心公式就是 $h_l = \sum_{i=0}^{l-1}\alpha_{i\to l}\, v_i$ , 其中$\alpha_{i\to l} =\frac{\phi(q_l,k_i)}{\sum_{j=0}^{l-1}\phi(q_l,k_j)}$（即softmax）,并取 $\phi(q,k)=\exp \big(q^\top \mathrm{RMSNorm}(k)\big).$

论文里的具体定义为$q_l = w_l,\quad k_i = v_i= \begin{cases}h_1, & i=0,\\f_i(h_i), & i\ge 1.\end{cases}$ 其中$w_l$是数据无关的静态向量

> $w_l$取数据无关的静态向量的好处是可以提前算$\phi(w_l,v_i)$

因此 $$\alpha_{i\to l} =\frac{\exp\big(w_l^\top \mathrm{RMSNorm}(v_i)\big)}{\sum_{j=0}^{l-1}\exp\big(w_l^\top \mathrm{RMSNorm}(v_j)\big)}$$, 最终得到 $h_l=\sum_{i=0}^{l-1}\alpha_{i\to l}v_i.$

这就是 **Full AttnRes**。它和上面三类的关系可以概括成：

* 相比 standard residual：把固定的 $M_{i\to l}=1$ 变成了动态 softmax 权重；

* 相比 Highway / DeepNorm：不再只在“上一层 vs 当前残差”之间调比例；

* 相比 HC / mHC：不再先把历史压进矩阵状态再读取；

* 相比 DenseFormer：不再是 static per-layer scalar；

* 相比 MRLA：从 linear-like gating 走向了标准 softmax retrieval。

AttnRes 论文也把这个转变类比为：
**sequence 上从 RNN / linear attention 到 Transformer softmax attention；**

**depth 上从 residual recurrence / linear mixing 到 depth-wise softmax attention。**

![](https://i.ibb.co/wF5p83FV/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-7.png)

> [Attention Residuals 回忆录](https://kexue.fm/archives/11664)
>
> 从Full AttnRes到Block AttnRes，相当于以往的将平方Attention线性化的过程，各种已有的Efficient Attention的思路都可以套上去试试，比如我们第一个尝试的就是SWA（Sliding Window Attention），然而发现实际效果很糟糕，甚至还不如Residuals。
>
> 经过反思，笔者认为可以这样理解：Residuals本身已经是一个非常强的Baseline，它对应于所有状态向量的等权求和，任何新设计想要超越它，那么至少在形式上要能够覆盖它，Full AttnRes显然能满足这个条件，但是加上SWA后并不满足，它扔掉了一部分状态，无法覆盖“所有状态向量等权求和”这一特例。
>
> 由此我们意识到，对于AttnRes来说，“压缩”可能要比“稀疏”要更有效，而且压缩也不用太精细，简单的加权求和可能足矣。经过一番构思和打磨后，[@张宇](https://x.com/yzhang_cs)和[@广宇](https://x.com/nathancgy4) 提出了论文中的Block AttnRes设计，它结合了分Block处理和求和压缩的思想，取得了接近Full版的效果。



### Block AttnRes：把 Full AttnRes 压缩成可扩展版本

![](https://i.ibb.co/MyJJWRrf/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-8.png)

Full AttnRes 的问题：要保存所有 earlier outputs，训练和 pipeline 通信都会变重。

于是论文引入了 **Block AttnRes**。

把 $L$ 层分成 $N$ 个 block，记第 $n$ 个 block 的层集合为 $B_n$。定义 block summary：$b_n = \sum_{j\in B_n} v_j.$

更细一点，块内前 $i$ 个层的 partial sum 记作 $b_n^i = \sum_{j\in B_n,\; j\le i} v_j.$

于是对于 block $n$ 内的第 $i$ 个层：

* 若它是块内第一层，则 source set 为$[b_0,b_1,\dots,b_{n-1}],$其中$b_0 \equiv h_1;$

* 若它不是第一层，则 source set 为$[b_0,b_1,\dots,b_{n-1}, b_n^{i-1}].$

于是第 $l$ 层仍然是一个 attention aggregation：$h_l = \sum_{s\in \mathcal{S}_{l}^{\text{block}}}\alpha_{s\to l}\, s,$
只是 source 不再是所有 individual $v_i$，而是**历史块表示 + 当前块 partial sum**。

它的好处是：

* memory 从$O(Ld)\to O(Nd),$

* depth-wise attention 的计算从$O(L^2)\to O(N^2).$

而且有两个端点很漂亮：

* 当$N=L$时，Block AttnRes 退化回 **Full AttnRes**；

* 当$N=1$时，它退化回“块内纯累加”的标准 residual 极限。



### Infrastructure and Efficiency of AttnRes

从系统实现角度看，AttnRes 的价值并不只在于将 residual update 从固定加法推广为 depth-wise attention，更在于它从一开始就是一个在**算法表达能力、训练可扩展性、推理延迟与硬件约束**之间联合设计的架构。

#### Full AttnRes ：算术代价可控，但大规模训练受制于状态保活与跨阶段通信

对单个 token，Full AttnRes 将第 $l$ 层输入写为

$$h_l = \sum_{i=0}^{l-1} \alpha_{i\to l} v_i,
\qquad
\alpha_{i\to l} =
\frac{\exp\!\big(q_l^\top \mathrm{RMSNorm}(k_i)\big)}
{\sum_{j=0}^{l-1}\exp\!\big(q_l^\top \mathrm{RMSNorm}(k_j)\big)}.$$

因此，它需要保存全部 earlier-layer outputs $\{v_i\}_{i<l}$，其单 token 复杂度为$$\text{arithmetic} = O(L^2 d), \quad
\text{memory} = O(L d).$$

由于网络深度 $L$ 通常远小于序列长度 $T$，因此 Full AttnRes 的额外算术量在理论上并不构成主要瓶颈；真正的系统问题在于**状态存储与数据搬运**。在 vanilla training 中，这些 layer outputs 原本就需要为反向传播保留，因此 Full AttnRes 几乎不引入额外显存负担；但在大规模训练中，activation recomputation 与 pipeline parallelism 是常态，此时这些原本可以释放并重算的中间表示必须持续保活，并在 pipeline stage 之间传输，从而使 memory overhead 和 communication overhead 都上升到$O(L d).$

因此，Full AttnRes 的主要工程约束是访存和通信。这一点决定了 AttnRes 的系统优化重点必须放在**通信路径压缩**而非单纯的局部计算削减上。

#### Block AttnRes：把层级别的存储与通信压缩到块级别

为适应现实的大规模训练范式，AttnRes 进一步提出 Block AttnRes。其基本思想是：将 $L$ 层划分为 $N$ 个 blocks，在块内仍采用标准累加形成局部 summary，而在块间只对 $N$ 个 block-level representations 做 attention。若记第 $n$ 个 block 的表示为$b_n = \sum_{j \in B_n} f_j(h_j),$则跨块聚合只需在$\{h_1, b_1, \dots, b_{n-1}, b_n^{\,i}\}$上进行，而不再访问所有 individual layer outputs。

这样一来，训练时最敏感的两项系统成本同时从$O(L d)\;\to\;O(N d).$

这一压缩的意义并不只是更省显存，而是直接减少了 pipeline parallelism 下需要跨 stage 传输的表示数目。换言之，Block AttnRes在当前训练基础设施约束下，对**表达能力—训练效率—推理开销**三者做出的结构化折中。

![](https://i.ibb.co/pvfJRWDz/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-9.png)

#### 什么 AttnRes 能做 two-phase computation

AttnRes 的一个关键设计是：第 $l$ 层的 pseudo-query 取为一个可学习参数 $w_l$，而不是由当前 hidden state 动态投影得到，即$q_l = w_l.$

这一步在算法上很轻量，但在系统上极其关键。因为 query 与当前层 sequential forward 解耦后，同一个 block 内所有层的 query 都可以预先取出，并统一对历史 block representations 做 batched 计算。由此，Block AttnRes 可以自然拆成 two-phase computation：

1. **Phase 1: batched inter-block attention**

对一个 block 内所有层，统一与之前所有 block representations 计算 cross-block attention，得到每层对应的 inter-block partial result 以及 softmax 统计量。

2. **Phase 2: sequential intra-block attention + online softmax merge**

在 block 内仍按层顺序推进，用不断更新的 partial sum 构造 intra-block 部分，再通过 online softmax 与 Phase 1 的结果进行精确合并。

![](https://i.ibb.co/gFMqzcjg/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-10.png)

这一设计的系统收益主要体现在三个方面：

* 将历史 block 表示的读取从“每层读取一次”变为“每个 block 读取一次”，从而显著平摊 I/O；

* 由于 Phase 2 的 merge 主要是 elementwise 运算，更容易与 all-reduce、RMSNorm 等已有 kernel 融合；

* Phase 1 可与 block 内部分计算 overlap，因此新增工作不必完整落在 decode critical path 上。

更重要的是，two-phase computation 通过 online softmax 实现了与原始 attention 完全等价的精确重组。因此，它是 AttnRes 能在真实系统中落地的基础设施组成部分。



#### 从推理视角看：Block AttnRes 的目标不是只降平均成本，而是避免新增 latency-bound critical path

> [谈谈 Attention Residual 架构一些背后的想法](https://zhuanlan.zhihu.com/p/2017528295286133070)
>
> ![](https://i.ibb.co/M5tBb7cb/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-11.png)
>
> ![](https://i.ibb.co/zHZQRbYK/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-12.png)

在现代大模型推理中，“成本优化”和“延迟优化”并不完全等价。某些结构虽然平均吞吐下成本不高，但会在 decode 小 batch、高 OTPS 场景中引入新的 latency-bound 算子，从而显著拉长端到端时延。因此，AttnRes 的推理优化目标并不是只看 FLOPs 或平均吞吐，而是尽可能做到：**在不引入新的Critical Path瓶颈的前提下增强 residual 的表达能力**。

在这一点上，Block AttnRes 的 two-phase 组织方式尤其重要。若采用 naive 实现，每一层都需重新读取所有历史 block representations 并执行 attention residual，这不仅增加 prefill 中的访存压力，也难以与 decode 路径中的 all-reduce、RMSNorm 等算子融合。two-phase computation 则通过批处理 inter-block attention、压缩重复读取、提升 overlap 程度，尽量把新增开销从 critical path 中“移开”，从而将端到端 latency 增量压到很低。



##### 缓存与显存：Block cache 可以通过 TP sharding 与 chunked prefill 有效摊薄

Block AttnRes 在推理时需要缓存 block-level representations。若直接存储完整的$N \times T \times d$ cache，则在长上下文下显存占用会很大。对此，工程实现的核心思路是沿 sequence 维度做 shard，将 block cache 分摊到 tensor parallel 的各设备上。若有 $P$ 张 TP 卡，则单卡缓存规模降为$N \times \frac{T}{P} \times d.$

此外，若再结合 chunked prefill，则这部分缓存可以进一步压缩到较低量级。与此同时，Phase 2 的 online softmax merge 由于本质上是 elementwise 运算，也更容易嵌入现有 TP 的 reduce-scatter / all-gather 路径，而不必单独引入一套昂贵的新通信机制。



##### Block AttnRes 是“几乎无感”的 residual 升级

论文给出的总体结论是：借助 cross-stage caching 与 two-phase inference strategy，Block AttnRes 的训练开销是 marginal，而典型推理 workload 下的额外延迟低于 2%。这个数字还是较为保守的统一口径；在很多常见场景下，其新增延迟甚至可以近似看作“接近免费。

![](https://i.ibb.co/Z6M9Xn41/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-15.png)



### Experiment & Results

![](https://i.ibb.co/Dgwqhy8v/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-16.png)

![](https://i.ibb.co/0pJ1bcKc/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-17.png)

![](https://i.ibb.co/99rvPkwy/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-18.png)

![](https://i.ibb.co/4ZJKRXPv/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-19.png)

![](https://i.ibb.co/KkHgFFS/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-20.png)

![](https://i.ibb.co/Tq0L2X3q/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-21.png)



> 复现结果：
>
> [使用Attention Residuals把GPT2叠到72层](https://zhuanlan.zhihu.com/p/2018790297828631214)
>
> ![](https://i.ibb.co/vxF5Zzxf/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-22.png)
>
> ![](https://i.ibb.co/FqbNcxCq/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-23.png)
>
> ![](https://i.ibb.co/7tng4Vmx/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-24.png)



### Other relevant works

> [Mixture-of-Depths Attention](https://arxiv.org/abs/2603.15619)
>
> ![](https://i.ibb.co/BVf37Nps/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-25.png)
>
> ![](https://i.ibb.co/zV50HJCG/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-26.png)
>
> ![](https://i.ibb.co/pj6hhq9L/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-27.png)
>
>
>
> [DeepCrossAttention: Supercharging Transformer Residual Connections](https://arxiv.org/abs/2502.06785)
>
> ![](https://i.ibb.co/8D3m55gz/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-28.png)
>
> ![](https://i.ibb.co/B5xmgL69/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-29.png)
>
> ![](https://i.ibb.co/53YLXrm/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-30.png)
>
> ![](https://i.ibb.co/mVDWh7Lb/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-31.png)



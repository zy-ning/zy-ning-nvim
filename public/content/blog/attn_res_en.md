# Attention Residuals: Another Step Towards a Highly Interconnected 3D Brain

> To facilitate **large-scale parallel training on GPUs** and **model scaling**, neural architectures have generally adopted extremely simple, linear network topologies.
>
> However, the power of human brain neural circuits largely stems from dense cross-region projections, complex branching, and adaptive synaptic connections—rather than layer-by-layer transmission like an assembly line.
>
> While current neural network forward propagation remains a directed acyclic graph (DAG), AttnRes and mHC have broken the shackles of traditional models' "one-dimensional linear depth." They transform depth-wise information transmission from a single-lane road into a **highly interconnected, dynamically allocated complex routing network.**

## Preliminary

Background: Scaling the **Depth** of DNNs

### Why Residual?

Residual connections significantly alleviate several core difficulties in **deep training**: gradient vanishing/explosion, the degradation problem, and the further **exploding updates** issue.

#### Why Are Deep Networks Hard to Train?

Consider an $L$-layer network written in compositional form: $h_L = f_L \circ f_{L-1} \circ \cdots \circ f_1(x).$

Its backpropagation gradient satisfies the chain rule: $\frac{\partial \mathcal{L}}{\partial h_L}\prod_{j=l}^{L-1}\frac{\partial h_{j+1}}{\partial h_j}.$

When the spectral norm of each layer's Jacobian is slightly less than $1$, the product decays exponentially; when slightly greater than $1$, it explodes exponentially. This is the classic gradient vanishing/exploding problem.

ResNet ([Deep Residual Learning for Image Recognition](https://arxiv.org/abs/1512.03385)) made the key observation that even with adaptive initialization and normalization, deeper **plain networks** still exhibit the **degradation problem**: as depth increases, not only does test error worsen, but training error also rises—indicating the problem isn't just overfitting, but that optimization itself becomes harder.

A reasonable intuition is that deeper networks should at least be able to simulate shallower networks, as long as the added layers learn to "do nothing."

![](https://i.ibb.co/WpppjK27/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-14.png)

For Transformers/LLMs, there's an even finer perspective: **exploding updates**. Let the parameter update be $\Delta\theta$, and the first-order change in loss is approximately:
$\Delta \mathcal{L}\approx\langle \nabla_\theta \mathcal{L}(\theta), \Delta\theta \rangle.$

Even if single-layer gradients are controlled, as network depth increases, small updates across all layers can accumulate into large overall function perturbations. Thus, while the model may appear to have "reasonable gradients," a single parameter update may cause excessive changes to the overall mapping, making early training highly unstable. This is why deep Transformers must address not only gradient problems but also **update scale** issues.

#### How Do Residuals Alleviate These Problems?

Residuals rewrite layer updates as $h_l = h_{l-1} + f_{l-1}(h_{l-1}).$ Expanding this gives $h_l = h_1 + \sum_{i=1}^{l-1} f_i(h_i).$

This means each layer retains an explicit identity path. The gradient is:
$$\frac{\partial \mathcal{L}}{\partial h_L}\prod_{j=l}^{L-1}\left(I + \frac{\partial f_j}{\partial h_j}\right).$$

This product always contains an $I$ term when expanded, so regardless of how the residual branch's Jacobian varies, the gradient has at least one direct path that doesn't undergo complex transformations. Thus, residual connections significantly mitigate gradient vanishing/explosion and make deep optimization more controllable.

Furthermore, writing it with a scaling factor: $h_l = h_{l-1} + \alpha f_{l-1}(h_{l-1}),$ gives $I + \alpha \frac{\partial f_{l-1}}{\partial h_{l-1}}.$ When $\alpha$ is small, the forward pass approaches an identity mapping, the backward pass retains a stable identity path, and parameter updates have smoother effects on the overall function.

> Ref: [ReZero is All You Need: Fast Convergence at Large Depth](https://arxiv.org/abs/2003.04887)

#### Another Perspective: Why Is "Learning Identity Mapping" Itself Crucial?

Residual connections have become foundational to modern deep networks, especially Transformers/LLMs, because they reformulate "learning the complete mapping" into "learning corrections to the identity mapping."

> By the way, this idea is also discussed in this year's influential paper [Deep Delta Learning](https://arxiv.org/abs/2601.00417)

For sufficiently deep models, different layers often form certain **divisions of labor**. Thus, for certain inputs or representation subspaces, a layer should perform strong transformations; but for other inputs, it should approximately execute **identity mapping**, i.e., "leave it alone."

The problem is that for a standard **nonlinear layer**, directly learning $\mathcal{H}(x)=x$ often requires quite fine coordination between parameters.

While learning $\mathcal{F}(x)\approx 0$ is usually easier because it's more like "suppressing output" rather than "precisely copying input."

Residuals reformulate the target mapping $\mathcal{H}(x)$ as $\mathcal{H}(x)=x+\mathcal{F}(x).$ This transforms the originally difficult "precisely learning identity mapping" into the easier "making the residual branch output close to zero."

> So, without residual connections, how do we learn identity mapping?
>
> [An Identity for ReLU/GeLU/Swish](https://kexue.fm/archives/11233)
>
> ![](https://i.ibb.co/ksZnB0C1/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-13.png)

A very intuitive toy example is $y(x)={relu}(x W_{up}) W_{down}$

If the goal is to output the zero function $y(x)=0$, we just need each element of $x W_{up}$ to be small or negative.

But if the goal is identity mapping $y(x)=x$, then $W_{up}$ needs to approximate $[1,-1]$ for $x$, and $W_{down}$ needs to approximate $\begin{bmatrix} 1\\ -1 \end{bmatrix}$ for $x$.

This shows: **"Selectively suppressing output to near zero" is usually easier to optimize than "precisely implementing identity mapping."**

Therefore, a deeper meaning of residual connections is that they bake "preserving input" directly into the network structure, rather than forcing each layer to relearn identity mapping in parameter space.

### Why Is Residual **NOT** Enough?

Although residual connections significantly improve deep network trainability, they don't fully solve the problem of "how information is organized and utilized across depth." Standard residuals are still **single-state recurrences**: $h_l = h_{l-1} + f_{l-1}(h_{l-1}),$ which expands to $h_l = h_1 + \sum_{i=1}^{l-1} f_i(h_i).$

This means: at layer $l$, the model receives a **single aggregated state** that compresses all historical layer outputs, rather than independently accessible historical representations. The current layer can only access $h_{l-1}$, which is already the result of mixing all earlier layer information. This creates several structural limitations:

1. **No selective access**: Different layer types (e.g., Attention vs. MLP) may need different historical representations, but they can only read the same aggregated state.

2. **Irreversible information loss**: Once certain information is submerged or canceled in layer-by-layer accumulation, later layers struggle to retrieve it individually.

3. **Later layers struggle to "speak up"**: As the accumulated state grows larger, if later layers want to influence the total representation, they often need to produce increasingly large outputs.

This is the **single-state bottleneck** of standard residuals.

#### Deep Layers Aren't Necessarily "Well Utilized"

> Ref: [The Curse of Depth in Large Language Models](https://arxiv.org/abs/2502.05795)
>
> ![](https://i.ibb.co/C3ztD3gP/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image.png)
>
> ![](https://i.ibb.co/B2PJ6W2M/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-1.png)

Recent literature analyzing modern LLMs has found that many deep blocks contribute less than imagined. More specifically, some deep layers show abnormal robustness to pruning, perturbation, or replacement—indicating that while these layers exist, they may not be performing strong, necessary transformations.

> Ref: [On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)

A representative issue is that in Pre-LN architectures, the residual stream's overall magnitude grows with depth. Thus, single-layer outputs occupy increasingly smaller relative proportions of the total state, and if deep layers want to retain influence, they must output larger magnitudes. This leads to **PreNorm dilution**: models can train stably to great depths, but deep layers become increasingly "hard to see."

From this perspective, residuals solve trainability but don't automatically solve effective depth. That is, models can "train deeply" without truly "effectively utilizing that depth."

#### Why Is This Especially Important in LLMs?

In modern Transformers/LLMs, functional division across layers is often more pronounced than in CNNs: shallow layers focus on local patterns and lexicon, middle layers on composition and structure, deep layers on abstract semantics, routing, and decision-making. If all layers can only inherit the same residual stream, then while the model has many layers, they don't necessarily have sufficiently flexible access to history.

This is why subsequent work began attempting:

- Using scaling, normalization, and gating to alleviate numerical issues across depth;
- Using multi-stream states to reduce single-state compression;
- Using explicit cross-layer connections or deep attention to let current layers selectively access earlier outputs.

## Three Kinds of Residual Updates

![](https://i.ibb.co/Nd4qnvY2/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-2.png)

**The essential difference between methods lies in which earlier sources layer $l$ can access, and whether these mixing weights are fixed/static or dynamic.**

Let network depth be $L$, token embedding be $v_0 \equiv h_1,$ and the $i$-th layer transformation output be $v_i \equiv f_i(h_i), \qquad i \ge 1.$

Then layer $l$'s input can be uniformly written as $h_l = \sum_{i=0}^{l-1} M_{i\to l}(x)\, v_i,$ where:

$M_{i\to l}(x)$ represents layer $l$'s weight for source $i$;

- If weights are input-independent, written as $M_{i\to l}$;
- All methods can be understood as constructing a **lower-triangular depth-mixing matrix** $M \in \mathbb{R}^{L\times L}.$

Thus, the three method types are essentially three different constraints:

1. **Single-state recurrence**: Layer $l$ can only see $h_{l-1}$;

2. **Multi-state recurrence**: Layer $l$ sees an expanded state $H_{l-1}$;

3. **Cross-layer access**: Layer $l$ can directly access individual earlier outputs $v_0,\dots,v_{l-1}$.

The unified view of AttnRes is that the first two are essentially still **depth-wise recurrence/linear attention**, while AttnRes generalizes it to **depth-wise softmax attention**.

### 1. Single-State Recurrence Can Be Unified as "Weighted First-Order Recurrence"

This class can generally be written as $h_l = a_l \odot h_{l-1} + b_l \odot v_{l-1},$
where $a_l,b_l \in \mathbb{R}^d$ can be constants, learnable parameters, or input-dependent gates.

Expanding this recurrence:

$$\begin{aligned} h_l &= a_l \odot h_{l-1} + b_l \odot v_{l-1} \\ &= a_l \odot \left(a_{l-1}\odot h_{l-2} + b_{l-1}\odot v_{l-2}\right) + b_l\odot v_{l-1} \\ &= \sum_{i=1}^{l-1} \left( b_{i+1}\odot \prod_{t=i+2}^{l} a_t \right)\odot v_i. \end{aligned}$$

Thus, while it appears to "only look at the previous layer" on the surface, when expanded it's still equivalent to a weighted sum of all earlier outputs; it's just that these weights aren't freely learned dense matrices but are **implicitly generated** by the recurrence structure.

#### 1.1 Standard Residual

Standard residual: $h_l = h_{l-1} + v_{l-1}.$ Corresponds to $a_l = \mathbf{1}, \quad b_l = \mathbf{1}.$

Thus expanding gives $h_l = h_1 + \sum_{i=1}^{l-1} v_i,$ i.e., $M_{i\to l} = 1,\quad \forall i$

This shows the essence of standard residual: **it performs fixed unit-weight uniform accumulation across depth**.

#### 1.2 Highway: Dynamic Weighting Representative in Single-State

Highway is written as $h_l = (1-g_l)\odot h_{l-1} + g_l\odot v_{l-1},$ where $g_l \in [0,1]^d$ is typically dynamically generated from input. This is exactly the special case above: $a_l = 1-g_l,\quad b_l = g_l.$ Thus expanding:

$$\left(\prod_{t=2}^{l}(1-g_t)\right)\odot h_1+\sum_{i=1}^{l-1}\left(g_{i+1}\odot \prod_{t=i+2}^{l}(1-g_t) \right)\odot v_i.$$

This formula is important because it shows that while Highway is **dynamic**, it's still just a weighted correction to single-state recurrence—it doesn't let layer $l$ "directly name and access" some earlier layer $v_i$, but indirectly determines how much earlier outputs remain through a chain of gate products. So it improves "how to mix in recurrence" without directly deciding "what is the source set."

#### 1.3 ReZero / LayerScale / DeepNorm Also Belong to This Class

They just change $h_l = h_{l-1} + v_{l-1}$ to some scaled version, for example:

- ReZero: $h_l = h_{l-1} + \alpha_l v_{l-1}$
- LayerScale: $h_l = h_{l-1} + \mathrm{diag}(\lambda_l)\, v_{l-1}$
- DeepNorm: $h_l = \mathrm{Norm}(\alpha h_{l-1} + v_{l-1})$

### 2. Multi-State Recurrence Expands Single Residual State into Matrix State

The key idea of this class is: since a single $h_{l-1}$ is too "crowded," maintain a larger state $H_l \in \mathbb{R}^{d\times m}$—i.e., $m$ streams.

#### 2.1 Using HC/mHC as Representatives

> [mHC: Manifold-Constrained Hyper-Connections](https://arxiv.org/abs/2512.24880)
>
> ![](https://i.ibb.co/tMjV9rZG/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-3.png)
>
> [Your DeepSeek mHC May Not Need "m"](https://zhuanlan.zhihu.com/p/2010852389670908320)
>
> ![](https://i.ibb.co/qMS5MJym/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-4.png)

In Table 5, HC/mHC is written as $H_l = H_{l-1}A_l + f_{l-1}(H_{l-1}\alpha_{l-1})\,\beta_{l-1}^{\top}.$

For clarity, let $u_{l-1} \equiv f_{l-1}(H_{l-1}\alpha_{l-1}) \in \mathbb{R}^{d},$ then $H_l = H_{l-1}A_l + u_{l-1}\beta_{l-1}^{\top}.$

Here:

$A_l \in \mathbb{R}^{m\times m}$ handles stream propagation/mixing;

$\alpha_{l-1}\in\mathbb{R}^m$ is like a "query" that reads from $m$ streams into the current layer;

$\beta_{l-1}\in\mathbb{R}^m$ is like a "key/write vector" that writes new information back to $m$ streams.

#### 2.2 Simple Expansion: It's Actually Depth-Wise **Linear Attention**

Expanding the above:

$$\begin{aligned} H_{l-1} &= H_{l-2}A_{l-1} + u_{l-2}\beta_{l-2}^{\top} \\ &= H_{l-3}A_{l-2}A_{l-1} + u_{l-3}\beta_{l-3}^{\top}A_{l-2}A_{l-1} +  u_{l-2}\beta_{l-2}^{\top}.\end{aligned}$$

Continuing to expand gives:
$$H_{l-1} = H_0 A_{1:l-1} + \sum_{i=1}^{l-2} u_i,\beta_i^{\top} A_{i+1:l-1}, \text{ where } A_{i+1:l-1} \equiv A_{i+1}A_{i+2}\cdots A_{l-1}.$$

And what layer $l$ actually reads is $h_l = H_{l-1}\alpha_l.$ Substituting above:
$$h_l = H_0A_{1:l-1}\alpha_l + \sum_{i=1}^{l-2} \left(\beta_i^{\top}A_{i+1:l-1}\alpha_l\right)u_i.$$

Thus we obtain an expression fully isomorphic to $h_l = \sum_{i<l} M_{i\to l} v_i$, where scalar weights become $M_{i\to l}(x)\sim\beta_i^{\top}A_{i+1:l-1}\alpha_l.$

So the essence of HC/mHC can be understood as:

- It's still doing depth-wise weighted aggregation;
- Just expanding single state $h$ to matrix state $H$;
- Mixing matrix $M$ is no longer rank-1 first-order recurrence but increases expressiveness through $m$ streams;

In AttnRes's language, it's **depth-wise linear attention with matrix-valued state**.

> [Attention Residuals Memoir](https://kexue.fm/archives/11664)
>
> HC is actually equivalent to DeltaNet "rotated 90 degrees"

#### 2.3 Core Limitations of This Class

While source capacity increases, layer $l$ still reads from a **compressed state** $H_{l-1}$ rather than original individual earlier outputs. So it alleviates information compression but hasn't achieved true **direct cross-layer access**.

### 3. Cross-Layer Access Directly Aggregates Earlier-Layer Outputs

This class no longer insists on "only looking at recurrence state" but directly lets layer $l$ access $\{v_0,v_1,\dots,v_{l-1}\}.$

Its unified form most naturally is $h_l = \sum_{i=0}^{l-1}\alpha_{i\to l}(x)\,v_i.$

The difference from the first two classes is that here $\alpha_{i\to l}$ is **directly defined on the source index**, not implicitly produced by recurrence chains.

#### 3.1 DenseFormer: Representative of Static Cross-Layer Access

DenseFormer's form is $h_l = \alpha_{0\to l} h_1 + \sum_{i=1}^{l-1} \alpha_{i\to l} v_i,$ where $\alpha_{i\to l}$ are learned scalars but **fixed after training**.

This step is actually crucial because it mathematically breaks free from the bottleneck of "only looking at $h_{l-1}$" for the first time, letting layer $l$ directly access any earlier source. But it's still **static**: weights don't change across different tokens or contexts. Thus it can only learn "which layers are important on average," not do content-dependent retrieval. In AttnRes paper's ablations, DenseFormer basically doesn't outperform baseline—showing that cross-layer access without dynamic selection isn't enough.

#### 3.2 MRLA: Dynamic Cross-Layer, but More Like Linear Attention

> [Cross-Layer Retrospective Retrieving via Layer Attention](https://arxiv.org/abs/2302.03985)
>
> ![](https://i.ibb.co/wF5p83FV/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-5.png)

MRLA further makes weights input-dependent; but it uses a separable gating/linear-attention style rather than standard softmax retrieval. The AttnRes paper classifies it as cross-layer access but notes its separable query-key product is closer to linear attention than softmax attention.

So in the cross-layer access line, we can subdivide:

1. **Static cross-layer**: DenseFormer
2. **Dynamic but linear-like**: MRLA
3. **Dynamic + softmax-normalized**: AttnRes

## Why AttnRes?

By now, the logic is clear:

- **Single-state recurrence**: Too few sources, can only see $h_{l-1}$;
- **Multi-state recurrence**: Sources widen, but still compressed state;
- **Cross-layer access**: Can finally directly access $v_0,\dots,v_{l-1}$;
- **AttnRes**: Adds softmax's input-dependent selection on top of cross-layer access.

![](https://i.ibb.co/LdNFndGv/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-6.png)

AttnRes's core formula is $h_l = \sum_{i=0}^{l-1}\alpha_{i\to l}\, v_i$, where $\alpha_{i\to l} =\frac{\phi(q_l,k_i)}{\sum_{j=0}^{l-1}\phi(q_l,k_j)}$ (i.e., softmax), and take $\phi(q,k)=\exp \big(q^\top \mathrm{RMSNorm}(k)\big).$

The paper specifically defines $q_l = w_l,\quad k_i = v_i= \begin{cases}h_1, & i=0,\\f_i(h_i), & i\ge 1.\end{cases}$ where $w_l$ is a data-independent static vector.

> The benefit of $w_l$ being data-independent is that $\phi(w_l,v_i)$ can be precomputed.

Thus $\alpha_{i\to l} =\frac{\exp\big(w_l^\top \mathrm{RMSNorm}(v_i)\big)}{\sum_{j=0}^{l-1}\exp\big(w_l^\top \mathrm{RMSNorm}(v_j)\big)}$, finally giving $h_l=\sum_{i=0}^{l-1}\alpha_{i\to l}v_i.$

This is **Full AttnRes**. Its relationship to the three classes above can be summarized:

- Compared to standard residual: changes fixed $M_{i\to l}=1$ to dynamic softmax weights;
- Compared to Highway/DeepNorm: no longer just adjusts proportions between "previous layer vs. current residual";
- Compared to HC/mHC: no longer first compresses history into matrix state then reads;
- Compared to DenseFormer: no longer static per-layer scalar;
- Compared to MRLA: moves from linear-like gating to standard softmax retrieval.

The AttnRes paper also analogizes this transition as:
**On sequence: from RNN/linear attention to Transformer softmax attention;**

**On depth: from residual recurrence/linear mixing to depth-wise softmax attention.**

![](https://i.ibb.co/MyJJWRrf/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-7.png)

> [Attention Residuals Memoir](https://kexue.fm/archives/11664)
>
> From Full AttnRes to Block AttnRes is equivalent to the previous process of linearizing squared attention—various existing Efficient Attention ideas can be tried. For example, our first attempt was SWA (Sliding Window Attention), but we found actual results were very poor, even worse than Residuals.
>
> After reflection, I believe this can be understood: Residuals themselves are already a very strong baseline, corresponding to equal-weight summation of all state vectors. Any new design wanting to surpass it must at least formally be able to cover it. Full AttnRes obviously satisfies this condition, but adding SWA does not—it discards some states and cannot cover the "equal-weight summation of all state vectors" special case.
>
> Thus we realized that for AttnRes, "compression" may be more effective than "sparsity," and compression need not be too fine-grained—simple weighted summation may suffice. After some conception and refinement, [@Zhang Yu](https://x.com/yzhang_cs) and [@Guang Yu](https://x.com/nathancgy4) proposed the Block AttnRes design in the paper, combining block processing and summation compression ideas, achieving results close to the Full version.

### Block AttnRes: Compressing Full AttnRes into a Scalable Version

![](https://i.ibb.co/8D3m55gz/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-8.png)

Full AttnRes's problem: need to save all earlier outputs, making training and pipeline communication heavier.

Thus the paper introduces **Block AttnRes**.

Divide $L$ layers into $N$ blocks, let the layer set of block $n$ be $B_n$. Define block summary: $b_n = \sum_{j\in B_n} v_j.$

More finely, the partial sum of first $i$ layers within block $n$ is $b_n^i = \sum_{j\in B_n,\; j\le i} v_j.$

Thus for the $i$-th layer within block $n$:

- If it's the first layer in block, source set is $[b_0,b_1,\dots,b_{n-1}],$ where $b_0 \equiv h_1$;
- If not first layer, source set is $[b_0,b_1,\dots,b_{n-1}, b_n^{i-1}].$

Thus layer $l$ is still an attention aggregation: $h_l = \sum_{s\in \mathcal{S}_{l}^{\text{block}}}\alpha_{s\to l}\, s,$
just the source is no longer all individual $v_i$, but **historical block representations + current block partial sum**.

Its benefits:

- Memory from $O(Ld)\to O(Nd)$,
- Depth-wise attention computation from $O(L^2)\to O(N^2)$.

And two endpoints are elegant:

- When $N=L$, Block AttnRes degenerates to **Full AttnRes**;
- When $N=1$, it degenerates to "pure accumulation within block" standard residual limit.

### Infrastructure and Efficiency of AttnRes

From a systems implementation perspective, AttnRes's value isn't just in generalizing residual update from fixed addition to depth-wise attention, but in being an architecture jointly designed from the start between **algorithmic expressiveness, training scalability, inference latency, and hardware constraints**.

#### Full AttnRes: Arithmetic Cost Controllable, but Large-Scale Training Constrained by State Retention and Cross-Stage Communication

For a single token, Full AttnRes writes layer $l$ input as:

$$h_l = \sum_{i=0}^{l-1} \alpha_{i\to l} v_i, \qquad \alpha_{i\to l} = \frac{\exp\!\big(q_l^\top \mathrm{RMSNorm}(k_i)\big)} {\sum_{j=0}^{l-1}\exp\!\big(q_l^\top \mathrm{RMSNorm}(k_j)\big)}.$$

Thus, it needs to save all earlier-layer outputs $\{v_i\}_{i<l}$, with per-token complexity:
$$\text{arithmetic} = O(L^2 d), \quad \text{memory} = O(L d).$$

Since network depth $L$ is typically much smaller than sequence length $T$, Full AttnRes's additional arithmetic theoretically doesn't constitute the main bottleneck; the real system issue is **state storage and data movement**. In vanilla training, these layer outputs need to be retained for backprop anyway, so Full AttnRes introduces almost no extra memory burden; but in large-scale training, activation recomputation and pipeline parallelism are the norm, where these intermediate representations that could be released and recomputed must stay alive and transfer between pipeline stages, raising both memory and communication overhead to $O(L d).$

Therefore, Full AttnRes's main engineering constraints are memory access and communication. This determines AttnRes's system optimization focus must be on **communication path compression** rather than just local computation reduction.

#### Block AttnRes: Compressing Layer-Level Storage and Communication to Block Level

To adapt to realistic large-scale training paradigms, AttnRes further proposes Block AttnRes. The basic idea: divide $L$ layers into $N$ blocks, still use standard accumulation within blocks to form local summaries, but only do attention on $N$ block-level representations across blocks. If we denote block $n$'s representation as $b_n = \sum_{j \in B_n} f_j(h_j),$ then cross-block aggregation only needs to happen on $\{h_1, b_1, \dots, b_{n-1}, b_n^{\,i}\}$, no longer accessing all individual layer outputs.

Thus, the two most sensitive system costs in training simultaneously drop from $O(L d)\;\to\;O(N d).$

This compression's significance isn't just saving memory, but directly reducing the number of representations that need to cross stage in pipeline parallelism. In other words, Block AttnRes makes a structured tradeoff among **expressiveness—training efficiency—inference overhead** under current training infrastructure constraints.

![](https://i.ibb.co/pvfJRWDz/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-9.png)

#### Why AttnRes Can Do Two-Phase Computation

A key AttnRes design is: layer $l$'s pseudo-query takes a learnable parameter $w_l$, not dynamically projected from current hidden state, i.e., $q_l = w_l.$

This step is algorithmically lightweight but systemically crucial. Because query decouples from current layer sequential forward, all layers' queries in the same block can be pre-fetched and uniformly computed on historical block representations in batch. Thus, Block AttnRes naturally splits into two-phase computation:

1. **Phase 1: Batched Inter-Block Attention**

For all layers in a block, uniformly compute cross-block attention with all previous block representations, obtaining inter-block partial results and softmax statistics for each layer.

2. **Phase 2: Sequential Intra-Block Attention + Online Softmax Merge**

Still proceed layer-by-layer within block, use continuously updated partial sums to construct intra-block portions, then precisely merge with Phase 1 results through online softmax.

![](https://i.ibb.co/gFMqzcjg/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-10.png)

This design's system benefits mainly manifest in three aspects:

- Historical block representation reads change from "once per layer" to "once per block," significantly amortizing I/O;
- Since Phase 2's merge is mainly elementwise operations, easier to fuse with existing kernels like all-reduce, RMSNorm;
- Phase 1 can overlap with block-internal computation, so added work doesn't fully fall on decode critical path.

More importantly, two-phase computation achieves exact equivalent reorganization to original attention through online softmax. Thus, it's an infrastructure component for AttnRes's real-world deployment.

#### From Inference Perspective: Block AttnRes's Goal Isn't Just Lowering Average Cost, but Avoiding New Latency-Bound Critical Path

> [Discussing Some Ideas Behind Attention Residual Architecture](https://zhuanlan.zhihu.com/p/2017528295286133070)
>
> ![](https://i.ibb.co/M5tBb7cb/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-11.png)
>
> ![](https://i.ibb.co/zHZQRbYK/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-12.png)

In modern large model inference, "cost optimization" and "latency optimization" aren't fully equivalent. Some structures, while having low average throughput cost, introduce new latency-bound operators in decode small batch, high OTPS scenarios, significantly lengthening end-to-end latency. Thus, AttnRes's inference optimization goal isn't just looking at FLOPs or average throughput, but maximizing: **enhancing residual expressiveness without introducing new Critical Path bottlenecks**.

On this point, Block AttnRes's two-phase organization is especially important. With naive implementation, each layer needs to re-read all historical block representations and execute attention residual—not only increasing prefill memory pressure, but hard to fuse with operators like all-reduce, RMSNorm in decode path. Two-phase computation batches inter-block attention, compresses repeated reads, improves overlap degree, trying to shift added overhead "away" from critical path, thus pressing end-to-end latency increase very low.

##### Caching and Memory: Block Cache Can Be Effectively Amortized Through TP Sharding and Chunked Prefill

Block AttnRes needs to cache block-level representations during inference. If storing complete $N \times T \times d$ cache directly, memory usage becomes large in long contexts. For this, the core engineering idea is sharding along sequence dimension, spreading block cache across tensor parallel devices. With $P$ TP cards, single-card cache scale drops to $N \times \frac{T}{P} \times d.$

Additionally, if combined with chunked prefill, this portion of cache can be compressed further. Meanwhile, Phase 2's online softmax merge, being essentially elementwise operations, is also easier to embed into existing TP reduce-scatter/all-gather paths without introducing expensive new communication mechanisms.

##### Block AttnRes Is a "Nearly Imperceptible" Residual Upgrade

The paper's overall conclusion: with cross-stage caching and two-phase inference strategy, Block AttnRes's training overhead is marginal, while additional latency in typical inference workloads is below 2%. This number is a relatively conservative unified metric; in many common scenarios, its added latency can even be approximately seen as "nearly free."

![](https://i.ibb.co/Z6M9Xn41/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-15.png)

### Experiments & Results

![](https://i.ibb.co/Dgwqhy8v/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-16.png)

![](https://i.ibb.co/0pJ1bcKc/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-17.png)

![](https://i.ibb.co/99rvPkwy/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-18.png)

![](https://i.ibb.co/4ZJKRXPv/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-19.png)

![](https://i.ibb.co/KkHgFFS/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-20.png)

![](https://i.ibb.co/Tq0L2X3q/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-21.png)

> Reproduction Results:
>
> [Using Attention Residuals to Stack GPT2 to 72 Layers](https://zhuanlan.zhihu.com/p/2018790297828631214)
>
> ![](https://i.ibb.co/vxF5Zzxf/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-22.png)
>
> ![](https://i.ibb.co/FqbNcxCq/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-23.png)
>
> ![](https://i.ibb.co/7tng4Vmx/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-24.png)

### Other Relevant Works

> [Mixture-of-Depths Attention](https://arxiv.org/abs/2603.15619)
>
> ![](https://i.ibb.co/BVf37Nps/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-25.png)
>
> ![](https://i.ibb.co/zV50HJCG/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-26.png)
>
> ![](https://i.ibb.co/pj6hhq9L/Attention-Residuals-Another-Step-Towards-a-Highly-Interconnected-3-D-Brain-image-27.png)
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

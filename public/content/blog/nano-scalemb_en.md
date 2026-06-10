# Does Engram memory actually remember? Releasing nano-scalemb

*We're open-sourcing nano-scalemb, a small nanochat-style research harness, and to
show what it's for, we use it to chase down one specific question: when you bolt an
n-gram memory onto a transformer and the scores go up, is the model really *using*
the memory, or just benefiting from an extra compute branch?*

<i class="fab fa-github"></i> **Repo:** [github.com/zy-ning/nano-scalemb](https://github.com/zy-ning/nano-scalemb)

> This is the reproducible follow-up to our
> [reproduction-and-reassessment of Engram](https://zhuanlan.zhihu.com/p/2027403480428558123).
> That write-up was itself a response to 栀染's widely-shared
> [《DeepSeek Engram 里没有记忆，就像 MoE 里没有专家》](https://zhuanlan.zhihu.com/p/2026419832371836848),
> which argued the celebrated memory table is mostly an elaborate regularizer.

## TL;DR

nano-scalemb is a minimal, readable harness for the whole training loop, and
everything below was done with it.

The idea we put under the microscope is **Engram + mHC**: an n-gram hash *memory*
(fixed hash addressing, learned contents) dropped into a multi-stream residual
transformer. On paper it helps. Real Engram beats a memory-free baseline on
CORE (0.271 vs 0.263), ChatCORE (0.410 vs 0.377), ARC-Challenge (0.563 vs 0.496),
and more.

The more interesting result appears when the memory table contains no useful
content. Swap the learned table for frozen noise, or for a table where every row is
identical, and on the chat-suite scores a substantial part of the lift still
survives. A parameter-matched MLP control confirms the same point: it deletes lookup
entirely, keeps the same scale of trainable parameters in the branch, and still
reproduces that part of the lift. (In the pretrain results, however, the two
content-free tables fall below baseline, while the trainable MLP control rises above
it, which is an important clue.) So the score increase has more than one cause;
downstream scores alone can't tell us what the model actually used.

To find out, we go inside the model: a **causal read test** flips a single fact
inside the memory and checks whether the prediction moves; a **weight probe** reads
what each checkpoint learned straight from its `state_dict`; and a **forward probe**
checks how the model uses the Engram branch on real tokens. Together they tell a
two-part story. The model really does learn and use an n-gram store, and the content
it reads has a verifiable causal effect. But a substantial part of the headline score
gain comes from the mechanism itself, not from the table contents.

All six figures below are interactive; hover for exact values.

## What nano-scalemb is

It's a cleaned-up [nanochat](https://github.com/karpathy/nanochat)-style harness for
embedding-scaling and Engram experiments. We tried not to turn it into a heavy
framework: it is mostly plain scripts, dataclasses, and control flow you can read top
to bottom and edit in place. The model lives in `nano_scalemb/` (`gpt.py`,
`engram.py`, `mhc.py`, and friends), the pipelines are shell in `runs/`, and the
analyses are Python in `scripts/`. Every experiment below runs from here. (Install
and quickstart are at the end.)

## The architecture under test: Engram + mHC

The model on the table is a **d24** decoder (24 layers, `n_embd=1536`, 12 heads,
32,768-token vocab, 2048 context, ≈1.95 B params) trained on
[ClimbMix](https://huggingface.co/datasets/karpathy/climbmix-400b-shuffle) at ≈9.5
tokens per param. It stacks two recent DeepSeek ideas, both reproduced faithfully:
[Engram](https://arxiv.org/abs/2601.07372) and
[mHC](https://arxiv.org/abs/2512.24880).

**mHC (Manifold-Constrained Hyper-Connections)** runs four persistent residual
streams (expansion rate *n* = 4) instead of one. Per block, a content-dependent
router emits three transforms: **H_pre** mixes the streams into the sub-layer's
input, **H_res** remixes the streams among themselves, and **H_post** writes the
output back. The "manifold-constrained" trick is that H_res is forced *doubly
stochastic* via Sinkhorn-Knopp (a Birkhoff-polytope projection), which conserves
signal energy across depth and dodges the instability plain Hyper-Connections can
hit. A learned `MHCHead` collapses the four streams before the LM head.
(`nano_scalemb/mhc.py`.)

**Engram** is the n-gram memory (DeepSeek's "conditional memory," a lookup-based
complement to MoE's compute sparsity). At a few layers it hashes the current 2- and
3-gram context into a big embedding table, looks it up, gates it against the hidden
state, and adds the result through a short depthwise causal conv. The key point for
what follows: the addressing (the hash) is fixed at init; only the table contents,
read gate, and projections are learned. "Fixed where to look, learned what's there."
(`nano_scalemb/engram.py`.)

In the main ablation, the memory follows the previous reproduction setting and sits
at layers 2, 12, 18 (`memory_dim=1280`, 3-gram max, 8 heads per n-gram, 4 streams).
For each residual stream it emits a memory write vector, and the mHC router places
those vectors into the residual streams. The layer-placement sweep later checks how
sensitive the conclusions are to this placement.

### The five knobs

The whole investigation rests on a set of checkpoints that share one backbone and
differ only in the memory branch input or table contents:

| Variant | Memory table | What it isolates |
|---|---|---|
| **mHC baseline** | Engram disabled | the backbone alone |
| **Real engram** | learned n-gram memory | the full method |
| **Randomized** | frozen `N(0,1)` noise, never trained | the same read/gate mechanism, but with distinct frozen-noise table entries |
| **Uniform** | every row identical | the same read/gate mechanism, but all table entries are identical |
| **MLP control** | no table at all; the lookup output is replaced by a learned projection of the hidden state | the routed branch's trainable parameter count, with zero n-gram lookup |

The logic is simple. If what matters is the n-gram *content*, only Real should
help. If what matters is the *mechanism* (the extra gated compute and the extra
routed branch), then even Randomized and Uniform might help. The rest of the post is
about how much each explanation accounts for.

The first four differ only in the table contents; Randomized and Uniform freeze
the table, so it never trains and adds *no trainable parameters*. The MLP control
goes one step further and deletes the lookup entirely, replacing the lookup output
with a small learned projection. That makes its trainable budget almost exactly
Randomized's and Uniform's (~+36M over baseline, all of it the routed branch, none
of it n-gram memory), so it answers a sharp version of the question: is the lift just
extra trainable parameters in the branch?

## Downstream metrics: useful, but not only because of memory

**Pretrain results + SFT results, five variants.**

<iframe src="/content/blog/nano-scalemb/ablation_sweep.html" title="Ablation sweep: pretrain + SFT metrics across five variants" loading="lazy" style="aspect-ratio: 1180 / 820;"></iframe>

Start with the scoreboard. The real Engram is the best variant on almost
everything:

| Metric (↑ better unless noted) | mHC baseline | **Real** | Randomized | Uniform | MLP control |
|---|---|---|---|---|---|
| CORE | 0.2626 | 0.2707 | 0.2520 | 0.2534 | **0.2767** |
| val bpb (↓) | 0.7107 | **0.7048** | 0.7237 | 0.7127 | 0.7170 |
| ChatCORE | 0.3765 | **0.4095** | 0.3853 | 0.3946 | 0.3854 |
| ARC-Easy | 0.6494 | **0.6970** | 0.6768 | 0.6928 | 0.6738 |
| ARC-Challenge | 0.4957 | **0.5631** | 0.5265 | 0.5316 | 0.5094 |
| MMLU | 0.3660 | **0.4047** | 0.3829 | 0.3862 | 0.3785 |
| HumanEval | 0.1280 | **0.1402** | 0.1098 | 0.1341 | 0.1220 |
| GSM8K | **0.1198** | 0.1008 | 0.1069 | 0.1016 | 0.1122 |

First separate the pretrain results from the SFT results. In the pretrain results,
Real Engram has the lowest val bpb and also beats the memory-free baseline on CORE;
this matches the previous [Zhihu report](https://zhuanlan.zhihu.com/p/2027403480428558123)
and shows that the real Engram table is useful during pretraining. The SFT results
look similar: Real keeps leading on ChatCORE, ARC, and MMLU. GSM8K is the exception,
where the baseline scores higher.

The previous report left one puzzle: after SFT, Uniform and Randomized, the two
content-free ablations, looked unexpectedly strong on chat metrics. If you look only
at that result, it is easy to conclude that memory content does not matter. This post
is about analyzing that puzzle.

Now look at the two content-free columns. Uniform contains no information, and
Randomized contains no useful information, yet they still beat the baseline on
ChatCORE (0.395 and 0.385 vs 0.377), ARC, and MMLU. An empty table has nothing to
teach the model, but the model still improves on the chat suite. (Not everywhere,
though: the pretrain results point in the opposite direction, which we come back to
in a moment.)

The MLP control turns that suspicion into a measurement. It has the same trainable
parameter scale as Randomized and Uniform but no lookup whatsoever, and it lands
right in their ChatCORE band (0.385, against 0.385 and 0.395) while clearing the
baseline's 0.377. In other words: take away the memory entirely, keep only the extra
trainable routed branch (~+36M parameters), and most of the chat-suite lift over
baseline survives. The part Real gains beyond this parameter-matched baseline, from
≈0.385 to 0.410, is the extra contribution from memory content; that step uses a
1.6B-parameter learned table.

The pretrain results point the other way. Randomized and Uniform are not only worse
than Real; on CORE they are also worse than the MLP control. The frozen content-free
tables drag CORE down (0.252/0.253, below the baseline's 0.263), while the
same-parameter trainable MLP control posts the best CORE of all (0.2767). Frozen
content-free table outputs behave more like noise the backbone has to work around
during pretraining; the trainable projection can become useful extra compute. So
extra trainable parameters and a frozen content-free table are not the same
intervention: they look similar in the SFT results but move in opposite directions in
the pretrain results.

Each cell here is a single training run. The evaluation itself is deterministic, so
the right caveat is run-to-run training variation, not measurement noise. The MLP
control's CORE lead, in particular, should be read as a useful signal rather than a
settled conclusion. The scores say adding memory helps, but they clearly measure more
than memory content alone. The next step is to look inside the model.

```bash
# Reproduce: train the four table variants on the same backbone...
bash runs/run_engram_ablation_sweep_21218_mhc.sh
# ...plus the parameter-matched, no-lookup MLP control, then plot all five
bash runs/run_engram_mlp_control_21218_mhc.sh
python docs/blog/plot_ablation_sweep.py
```

## How many memory layers, and where?

**Train loss, val bpb, CORE, and ChatCORE against the number and placement of Engram layers, with the best-at-each-count frontier drawn in.**

<iframe src="/content/blog/nano-scalemb/layer_count_sweep.html" title="Layer count sweep: metrics vs number and placement of Engram layers" loading="lazy" style="aspect-ratio: 1180 / 900;"></iframe>

The previous [Zhihu report](https://zhuanlan.zhihu.com/p/2027403480428558123)
already showed that layer placement changes the balance between content and
mechanism. A sparse mid-to-late layout made the content contribution cleaner, while a
dense placement let the mechanism effect dominate the content gap. So here we sweep
both the number and placement of Engram layers.

Sweeping 1-, 2-, and 3-layer placements gives roughly the shape you'd expect: more
memory layers help loss and bpb with diminishing returns, and where you put them
matters. The strongest configs spread the memory across early, mid, and late depth
instead of bunching it up.

- Best 1-layer: `3` → train loss 2.352, val bpb 0.709
- Best 2-layer: `3,12` → train loss 2.328, val bpb 0.705
- Best 3-layer (CORE): `8,12,17` → CORE 0.269

The dashed lattice in the figure connects each config to its supersets
(`3 → 3,12 → 3,12,17`), so you can see at a glance whether adding a layer to a
given configuration actually pays for itself.

The frontier does flatten by three layers, but there's a caveat worth stating
plainly, because it's easy to misread the flattening as the architecture topping
out. Every config here trains for the same number of steps. A 3-layer Engram has
about three times as many memory tables to fill on the same token budget, so each
table sees fewer effective updates. Some of the reason the 3-layer configs don't
pull further ahead is almost certainly that the extra memory is simply
*undertrained*, not that it has nothing left to give. Read the flat frontier as a
lower bound: with a longer schedule, or one that matches updates per table, the gap
could widen. With that caveat in hand, the flattening is still consistent with the
hint from the ablation: part of what we're buying is parameter count and compute, and that
part saturates first.

```bash
# Reproduce: sweep Engram placement at 1 / 2 / 3+ layers, then plot
bash runs/run_one_layer_sweep_mhc.sh
bash runs/run_two_layer_sweep_mhc.sh
bash runs/run_four_layer_sweep_mhc.sh   # extends the best 3-layer config
python docs/blog/plot_layer_count_sweep.py
```

## Is the read actually causal?

**Swap the memory's input, watch the target token.**

<iframe src="/content/blog/nano-scalemb/donor_probe.html" title="Donor probe: swapping the Engram input stream and watching the target token" loading="lazy" style="aspect-ratio: 1100 / 600;"></iframe>

This test is easy to run on Engram. As noted above, Engram is not retrieving from an
entire passage: at each position it hashes the 2–3 consecutive token ids in the
local window (the current 2- and 3-gram) into its table. That token stream is
`engram_input_ids`, which is normally just the prompt. But we can hold the prompt
fixed and swap only the token stream fed to memory for a different "donor" text: one
that matches the target fact, one that conflicts with it, or one that is unrelated.
Then we watch how the target token's logit changes. If the read has no effect, the
logit should not move.

It does move. Across three factual-recall cases (*France → Paris*, *gold → Au*,
*largest planet → Jupiter*), swapping the donor can move the target logit by as much
as **−1.4**, with a clear and reproducible magnitude. This coarse test at least says
the memory input is not a placeholder: changing it changes the target logit. But the
drop is never large enough for the runner-up token to overtake the target. Every
"case × donor" pair has two properties:

1. The change is always a *decrease*. Feeding the prompt itself as the memory input
   gives the highest target logit; any other donor lowers confidence.
2. The prediction never flips. Across all nine combinations, the target token remains
   **rank-1**.

So the read mechanism is connected to the network and does affect predictions, but
this version cannot cleanly prove that it read the corresponding fact. On facts the
backbone already knows well, the read behaves more like a confidence adjustment than
the final decision rule. The effect is real, but not strong.

The problem is that the first donor probe cannot separate a response to *factual
content* from a response to "the memory input changed." It tiled a whole foreign
document into the memory stream and compared it with the condition where the prompt
itself was used as the memory input. That conflates two effects: the read reacting to
factual content, and the read reacting to an overall input-distribution shift.

It is also doubly out-of-distribution. The memory is trained to read the model's own
continuous context, not a tiled foreign paragraph; and the read is a position-aligned
n-gram hash lookup, not a retriever that searches the donor for the relevant fact.
So when the factual signal is weak (matched − adversarial ≈ +0.04 logit, about the
same as a frozen-random control), it says more about the test being too coarse than
about the absence of content in the read. We therefore use a sharper version.

### A sharper test: flip one fact token, in-distribution

**Keep the memory a real sentence, flip only the fact.**

<iframe src="/content/blog/nano-scalemb/flip_probe.html" title="Flip probe: single-token factual flip inside the Engram memory stream" loading="lazy" style="aspect-ratio: 1180 / 620;"></iframe>

The sharper test is a stricter controlled-variable experiment. Hold the backbone
prompt fixed at *"The capital of France is"* and edit only the sentence fed to the
Engram module: flip the token that carries the factual subject (for example,
*France*) and leave the rest of the sentence untouched. So the memory stream reads
either a sentence that agrees with the prompt (`self`: "…France is") or one whose
subject is swapped from France to Japan (`flip`: "…Japan is").

We deliberately choose entities that are already single tokens, so "flip one fact"
is exactly "flip one token" (the engineering constraint is below). Now the memory is
the kind of real, continuous context it was trained on; the flipped token lands
inside the n-gram window used by the read (the read right-aligns its stream to the
backbone); and the *only* thing that varies is the fact asserted by the sentence. In
plain terms: when the model is asked *"The capital of France is"*, we make Engram
wrongly recall memory related to *Japan*, then ask whether the prediction shifts
toward *Tokyo* and away from *Paris*.

Writing $\ell(t \mid e)$ for the logit of token $t$ when the memory stream reads
$e$, the signal for a case whose original answer is $a$ and whose flip-matching
answer is $b$ is a difference-in-differences:

$$\text{signal} = \big[\ell(b \mid \text{flip}) - \ell(a \mid \text{flip})\big] - \big[\ell(b \mid \text{self}) - \ell(a \mid \text{self})\big]$$

i.e. relative to the condition where the memory input agrees with the prompt, how
much the fact flip makes the model prefer the flip-matching answer over the original
answer. One implementation constraint: the flipped entity must be a single token at
a fixed slot, and many entities do not tokenize that way, so a guard rejects any pair
that re-segments.

It does. Across **36 cases in five knowledge domains** (capitals, languages,
chemical symbols, continents, planet order), the single-token flip raises the
matching answer by **+0.36 logit** on average, with the correct direction in
**28/36** cases. The two content-free controls do not show the same factual signal:
Randomized fluctuates near zero, and Uniform is **exactly** zero for every case
because every row is identical, so the flip changes nothing at the table level. In
this in-distribution setting, the read does carry factual information.

Two limitations need to be stated:

1. **The magnitude is not unique to factual flips.** Any entity replacement, even a
   filler word with no factual meaning, moves logits by a similar magnitude. What is
   fact-specific is the *direction* (raising the matching answer), not the magnitude
   itself. After controlling for this surface perturbation with a filler-word
   baseline, the signal is +0.23 and positive in 21/36 cases; smaller, but still
   clearly above the controls.
2. **The backbone still dominates.** The flipped capital almost never overtakes the
   original answer. The read changes the model's preference, but usually not the
   final output.

Dissecting the 8 failed cases at the token level supports the same interpretation:
one is a metric artifact (the surface perturbation pulls a tail target down faster
than the rank-1 original token), four come from knowledge domains where the model is
already unstable and the signal is close to random variation, and only three are
clear misses. Those three land exactly where the memory is hardest to learn: ambiguous
single-character answer tokens (`O`, `H`) and one weak association (Greece → Athens).
So the read is real and its direction depends on content, but it is not the decision
maker; the backbone still is.

```bash
# Original donor swap (kept for comparison)
bash runs/run_engram_donor_probe_21218.sh   # wraps scripts/engram_donor_eval.py
python docs/blog/plot_donor_probe.py

# The in-distribution token-flip probe (real + randomize + uniform), then plot
python -m runs.gen_engram_flip_cases        # regenerate + validate the 36 cases
bash runs/run_engram_flip_probe_all.sh      # wraps scripts/engram_flip_eval.py
python docs/blog/plot_flip_probe.py
```

## What did it learn? Reading the weights

**Code: `scripts/engram_weight_probe.py`.**

<iframe src="/content/blog/nano-scalemb/weight_probe.html" title="Weight probe: drift-from-init signals read straight from the checkpoint" loading="lazy" style="aspect-ratio: 1280 / 560;"></iframe>

The architecture gives us a convenient entry point. Almost every important Engram
parameter starts at a known value: `value_proj` at **0**, the short conv at **0**, the
read-gate projection at a uniform scale, and the table at `N(0,1)`. So how far a
trained weight has drifted from its initialization is already a useful signal: it
tells us which parts the model mainly adjusted. We can read that straight from the
checkpoint. That's the weight probe.

It tracks three things per variant: how large a vector this layer writes into the
residual (`value_proj` RMS, init 0), how much the read-gate projection grew relative
to initialization (`stream_key_proj` norm over init), and whether the embedding
table's row norms increased substantially.

The three variants separate clearly:

- **Real** increases the embedding-table row norm to about **50×** its initial value
  (≈440 vs ≈9). The write projection also moves clearly away from zero
  (`value_proj` RMS ≈ 0.13–0.15), and the read-gate projection grows to ≈4–5× init.
- **Randomized** cannot change its frozen table, so it increases the read-gate
  projection even more (≈5× init), trying to use differences in the frozen noise.
- **Uniform** goes the other way: it nearly shuts off writing (`value_proj` RMS down
  to ≈0.005–0.03) and pulls the read-gate projection below init. A table with no
  information is not worth reading, and the weight changes reflect that.

The three behaviors are clearly different. But weights only tell you what the model
*could* do, not what actually happens when text flows through.

```bash
# Reproduce: read drift-from-init straight from the checkpoints (no forward)
python -m scripts.engram_weight_probe \
    --checkpoint REAL_CKPT:STEP \
    --checkpoint RANDOMIZE_CKPT:STEP \
    --checkpoint UNIFORM_CKPT:STEP \
    --output-dir docs/blog/weight_probe
python docs/blog/plot_weight_probe.py
```

## What does it do? The forward pass

**Code: `scripts/engram_forward_probe.py`.**

<iframe src="/content/blog/nano-scalemb/forward_probe.html" title="Forward probe: read gate distribution, selectivity, and written contribution on real tokens" loading="lazy" style="aspect-ratio: 1280 / 560;"></iframe>

The forward probe pushes a small batch of real validation tokens through each
checkpoint and reads activation signals that only exist during the forward pass. It
does not train or backpropagate; it only uses about 4k tokens. The capture works
through light wrappers that recompute each module's internals from its own trained
weights and always hand back the model's true output, so the forward pass and the
reported loss are untouched.

Three panels, all on real text.

**The read gate.** Per token and per stream the gate is a sigmoid in (0,1), and the
more informative part is its distribution shape:

| Variant (layer 12) | gate Q1–median–Q3 | shape |
|---|---|---|
| **Real** | 0.23 – 0.37 – 0.53 | graded, sits low-to-mid |
| **Randomized** | 0.01 – 0.55 – 0.995 | slammed to both rails (0/1) |
| **Uniform** | 0 – 0 – 0 | shut |

Real opens a graded, content-dependent gate. Randomized's gate moves toward the two
extremes; it cannot distinguish the tokens it reads, so it switches between near 0
and near 1. Uniform mostly closes the gate at depth.

**Gate selectivity** (the across-token std) confirms the same ranking. The third
panel, how much the memory actually *writes*, is the key one:

| Variant | Engram output RMS (layers 2/12/18) |
|---|---|
| **Real** | ≈100 – 145 |
| **Randomized** | ≈4 – 6 |
| **Uniform** | ≈0.3 – 6 |

Real Engram writes about **25×** more into the residual than either ablation. This is
the inference-time counterpart of what the weights showed: Randomized's table-output
norm is small because the frozen noise was never trained up, and Uniform pushes its
write almost to zero. So even when their gate values are nonzero, there is almost
nothing useful to write. One more detail: Uniform's `MHCHead` collapses onto a single
stream (`[0, 0, 0, 1.0]`), effectively routing around the streams that the Uniform
table would have written into.

The single-batch loss lines up with all of this too (real best, randomized worst),
matching the full-validation bpb from the ablation.

```bash
# Reproduce: forward-pass signals on real tokens
python -m scripts.engram_forward_probe \
    --checkpoint REAL_CKPT:STEP \
    --checkpoint RANDOMIZE_CKPT:STEP \
    --checkpoint UNIFORM_CKPT:STEP \
    --checkpoint MHC_BASELINE_CKPT:STEP \
    --device cpu --batch-size 8 --seq-len 512 \
    --output-dir docs/blog/forward_probe
python docs/blog/plot_forward_probe.py
```

## Putting it together

Line the evidence up and a coherent picture appears:

- **Downstream:** Real is best overall; but the content-free ablations retain much of
  the *chat-suite* lift while falling *below* baseline in the pretrain results. The
  parameter-matched MLP control, which deletes lookup but keeps the same ≈+36M
  trainable branch, reproduces that chat lift on its own, tying it to the routed
  branch's parameter count rather than table contents. Content and mechanism leave
  different traces in different metrics.
- **Inside the model:** the read mechanism is used and is content-sensitive, but on
  facts the backbone already knows it mostly adjusts confidence. Real has much larger
  table row norms and write magnitude, Uniform nearly shuts writing off, and
  Randomized increases the read gate to use differences in frozen noise.

Both halves are true. Real Engram genuinely learns and uses an n-gram memory, and the
three probes confirm this from different angles. At the same time, a meaningful slice
of the headline lift is the *mechanism* rather than the *content*: the extra gated,
routed compute branch helps even when the table is empty, or absent entirely. The MLP
control makes that concrete by matching the ablations' trainable parameter budget
with no lookup at all and still clearing baseline on the chat suite. Scores alone
mix these two effects together.

This also answers the claim that started the thread, that the memory table is "just
regularization." 栀染's ablation idea is useful, but our conclusions differ in many
places. The content is not inert: the real table's row norms grow to about 50× their
initial value, its write magnitude is about 25× the ablations, and the pretrain
results move with it. It is not merely a regularizer for training. The weaker point
we do grant is that a meaningful slice of the headline lift comes from the extra
gated, routed branch rather than lookup content itself. And the balance between
content and mechanism is not fixed; it changes with where the memory is placed.
Compared with our earlier reproduction in a single-stream setting (the [Zhihu report](https://zhuanlan.zhihu.com/p/2027403480428558123)),
the mHC multi-stream architecture makes Real Engram's advantage over the ablations
much larger, suggesting that multiple residual streams amplify the contribution of
memory content.

A broader note: these architecture conclusions can be surprisingly subtle. Change
the feature set, the layer layout, an implementation detail, or even the model scale,
and results can shift in completely different directions. So the conclusion needs to
stay narrow: findings from one configuration should not be treated as universal
truths. Thorough ablations and hyperparameter sweeps are not optional extras; they
are part of the experiment. As a next step, we're planning scaling ladder
comparisons, putting Engram side by side with STEM, Gemma4 PLE, and MoE to see how
their scaling behaviors actually differ.

So, to answer the title: yes, it remembers. The probes clearly show that a real,
content-dependent store is learned and used. The pretrain results support the same
point: the real table improves val bpb and CORE, while content-free tables drag CORE
down. But on facts the backbone already knows well, this memory behaves more like a
confidence adjustment than a decision-maker; and in the SFT results, the most visible
chat-suite lift likely comes from the branch's extra trainable parameters rather than
the recalled content itself. Only the inside view pulls those threads apart, which is
the whole point.

---

## Get nano-scalemb

The code is on GitHub: **[github.com/zy-ning/nano-scalemb](https://github.com/zy-ning/nano-scalemb)**.

Everything above ships in the repo. Each section's `Reproduce` block is a
copy-paste command, and the probe scripts live under `scripts/` and `docs/blog/`.

```bash
uv venv && source .venv/bin/activate
uv sync --extra gpu          # or --extra cpu
bash runs/speedrun.sh        # train a baseline, then go probe it
```

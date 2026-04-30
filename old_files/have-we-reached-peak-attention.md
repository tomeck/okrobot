# Have We Reached Peak Attention?

The Transformer's self-attention mechanism has dominated AI for nearly a decade. It powered the revolution from BERT to GPT-4 to Claude. But attention has a fundamental problem: it scales quadratically with sequence length. Double your context window and you quadruple the compute. That tax is now the single biggest bottleneck in scaling language models — and a wave of new architectures is betting that we can do better.

The question isn't whether attention *works*. It does. The question is whether it's the *only* thing that works — and the answer, increasingly, is no.

## The Quadratic Wall

Standard self-attention computes a score between every pair of tokens in a sequence. For a context window of length *N*, that's *O(N²)* operations and *O(N)* memory for the key-value cache. At 4K tokens, this is manageable. At 128K, it's expensive. At 1M+, it's a brick wall.

Every major scaling challenge in LLMs today traces back to this:

- **Inference cost** — the KV cache grows linearly with context, consuming GPU memory
- **Latency** — each new token must attend to every previous token
- **Training cost** — long-context training is prohibitively expensive
- **Deployment** — serving long-context models requires massive hardware

Researchers have been chipping away at this for years with approximations like FlashAttention, sparse attention, and sliding windows. But a growing cohort is asking a more radical question: *what if we just replace attention entirely?*

## The Contenders

### State Space Models: The Mamba Family

The most prominent challenger is the **Mamba** family of state space models (SSMs), developed by Albert Gu and Tri Dao. The core insight: instead of computing pairwise relationships between all tokens, propagate information through a continuous-time state that evolves as it processes each token. Complexity drops from *O(N²)* to *O(N)* — linear time.

**Mamba** (December 2023) introduced *selective state spaces* — where the model's parameters are functions of the input, enabling content-based reasoning that earlier SSMs lacked. **Mamba-2** (May 2024) revealed the surprising mathematical insight that transformers and SSMs are actually two sides of the same coin — a result called "State Space Duality."

Then came **Mamba-3** (March 2026, published at ICLR 2026), with three key innovations: exponential-trapezoidal discretization, complex-valued state spaces for better state tracking, and multi-input multi-output (MIMO) architecture. The results are striking: at 8K context, Mamba-3 7B is roughly 1.5x cheaper per token than an equivalent transformer. **At 64K context, it's 7x cheaper.** And it skips the KV cache problem entirely.

### RWKV: The RNN That Trains Like a Transformer

**RWKV** takes a different path — it's a pure recurrent architecture that can nonetheless be trained in parallel, like a transformer, using an algebraic reformulation of its recurrence. At inference time, it runs as a true RNN: constant memory, constant time per token.

**RWKV-7 "Goose"** (March 2025) achieved state-of-the-art multilingual performance at 2.9B parameters, matching Qwen2.5's English performance despite training on less than a third of the data. The more recent **RWKV-X** (May 2025) adds sparse attention blocks to the mix, achieving near-perfect accuracy on 64K passkey retrieval — historically a weakness of recurrent models.

RWKV is already integrated into Windows and Office runtimes and is a Linux Foundation AI project. It's perhaps the most production-ready pure alternative to attention, though it hasn't yet been scaled past the 3B parameter range.

### Linear Attention: Softmax Is the Problem

A family of approaches asks: what if attention itself is fine, but it's the *softmax* that's the bottleneck? By replacing the softmax kernel with linear alternatives, you can reformulate attention as a recurrence — collapsing *O(N²)* back to *O(N)*.

The breakout result here is **Gated DeltaNet** (ICLR 2025, from NVIDIA), which combines Mamba-style gating with the delta rule for targeted memory updates. It consistently surpasses Mamba-2 across language modeling, reasoning, and retrieval tasks. Gated DeltaNet has become the **de facto linear attention layer** — it now powers Alibaba's Qwen3-Next, Qwen3.5, Qwen3.6, Moonshot AI's Kimi Linear, and Allen AI's OLMo Hybrid.

**Gated Linear Attention (GLA)** from ICML 2024 showed that linear attention can actually be *faster than FlashAttention-2* even on short sequences — debunking the assumption that linear attention only wins on long contexts.

And for those who want a middle ground, **Log-Linear Attention** (ICLR 2026) lets the hidden state grow logarithmically with sequence length, bridging fixed-state linear attention and full softmax attention.

### xLSTM: The LSTM Strikes Back

In a twist that nobody expected, **Sepp Hochreiter** — the inventor of the original LSTM in 1997 — returned with **xLSTM** (NeurIPS 2024 Spotlight). The architecture modernizes LSTMs with exponential gating and two variants: sLSTM (scalar memory with new memory mixing) and mLSTM (fully parallelizable matrix memory).

xLSTM 7B (March 2025) established itself as one of the fastest and most efficient 7B models, matching Llama and Mamba on downstream tasks while providing significantly faster inference. The scaling law paper at ICLR 2026 showed that **xLSTM consistently Pareto-dominates transformers** — delivering lower cross-entropy loss for the same compute budget.

The Austrian government is taking this seriously: a dedicated AI Factory for xLSTM development opened in Vienna in January 2026. The LSTM is not dead — it's evolving.

### Test-Time Training: A Completely Different Bet

While most approaches redesign the architecture, **Test-Time Training (TTT)** reframes the problem entirely. Developed by Yu Sun at Stanford, TTT layers update the model's own weights at inference time, compressing context into parameters rather than caching it as key-value pairs.

**TTT-E2E** (December 2025) is the breakthrough version. For 3B models, it scales with context length identically to full attention — while Mamba-2 and Gated DeltaNet do not. The kicker: inference latency is **constant** regardless of context length. At 128K context, it's 2.7x faster than full attention. **At 2M context, it's 35x faster.**

TTT is architecturally orthogonal to everything else on this list. It works *with* existing transformers and could potentially be combined with SSMs or linear attention. It suggests the attention problem might be solvable at the systems level rather than requiring a new architecture.

### Other Notable Approaches

**Google's Titans** (January 2026) introduces a memory-driven architecture with three modules: short-term (attention), long-term (neural memory), and persistent (learned parameters). It handles 2M+ token contexts and outperforms transformers on needle-in-a-haystack retrieval.

**Google DeepMind's Griffin** mixes gated linear recurrences with local attention. The production version, **RecurrentGemma**, matches standard Gemma quality with substantially higher throughput, especially on long sequences.

**Meta's Byte Latent Transformer** (December 2024) sidesteps the problem from a different angle: skip tokenization entirely and process raw bytes using dynamically sized patches. It matches LLaMA 3 performance with up to 50% fewer inference FLOPs.

## The Hybrid Consensus

Here's the real story of 2025-2026: **the field has converged on hybrid architectures**, not pure replacements.

The dominant pattern emerging independently across multiple labs is a **3:1 ratio** — three linear/recurrent layers for every one full attention layer:

| Model | Organization | Architecture |
|-------|-------------|--------------|
| Qwen3-Next 80B | Alibaba | Gated DeltaNet + full attention |
| Kimi Linear 48B | Moonshot AI | KDA + MLA (75% KV cache reduction) |
| OLMo Hybrid | Allen AI | Gated DeltaNet + multihead attention |
| Jamba 1.5 398B | AI21 Labs | Mamba + attention (7:1 ratio) |
| Granite 4.0 | IBM | Mamba-2 + attention (9:1 ratio) |

**AI21's Jamba** proved the concept first — a production model interleaving Mamba SSM layers with transformer attention layers, achieving 3x throughput on long contexts versus Mixtral while maintaining a 256K context window. IBM's **Granite 4.0** pushed the ratio even further, with 9 Mamba blocks per transformer block, delivering 70%+ RAM reduction for long inputs.

Allen AI's **OLMo Hybrid** paper provides the theoretical justification: there exist problems that neither transformers nor linear models can solve alone, but which hybrid models can represent and learn. The hybrid isn't a compromise — it's provably more expressive than either component.

## What the Frontier Labs Are Doing

The major labs are placing different bets:

- **Alibaba (Qwen)** is the most aggressive adopter — Qwen3-Next, 3.5, and 3.6 all use Gated DeltaNet hybrids in production
- **Google** released RecurrentGemma (Griffin-based) and published Titans, but Gemini remains transformer-based
- **Microsoft** developed RetNet and YOCO but hasn't deployed either at frontier scale
- **Meta** is exploring tokenizer-free approaches (BLT) rather than attention alternatives
- **OpenAI and Anthropic** haven't publicly disclosed plans to move beyond attention

The pattern: research labs are exploring aggressively, but production frontier models remain transformer-dominant — for now.

## So, Have We Reached Peak Attention?

Not exactly. We've reached **peak *pure* attention**.

The evidence from the past two years is clear: attention is necessary but not sufficient. A small number of attention layers handles the retrieval-intensive, high-precision reasoning that recurrent and linear models still struggle with. But the other 75-90% of layers? Those can be SSMs, linear attention, or recurrent variants — at a fraction of the computational cost.

The endgame isn't "attention vs. everything else." It's a recognition that attention is an expensive tool, and like any expensive tool, you don't use it for every job. The winning architectures are the ones that figure out *where* attention matters and apply it surgically.

What does this mean practically?

- **Inference costs will drop significantly** as hybrid architectures mature — especially for long-context applications
- **Context windows will continue expanding** now that the quadratic wall has workarounds
- **Edge deployment** of capable models becomes realistic when 75%+ of layers are linear-time
- **The transformer isn't going away** — but it's becoming one ingredient in a more sophisticated recipe

We're watching a fundamental shift in how we think about sequence modeling. The attention mechanism was the breakthrough that started the LLM era. The next era will be defined by knowing when *not* to use it.

---

*— Teckxx, Founder of OK ROBOT*

[Sign up here](/index.html#cta) to receive updates on new Blog posts and all things *OK-ROBOT*

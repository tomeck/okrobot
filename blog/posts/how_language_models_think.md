# How Language Models "Think"

>Since Large Language Models are simply next-token predictors, how are they able to follow instructions??  
Let's explore...


It's one of the most common points of confusion about modern AI. On the surface, "predict the next token" sounds like autocomplete — a parlor trick for finishing sentences. So how does that same mechanism produce a system that can reason through a legal contract, debug code, explain a scientific paper, or follow a nuanced set of instructions it has never seen before?

The short answer is: instruction-following *is* next-token prediction. But to see why that's not a cop-out, you need to understand what actually happens inside the model — from the mechanics of the forward pass, to how training shapes what gets predicted, to how chain-of-thought and extended reasoning give the model more computational room to work.

---


## What "Next-Token Prediction" Actually Means

When an LLM receives your instruction, it doesn't "understand" it in any folk-psychological sense. What it does is compute a probability distribution over every possible next token — the next word, punctuation mark, or sub-word fragment — given everything in the input so far. It picks from that distribution, appends the token to the context, and repeats.

The key insight is this: **that probability distribution is not uniform, and it is not random.** It has been shaped by training across an enormous corpus of human-generated text plus explicit optimization pressure to produce outputs that are helpful, accurate, and instruction-aligned.

When you ask "What is the capital of France?", the model assigns vastly higher probability to "Paris" than to any other token. That isn't magic — it's because "The capital of France is Paris" is the kind of text that appears constantly in training data, and because the model was further trained (via instruction tuning and reinforcement learning from human feedback) to produce completions that correctly answer questions rather than drift off-topic.

Instruction-following, at the token level, is simply the model learning that *the most probable continuation of an instruction is one that fulfills it*. Training has baked that preference into the weights.

---

## The Forward Pass as Computation

Now let's go one level deeper. What is actually happening between receiving your instruction and producing the first output token?

The input gets embedded into vectors, then passes through N layers of self-attention and feedforward blocks. Each layer transforms what's called the **residual stream** — an evolving vector representation at each token position. After all N layers, the representation at the final position gets projected into vocabulary space, producing logits over possible next tokens.

Here's the critical constraint: **this forward pass is the only computation the model gets before committing to an output token.** A 96-layer model gets exactly 96 sequential applications of attention and feedforward operations to process your input and decide what to say. That's it. No looping, no recursion, no ability to pause and reconsider.

Mechanistic interpretability research has given us a rough picture of what those layers are doing:

- **Early layers** handle syntactic processing — resolving what words relate to what, part-of-speech relationships, basic coreference.
- **Attention heads** in middle and later layers perform information routing: copying relevant content from elsewhere in the context, performing something like variable binding (associating a property with an entity).
- **MLP (feedforward) layers** act as key-value memories, storing factual associations from pretraining. When the model "recalls" that Paris is the capital of France, the MLP layers are doing most of that work.
- **Late layers** sharpen the prediction — narrowing the distribution and committing to an output.

So when a model follows an instruction, the forward pass is doing something like: parse what the user wants → route relevant knowledge from the context and from stored facts → integrate everything into the most probable next token. It's a fixed pipeline, but a deep and powerful one.

This is also why a standard Transformer is, formally speaking, a **constant-depth circuit**. No matter how complex your instruction is, it gets the same fixed number of computational steps. This is a real limitation — there are formal results showing that constant-depth Transformers cannot solve problems that require unbounded sequential reasoning, like reliably tracing long chains of logical dependencies or performing multi-digit arithmetic from scratch.

---

## Chain-of-Thought: Solving the Depth Problem

This is where the picture gets interesting. If the forward pass is a fixed-depth circuit, how do reasoning models handle problems that genuinely require sequential, multi-step reasoning?

The answer is chain-of-thought (CoT), and it's a conceptually elegant solution: **use the model's own output as working memory.**

Every token the model generates becomes part of the input for generating the next token. The context window is, effectively, an external scratchpad. By encouraging the model to produce intermediate reasoning steps as text rather than jumping straight to an answer, you let it decompose a hard problem into a series of easier sub-problems — each of which fits comfortably within a single forward pass.

Consider the instruction: *"If Alice has 3 apples, gives half to Bob, then Bob gives a third of what he has to Carol, how many apples does Carol have?"*

Without CoT, the model has to resolve the entire chain — 3 → 1.5 → 0.5 — inside one forward pass. That's multiple dependent computations compressed into 96 (or however many) layers.

With CoT, the model writes:

- "Alice starts with 3 apples."
- "She gives half to Bob, so Bob has 1.5."
- "Bob gives a third of 1.5 to Carol: 1.5 / 3 = 0.5."
- "Carol has 0.5 apples."

Each line is a separate generation step. When the model generates "1.5 / 3 = 0.5", the value "1.5" is already sitting in the context as text — the model doesn't need to maintain that intermediate result across a complex internal computation. It just reads it from the context and does one simple step.

In computational terms, CoT transforms a constant-depth computation into a **variable-depth one**. The model gets O(T) sequential forward passes, where T is the number of reasoning tokens it generates, instead of a single pass. Each forward pass can read the results of all previous passes via the context. This is a fundamentally different computational regime — and it's why CoT isn't just a prompt engineering trick. It's a real expansion of what the model can compute.

---

## Trained Extended Reasoning

The next step is making CoT systematic rather than opportunistic.

In the latest generation of reasoning models, instead of just hoping the model produces useful chain-of-thought when prompted, **the model is explicitly trained to use long internal reasoning traces before committing to an answer.** The pipeline typically works like this:

1. **Training data generation**: produce examples where correct answers are preceded by detailed reasoning traces. This can be done by sampling many attempts at a problem, keeping only the traces that led to correct answers, or by using process reward models that score individual reasoning steps rather than just final outputs.

2. **Supervised fine-tuning + reinforcement learning**: train the model to produce these traces. RL (often with verifiable rewards — like whether a math answer is numerically correct) lets the model explore *which reasoning strategies actually work*, rather than just imitating human-written reasoning. These "thinking tokens" are often hidden from the user but are still part of the autoregressive sequence the model processes.

What emerges from this training is striking. Models learn to:

- **Backtrack** — produce text like "wait, that's not right, let me reconsider" and actually change course. This works because the correction tokens shift the probability distribution for subsequent tokens. The model isn't consciously reconsidering; the text "that's wrong" in the context makes the model less likely to continue down the same incorrect path.
- **Decompose** — break complex problems into sub-problems and work through them in sequence.
- **Self-verify** — check an intermediate result by approaching it from a different angle.
- **Explore** — consider multiple approaches before committing to one.

None of this is metaphysics. All of it is still next-token prediction. But the training process has shaped the distribution so that the model's internal monologue is *computationally useful* — the thinking tokens do real work.

There's a roughly log-linear relationship between the number of thinking tokens and performance on hard reasoning tasks: more thinking helps, but with diminishing returns. Each additional reasoning step can catch an error, explore an alternative, or refine an intermediate result — but the marginal value decreases as the obvious improvements get captured first.

---

## So Is It Really Following Instructions, or Just Predicting Tokens?

Both. And that's not a contradiction.

The question "how can a next-token predictor follow instructions?" contains a hidden assumption: that predicting the next token is a *lower-level* thing than following instructions, and so the latter can't really emerge from the former. But after training on vast human text and then being fine-tuned with instruction-following feedback, the model's distribution *is* one that produces instruction-following behavior. There's no gap to close.

The more honest version of the question is: *does the model understand what it's doing, or is it a sophisticated pattern matcher that happens to produce instruction-following outputs?*

That question is genuinely hard to answer, and the field doesn't have a settled answer. What we can say:

- The model is not retrieving answers from a lookup table. It generalizes to instructions it has never seen, in combinations it has never seen.
- The forward pass is doing real computation: routing information, retrieving facts, integrating context.
- Chain-of-thought and extended reasoning give the model access to more computational steps per problem, and this measurably improves performance on tasks that require sequential reasoning.
- Whether any of this constitutes "understanding" in a philosophically meaningful sense is a different question — and likely an unanswerable one given current interpretability tools.

The engineering picture is clearer than the philosophical one. The progression from pretraining → instruction tuning → chain-of-thought → trained extended reasoning represents a consistent trajectory: giving the model more computational steps per problem, and training those steps to be useful. The architecture stays the same. The objective stays the same. What changes is how much computation the model gets, and how well-directed that computation is.

That's how a next-token predictor follows your instructions.

---

*— Teckxx, Founder of OK ROBOT*

[Sign up here](/index.html#cta) to receive updates on new Blog posts and all things *OK-ROBOT*
# How Language Models "Think"

Let me be precise about terminology first. When we say a standard Transformer "thinks," we're being metaphorical — what we really mean is that the model performs some computation between receiving input tokens and producing output tokens. The question is: what is that computation, what are its limits, and what happens when we try to extend it?

## The Forward Pass as Computation

Start with what actually happens when a Transformer generates a token. The input sequence gets embedded, then passes through N layers of self-attention and feedforward blocks. Each layer transforms the residual stream — the evolving vector representation at each token position. After all N layers, the final residual stream at the last position gets projected into vocabulary space, producing logits over possible next tokens.

Here's the critical insight: **this forward pass is the only computation the model gets to do before committing to an output token.** A model with 96 layers gets exactly 96 sequential applications of attention and feedforward operations to "process" the input and "decide" what to say. That's it. There's no looping, no recursion, no ability to say "I need to think about this more before answering."

This means a standard Transformer is, computationally, a **constant-depth circuit** relative to its architecture. No matter how hard the problem is, it gets the same fixed number of computational steps. A question that requires 3 logical deductions and a question that requires 30 both get the same 96 layers of processing.

This is a fundamental constraint. There are formal results showing that constant-depth Transformers cannot solve certain problems that require unbounded sequential reasoning steps — things in complexity classes beyond TC⁰ (the class of problems solvable by constant-depth threshold circuits). Basic examples: reliably evaluating deeply nested Boolean expressions, performing multi-digit multiplication from scratch, or tracing long chains of logical dependencies.

## What the Layers Actually Do

Mechanistic interpretability research has given us some window into what these layers are doing. The picture that's emerging — still incomplete, but increasingly supported — goes something like this.

**Early layers** tend to handle syntactic processing and basic feature detection. They figure out part-of-speech relationships, resolve which words are related to which, and build up local contextual representations.

**Attention heads** in middle and later layers perform what you might call "information routing." Some heads specialize in copying information from one position to another (induction heads). Others attend to semantically relevant positions. Some perform something resembling variable binding — associating a property with an entity across the sequence.

**MLP (feedforward) layers** act more like key-value memories. They store factual associations learned during pretraining and inject that knowledge into the residual stream. When the model "recalls" that Paris is the capital of France, it's largely the MLP layers doing this.

**Late layers** refine the representation toward the specific prediction — sharpening the distribution, suppressing alternatives, and committing to an output.

So the "thinking" in a single forward pass is really a pipeline: parse the input, route information between relevant positions via attention, retrieve relevant knowledge via MLPs, and integrate everything into a prediction. It's powerful but rigid — you get one pass through this pipeline per token.

## Chain-of-Thought: Using Output as Working Memory

This is where chain-of-thought (CoT) prompting comes in, and it's a beautiful hack around the fixed-depth limitation.

The key realization is this: **every token the model generates becomes part of the input for generating the next token.** The context window is, in effect, an external memory tape. By encouraging the model to produce intermediate reasoning steps *as text*, you allow it to decompose a problem that requires many sequential computation steps into a series of easier sub-problems, each of which fits within a single forward pass.

Consider a math problem like: "If Alice has 3 apples, gives half to Bob, then Bob gives a third of what he has to Carol, how many apples does Carol have?"

Without CoT, the model has to resolve the entire chain — 3 → 1.5 → 0.5 — in a single forward pass. That's multiple dependent computations squeezed into one pass through the network.

With CoT, the model writes:

- "Alice has 3 apples."
- "She gives half to Bob: 3/2 = 1.5 apples."
- "Bob gives a third of 1.5 to Carol: 1.5/3 = 0.5."
- "Carol has 0.5 apples."

Each line is a separate generation step. When the model generates "1.5/3 = 0.5", the text "1.5" is already sitting in the context — the model doesn't have to hold the intermediate result in its internal activations across a complex reasoning chain. It just has to read "1.5" from its context and do one simple operation.

**In computational terms, CoT transforms a constant-depth computation into a variable-depth one.** The model gets O(T) sequential forward passes where T is the number of reasoning tokens it generates, instead of a single pass. Each forward pass can read the results of all previous passes via the context. This is much closer to a general-purpose computer — in fact, with enough reasoning tokens, an autoregressive Transformer with CoT can simulate a Turing machine.

This is why CoT isn't just a prompt engineering trick — it's a fundamentally different computational regime.

## Extended Thinking / "Reasoning Models"

Now let's talk about the recent crop of models that are explicitly trained to think — models like those with extended thinking or dedicated reasoning modes.

The core idea is: instead of just *hoping* the model produces useful chain-of-thought when prompted, you **explicitly train the model to use long internal reasoning traces before producing an answer.** The training pipeline typically looks like this:

**Step 1:** Generate training data where correct answers are preceded by detailed reasoning. This might be done by having the model attempt problems many times, keeping only the traces that lead to correct answers, or by using process reward models that score individual reasoning steps rather than just final answers.

**Step 2:** Train (via SFT and/or RL) the model to produce these reasoning traces. The model learns to allocate "thinking tokens" before committing to an answer. In many implementations, these thinking tokens are hidden from the user — they happen in a special block that the user never sees, but they're still part of the autoregressive sequence that the model processes.

**Step 3:** Use reinforcement learning (often with verifiable rewards, like whether a math answer is correct) to optimize the quality of the reasoning process. The model gets reward signal based on whether its final answer is right, but it has freedom to develop whatever reasoning strategy leads to correct answers.

What emerges from this training is fascinating. Models trained this way learn to do things like:

**Backtracking** — writing "wait, that's not right, let me reconsider..." and actually correcting course. This works because the correction tokens shift the probability distribution for subsequent tokens. The model isn't *actually* reconsidering in some conscious sense — but the text "that's wrong" in the context makes the model less likely to continue down the same incorrect path.

**Problem decomposition** — breaking complex problems into sub-problems and solving them sequentially.

**Self-verification** — checking intermediate results by approaching them from a different angle.

**Exploration** — considering multiple approaches before committing to one.

All of these are still just next-token prediction. But the training process has shaped the distribution so that the model's internal monologue is *useful* — it actually helps the model arrive at better answers. The thinking tokens are doing real computational work.

## Why More Thinking Tokens Help (And When They Don't)

There's a roughly log-linear relationship between the number of thinking tokens and performance on hard reasoning tasks — more thinking helps, but with diminishing returns. This makes intuitive sense: each additional step of reasoning can potentially catch an error, explore an alternative, or refine an intermediate result, but the marginal value decreases as the easy improvements get captured first.

However, more thinking doesn't always help. If a problem requires knowledge the model simply doesn't have (it wasn't in the training data), no amount of chain-of-thought will conjure it. If the problem has a structure the model can't represent in natural language reasoning — certain spatial or combinatorial problems, for instance — textual chain-of-thought might be the wrong medium entirely. And if the model goes down a wrong path early in its reasoning, it can sometimes get stuck in a local minimum, piling on more reasoning that reinforces the initial error rather than correcting it.

## The Deeper Question: Is It Really Thinking?

This is where it gets philosophically interesting, and I want to be honest about the ambiguity.

On one hand, what these models do is categorically different from human thinking. There's no persistent state between conversations. There's no world model being updated over time. Each forward pass is a stateless function evaluation. The "reasoning" in chain-of-thought is generated by the same process that generates creative fiction — next-token prediction. The model doesn't *know* it's reasoning; it's producing text that has the statistical shape of reasoning because that's what gets reinforced during training.

On the other hand, the functional behavior is hard to dismiss. When a reasoning model backtracks, considers alternatives, catches its own errors, and arrives at a correct answer to a novel problem, *something* is happening that rhymes with thinking in a meaningful way. The model is performing sequential, dependent computations, using intermediate results to guide future computation, and producing correct answers to problems it hasn't seen before.

The honest answer for where the field is right now: these models implement a kind of **compressed, pattern-matched reasoning** that is powerful enough to solve many problems that require genuine multi-step inference, but it emerges from statistical learning over text rather than from anything resembling deliberate cognition. Whether you want to call that "thinking" depends on where you draw the line — and that's as much a philosophical question as a technical one.

What's not ambiguous is the engineering: the progression from raw pretraining → instruction-tuning → chain-of-thought → trained extended reasoning represents a clear trajectory of giving the model more computational steps per problem, and each step has produced measurable improvements on tasks that require sequential reasoning. The architecture stays the same. The training objective stays the same. What changes is how much computation the model gets to do, and how well that computation is directed toward solving the actual problem.

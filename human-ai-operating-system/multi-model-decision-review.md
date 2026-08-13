# Multi-model decision review

> **Evidence status: Working prototype — one real run.** This is a review protocol, not an autonomous decision maker. It has no external-adoption or business-impact claim.

## The problem

Asking several AI systems the same question can create false confidence. If they all receive the same incomplete source, agreement may only mean that they interpreted the same material in a similar way.

I had already used multiple AI systems manually for decisions that needed extra scrutiny. The repeated bottleneck was not getting more answers; it was preserving independent reasoning, locating the real disagreement and knowing which part still required my judgment.

## Before → after

| Before | After |
|---|---|
| Ask several systems and compare final answers | Give each system the same neutral question and collect independent answers before comparison |
| Treat agreement as stronger confidence | Check whether the systems share the same source, assumption or missing evidence |
| Smooth differences into one summary | Preserve dissent and show where the reasoning paths separate |
| Let the models appear to settle value choices | Return risk appetite, private facts and accountability to the human decision owner |

The three-round structure was informed by [QUINTE](https://github.com/eric-stone-plus/QUINTE), a public multi-agent review protocol. I adapted it around two failure modes from my own repeated use: **shared-input risk** and **questions that only the accountable human can decide**.

## The protocol

### R1 · Independent review

Each system receives the same neutral question without seeing the other answers or my preferred conclusion. The outputs are preserved before any synthesis.

### R2 · Adversarial review

The review compares reasoning rather than counting votes:

1. Assume the first answer is wrong and test whether another system's reasoning can break it.
2. Check whether all systems depend on the same source or assumption.
3. Separate factual disagreement, reasoning disagreement and differences in risk tolerance.

### R3 · Decision record

The final record states the supported conclusion, unresolved dissent, missing evidence and the next action. If the remaining choice depends on private facts, values or risk tolerance, the protocol does not pretend that AI can cast that vote.

## Sanitized first run

**Decision context:** A public legal allegation raised questions about whether a prospective company still deserved time and deeper diligence. Identifying details and the private career analysis are omitted.

**Input:** One neutral case summary was sent to **three AI systems** for independent review.

**Initial output:** All three produced a similar high-level direction: do not treat the allegation as a proven fact, but increase diligence before making a commitment.

**What the second round caught:** All three answers ultimately depended on the **same translated secondary news report** contained in the shared input. Their agreement showed that the report had been interpreted consistently; it did not verify the report's figures or claims.

**Decision change:** I did not repeat the article's numbers as verified facts. The next action became source verification through original reporting or primary legal material. A separate disagreement about acceptable risk remained explicitly mine to decide.

| Observable result from the run | Honest boundary |
|---|---|
| Three independent model responses were compared | Three models are not three independent sources |
| One shared-input risk was surfaced before the claims were reused | The original source still required verification |
| One value judgment was returned to the human owner | The protocol does not remove uncertainty or accountability |

## What I decide — and where AI helps

**I own:** the question, evidence threshold, privacy boundary, interpretation, acceptable risk and final action.

**AI helps with:** independent analysis, counterarguments, reasoning comparison and the structured decision record.

## What would justify an upgrade

This remains a one-run working prototype. A stronger status would require repeated use across different decision types, a public-safe implementation or an external user applying the protocol and reporting what changed. Agreement alone will never count as verification.

[Return to the MelodieOS case](./README.md)

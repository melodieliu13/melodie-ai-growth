# Reconstructed Example · Rules to Daily Partner Actions

> **Reconstructed and sanitized example based on the original operating workflow.**
>
> This is not an original OKX file, historical dashboard or product interface. Partner identities, internal thresholds and confidential commercial details have been removed.

## Input

**Campaign conditions:**

- three overlapping activity tracks;
- a seven-day holiday execution window;
- roughly 1,200 partners covered by the campaign;
- daily claim and first-trade signals;
- limited reward budget;
- reward-farming risk and possible false positives.

## Reconstructed daily operating view

| Partner state | Signal | Today's action | Human decision boundary |
|---|---|---|---|
| No claims | No evidence the link was distributed | Ask the partner to complete one distribution action using today's short script | Do not assume low potential until the first action is tested |
| Claims, no first trades | Distribution happened; onboarding stalled | Send the one-step first-trade explanation and check where users stopped | Do not increase rewards until the conversion break is understood |
| Healthy claims and first trades | Acquisition and conversion are both moving | Show the partner yesterday's improvement and repeat the winning action | Allocate more support only if quality remains healthy |
| Suspicious claim spike | Activity may be reward farming | Pause additional allocation and review traffic quality | A spike is a review trigger, not automatic proof of abuse |
| High-quality partner flagged | Historical contribution is strong but current traffic looks abnormal | Review history, identify the source of the anomaly and escalate for a second allocation if legitimate | Final decision requires operator judgment and accountability |

## Example daily message

> **Today's one action:** publish the campaign link once using the approved short explanation. Tomorrow we will show you the claim and first-trade movement from that action before asking for the next step.

The point was not to make every partner understand all three campaign tracks. It was to reduce today's cognitive load enough to produce one observable action, then use the next day's data to choose the next intervention.

## Before → After

**Before:** distribute the complete campaign rules and rely on each partner and BD owner to decide what to do.

**After:** identify the partner's current state, assign one action, observe the next conversion signal, and preserve human review for budget and abuse decisions.

## Boundary

This reconstruction shows the operating logic only. It does not reproduce internal thresholds, partner-level performance, original campaign copy or historical screenshots.

[Read the operating case](./campaign-operations.md) · [Return to the homepage](../README.md)

# Case Study · KOL Partner Intelligence

## One-line summary

I replaced repeated KOL timeline reading with a working research workflow that makes **197 accounts and 11,100 posts** searchable, then keeps the final partnership judgment with the operator.

## 1. The real growth job

KOL partnerships require more than follower counts. The useful signals are dispersed across timelines: what an account repeatedly discusses, which products it stands behind, how its position changes and whether multiple credible sources converge.

The growth decision is practical: **Who deserves deeper research, a tailored proposal or no active acquisition time?**

## 2. Why the manual approach stopped scaling

Manual reading worked for a handful of accounts. It did not work across hundreds because it was slow, difficult to search later and unreliable for comparison across sources or months.

## 3. Before → After

| Before | After |
|---|---|
| Open profiles and reread timelines | Preserve monthly source material in a consistent archive |
| Search by memory | Query accounts or topics through `search_kol` |
| Treat every mention as equivalent | Separate source types and compare agreement |
| Produce a descriptive summary | State the decision, confidence, action and disconfirming evidence |

## 4. What runs

### Collection

The Chrome extension archives monthly X/Twitter timelines as Markdown. It was iterated under real operating pressure, including rate limits, stalled pages and interrupted sessions. The private production archive contains **197 accounts and 11,100 posts**.

### Retrieval

The Node MCP server exposes two tools:

- `list_kols` — inspect the available archive;
- `search_kol` — retrieve posts by handle or keyword, with month, limit and sorting controls.

On 2026-07-18, a real MCP call for `MiCA` in `2026-06` returned **89 matching posts from 27 sources**. The public evidence preserves the query parameters and aggregate result while removing handles and post text.

### Decision support

Retrieval is not the decision. I compare source types, reject causal claims the evidence cannot support, define the growth action and state what would change the judgment.

The public evidence separates two different decisions:

- [the real sanitized MCP query and bounded market judgment](./kol-growth-intelligence-output.md) show retrieval and market interpretation;
- [the KOL Partner Decision Brief](./kol-partner-decision-brief.md) shows how candidate evidence becomes an A/B/C/D partnership priority, offer and stop condition.

## 5. Visible proof

| Evidence | Location |
|---|---|
| Timeline exporter | [`twitter-exporter`](../01-kol-growth-intelligence/twitter-exporter) |
| MCP server | [`mcp-server`](../01-kol-growth-intelligence/mcp-server) |
| Real client test | [`smoke_test.js`](../01-kol-growth-intelligence/mcp-server/smoke_test.js) |
| Sanitized live query | [`Input → Output`](./kol-growth-intelligence-output.md) |
| KOL priority judgment | [`Partner Decision Brief`](./kol-partner-decision-brief.md) |

## 6. A judgment the workflow changed

One research question was whether AI was pulling attention away from crypto. The first synthesis made the relationship sound causal. I rejected that framing: attention data could not prove capital movement, and the source pattern pointed to different audiences rather than one zero-sum audience.

The revised judgment was **audience mismatch**. For growth work, that means testing separate messages for crypto-native users and AI-curious technology/finance audiences instead of forcing one message across both.

## 7. What broke in real use

- X rate limits made a stalled page look like a genuine zero-post result. I added longer waits, three recovery attempts and an automatic second pass before accepting zero.
- A single followed-account list missed important people by construction. I kept a manual addition path instead of pretending automated coverage was complete.
- The first report was descriptive. I rejected it and required a decision, confidence level, action and evidence that could reverse the judgment.
- Keyword retrieval can find evidence; it cannot establish causality or partner fit on its own.

## 8. My role versus AI

| I owned | AI supported |
|---|---|
| Defined the partnership-research bottleneck | Drafted and revised implementation code |
| Chose the browser → Markdown → MCP design | Assisted debugging and repetitive transformation |
| Set source-preservation and report requirements | Clustered repeated themes for review |
| Tested real accounts and rejected weak outputs | Accelerated iterations after each failure |
| Retained the final partnership judgment | Did not own the business decision |

## Outcome and boundary

**Outcome:** a manual research process became a searchable, repeatable workflow that supports partner and market decisions.

**Boundary:** the system produced retrieval and decision support, not a separately attributable revenue result. The private archive and account-level analysis are not published.

[Return to the portfolio homepage](../README.md)

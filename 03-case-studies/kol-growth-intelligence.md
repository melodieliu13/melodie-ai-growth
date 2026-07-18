# Case Study · KOL Growth Intelligence

## One-line summary

I replaced manual KOL timeline reading with a working pipeline that archives 197 accounts / 11,109 tweets, exposes the archive to an LLM through MCP tools, and supports a repeatable partnership-intelligence report.

## 1. The growth problem

KOL partnerships require more than follower counts. The useful signals are dispersed across timelines: what an account repeatedly discusses, which products it stands behind, how its position changes and whether multiple credible sources converge.

Manual reading worked for a handful of accounts. It did not scale, could not be searched reliably later and made month-to-month comparison difficult.

## 2. The product decision

I did not begin with “build an AI agent.” I began with the information bottleneck:

1. preserve the source material in a stable format;
2. make it queryable without requiring technical search syntax;
3. synthesize it through a consistent report structure;
4. keep the final growth judgment with the operator.

That produced a three-layer design: collection, retrieval and decision support.

## 3. What runs

### Collection

The Chrome extension archives monthly X/Twitter timelines as Markdown. It was iterated under real operating pressure, including rate limits and interrupted sessions, and reached a full archive of **197 accounts and 11,109 tweets**.

### Retrieval

The Node MCP server exposes two working tools:

- `list_kols` — inspect the available archive;
- `search_kol` — search the archive through an LLM tool call.

A smoke test is included in the repository.

### Decision support

The archive feeds an influence-weighted monthly intelligence structure designed to surface attention shifts, emerging narratives, source agreement and accounts worth further investigation.

## 4. My role versus AI

| I owned | AI supported |
|---|---|
| Defined the partnership-research bottleneck | Drafted and revised implementation code |
| Chose the browser → Markdown → MCP architecture | Assisted debugging and documentation |
| Set source-preservation and report requirements | Performed repetitive transformations |
| Tested real accounts and rejected bad outputs | Accelerated iterations after each failure |
| Retained the final partnership judgment | Did not own the business decision |

## 5. Evidence

| Evidence | Location |
|---|---|
| Timeline exporter | [`01-kol-growth-intelligence/twitter-exporter`](../01-kol-growth-intelligence/twitter-exporter) |
| MCP server | [`01-kol-growth-intelligence/mcp-server`](../01-kol-growth-intelligence/mcp-server) |
| Smoke test | [`smoke_test.js`](../01-kol-growth-intelligence/mcp-server/smoke_test.js) |
| MCP documentation | [`README.md`](../01-kol-growth-intelligence/mcp-server/README.md) |

The raw KOL archive and internal report are intentionally not published because they contain collected source material and private working analysis. The code repository contains no tweet archive, meeting transcript, token or private key.

## 6. Outcome and boundary

**Outcome:** a manual research process became a searchable, repeatable intelligence workflow that I use to decide what and whom to investigate.

**Boundary:** this system produced decision support, not a separately attributable revenue result. It demonstrates AI-native growth execution; it does not claim that the tools caused the career growth figures shown on the portfolio homepage.

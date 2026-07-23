# KOL Partner Intelligence

A working growth-research workflow for deciding which accounts, narratives and potential partners deserve deeper attention.

## The operating problem

Manual timeline reading worked for ten accounts, not hundreds. This workflow makes source material retrievable without pretending that retrieval is the business decision.

```text
~200 public accounts / 11,100 posts
        ↓
monthly source archive
        ↓
list_kols / search_kol
        ↓
source comparison
        ↓
human growth decision + next action
```

## Components

- [`twitter-exporter`](./twitter-exporter) — Chrome extension that archives monthly X/Twitter timelines as Markdown.
- [`mcp-server`](./mcp-server) — exposes the archive through two tools an LLM client can call.
- [Case study](../03-case-studies/kol-growth-intelligence.md) — the growth problem, Before → After, failures and judgment boundary.
- [Real Input → Output](../03-case-studies/kol-growth-intelligence-output.md) — a live MCP query published as sanitized aggregate evidence.

## Visible evidence

- Working source code for collection and retrieval.
- A real MCP client smoke test.
- A 2026-07-18 live query that returned 89 matching posts from 27 sources.
- A sanitized decision output showing what the operator accepted, rejected and changed.

## Data scope and privacy

The exporter archives posts published by public accounts within a user-selected time window. I used it to review market narratives and evaluate potential partners. It is not designed to access protected accounts, private messages or other non-public content.

The collected archive and account-level research remain private. This repository contains no collected post corpus, account-level notes, tokens, keys or private analysis.

# KOL Growth Intelligence

The flagship system in this portfolio: a real user-growth research workflow that turns KOL timelines into structured, queryable partnership intelligence.

```text
197 accounts / 11,109 tweets
        ↓
Chrome extension → monthly Markdown archive
        ↓
MCP server → list_kols / search_kol
        ↓
AI-assisted synthesis → human growth decision
```

## Components

- [`twitter-exporter`](./twitter-exporter) — archives monthly X/Twitter timelines as Markdown.
- [`mcp-server`](./mcp-server) — exposes the archive as tools an LLM can call.
- [Case study](../03-case-studies/kol-growth-intelligence.md) — explains the growth problem, decisions, evidence and boundaries.

## Why it matters

The collection code is useful, but it is not the core value. The value is the operating design: preserve source evidence, make it retrievable by an AI system, apply a repeatable synthesis structure, and keep the final partnership decision human-owned.

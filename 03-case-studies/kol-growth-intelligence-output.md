# Real Input → Output · KOL Partner Intelligence

This page contains two pieces of evidence:

1. a real MCP query run against the private production archive, published only as sanitized aggregate output;
2. a growth judgment produced from the wider research process.

**Privacy:** handles, post text, private notes and employer-confidential information have been removed.

## 1. Real MCP query

- **Run date:** 2026-07-18
- **Tool:** `search_kol`
- **Status:** completed successfully through a real MCP client

```json
{
  "query": "MiCA",
  "month": "2026-06",
  "limit": 100,
  "sort": "time"
}
```

### Sanitized tool output

```json
{
  "matched_posts": 89,
  "unique_sources": 27,
  "date_range": "2026-06-01 to 2026-06-30",
  "source_mix": {
    "official_accounts": 50,
    "independent_research": 3,
    "institutional_research": 4,
    "media": 2,
    "investors_and_founders": 5,
    "other_or_unclassified": 25
  }
}
```

The raw response contained the matching handle, source category, timestamp, post ID, text and engagement fields. Those fields were used locally and removed from this public artifact.

### What this output is strong enough to do

- locate the June discussion quickly across multiple source types;
- separate first-party platform positioning from independent interpretation;
- identify which claims require primary regulatory verification;
- create a focused research list for partner or market analysis.

### What it cannot do

- prove that a regulatory or licensing claim is true merely because many accounts repeated it;
- rank a partner's commercial value without additional fit and relationship evidence;
- infer user conversion or market share from discussion volume.

## 2. Decision output from the wider workflow

**Research question:** Is AI pulling attention away from crypto, and should that change how a growth team positions a crypto product?

| Layer | Finding |
|---|---|
| Signal | AI was gaining attention across a wider technology and finance audience, while crypto-native discussion remained active inside its own audience. |
| Rejected interpretation | “AI is siphoning capital from crypto.” Attention data alone could not establish capital movement or causality. |
| Revised judgment | The stronger explanation was **audience mismatch**, not one zero-sum attention market. |
| Growth action | Keep crypto-native acquisition focused on utility and market relevance. Test AI-led positioning separately with broader technology and finance audiences. |
| Confidence | Directional, not causal. Useful for message testing; insufficient for budget reallocation without campaign data. |
| What would change the judgment | Cross-audience conversion data showing the same users consistently choosing AI products over crypto products. |

## What the tool did — and what I did

The tool preserved and retrieved source material. AI helped cluster repeated themes and draft an initial synthesis.

I rejected the causal framing, separated attention from capital flow, defined the audience split and decided what the evidence was strong enough to change.

[View the working code](../01-kol-growth-intelligence) · [Read the case study](./kol-growth-intelligence.md)

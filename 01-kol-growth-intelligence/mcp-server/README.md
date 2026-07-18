# KOL Signal MCP Server

A small Node MCP server that makes a local KOL research archive queryable by an LLM client.

## What it exposes

| Tool | Operator use |
|---|---|
| `list_kols(category?)` | Inspect available accounts, source categories, months and post counts |
| `search_kol(query, month?, limit?, sort?)` | Retrieve posts by handle or keyword, optionally filtered by month and sorted by time or engagement |

The server retrieves evidence. It does not score partner value or make the final growth decision.

## Install

```bash
npm install
```

## Configure the data root

Set `KOL_DATA_ROOT` to a local archive with this structure:

```text
KOL_DATA_ROOT/
  source-category/
    account-handle/
      2026-06_account-handle.md
```

Example client configuration:

```json
{
  "mcpServers": {
    "kol-signal": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/server.js"],
      "env": {
        "KOL_DATA_ROOT": "/absolute/path/to/your/archive"
      }
    }
  }
}
```

The public repository does not include the private production archive.

## Verify with a real MCP client

```bash
KOL_DATA_ROOT=/absolute/path/to/your/archive node smoke_test.js
```

The smoke test starts the server, lists its tools and calls both `list_kols` and `search_kol`.

A production query was run on 2026-07-18 with:

```json
{
  "query": "MiCA",
  "month": "2026-06",
  "limit": 100,
  "sort": "time"
}
```

It returned 89 matching posts from 27 sources. [See the sanitized output](../../03-case-studies/kol-growth-intelligence-output.md).

## Implementation

- Node.js, ESM and the official `@modelcontextprotocol/sdk`.
- stdio transport.
- Monthly Markdown parsing with in-process caching.
- Environment-configured data root; no private archive path is embedded in the public code.

## Boundary

Keyword retrieval can surface evidence and source disagreement. It cannot prove a repeated claim, infer causality or decide which partner deserves a commercial offer.

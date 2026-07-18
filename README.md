# User Growth, Amplified by AI

### Melodie Liu · User Growth Operator

I diagnose the real growth bottleneck, design the system around it, and use AI to make research and execution scale.

**User growth is my profession. Strategy, BD and AI-native execution are the capabilities I use to produce it.**

| Proven growth record | AI execution in this repository |
|---|---|
| **25M+ USDT** cumulative profit across ~300 affiliate partners at OKX | **197 accounts · 11,109 tweets** structured for KOL intelligence |
| One KOL case: first trades **26 → 144**; rebates **+65%** | A working **Chrome extension → MCP server → decision report** pipeline |
| K12 expansion rate **18%** vs. a 13–14% industry benchmark | **678 recordings** made available for structured review |

> These are two separate evidence layers. My career record proves the growth outcomes I have owned. This repository proves how I now use AI to scale the work behind growth decisions. I do not attribute the business results above to these tools.

---

## Flagship case · KOL growth intelligence

### The growth problem

KOL partnership decisions depend on knowing what creators are actually saying, which narratives are gaining momentum, and which accounts are worth engaging. Reading timelines by hand stopped working beyond roughly ten accounts and left no reusable evidence trail.

### The system I built

```mermaid
flowchart LR
    A[197 KOL accounts<br/>11,109 tweets] --> B[Chrome extension<br/>monthly Markdown archive]
    B --> C[MCP server<br/>list_kols + search_kol]
    C --> D[AI-assisted synthesis<br/>influence-weighted report]
    D --> E[Human decision<br/>who and what to investigate]
```

| Layer | What it does | Evidence |
|---|---|---|
| Collect | Archives monthly X/Twitter timelines as structured Markdown | [`twitter-exporter`](./01-kol-growth-intelligence/twitter-exporter) · v3.4 |
| Retrieve | Lets an LLM query the archive through `list_kols` and `search_kol` | [`mcp-server`](./01-kol-growth-intelligence/mcp-server) · working, smoke-tested |
| Decide | Turns scattered posts into a repeatable intelligence report | [Case study](./03-case-studies/kol-growth-intelligence.md) |

**What changed:** manual tab-reading became a queryable archive and a repeatable decision workflow. The output is partnership intelligence—not revenue attribution.

---

## What this demonstrates

| Capability | Proof in the work |
|---|---|
| **Growth problem framing** | Started from a real partnership bottleneck, not from a technology demo |
| **Build for AI** | Packaged a private information archive as callable MCP tools instead of relying on manual search |
| **Data → decision design** | Defined the report structure, source weighting, comparison logic and acceptance criteria |
| **AI orchestration** | Directed AI to implement, debug and iterate while retaining human ownership of architecture and judgment |
| **QA under real conditions** | Iterated through rate limits, pagination, silent extraction failures and interrupted sessions |
| **Pattern reuse** | Reused a proven browser-to-filesystem architecture across three real workflows |

My advantage is not typing code faster. It is knowing **which growth problem is worth systematizing, what evidence the system must preserve, and when its output is good enough to act on**.

---

## Supporting work · workflow automation

| Project | Real operating constraint | What I built |
|---|---|---|
| [Transcript exporter](./02-workflow-automation/transcript-exporter) | 678 meeting transcripts were locked in a web interface with no bulk export | Reverse-engineered the POST endpoint, request body and pagination cursor; added single and full-history export |
| [Course clippings exporter](./02-workflow-automation/course-clippings-exporter) | Whole courses could not be exported into a usable knowledge base | Built DOM → Markdown batch export with persistent folder access; iterated to v1.85 across real content failures |

These are supporting proof of execution. The flagship is the KOL intelligence system because it is the project most directly connected to user-growth work.

---

## Human–AI division of work

**I own:** problem definition · growth logic · architecture · task decomposition · acceptance criteria · QA · business judgment<br>
**AI handles:** implementation drafts · debugging assistance · repetitive transformation · documentation support<br>
**The tools handle:** collection · storage · retrieval

That division is intentional: AI compresses implementation; it does not replace accountability for the decision.

---

## Honest scope

- These tools were built for my own operating workflows, not packaged as consumer products.
- The MCP server expects the Markdown format produced by the paired exporter; it is not a universal KOL database.
- The implementation is largely AI-written. I defined the problems, directed the build, tested real cases and accepted or rejected the output.
- The KOL pipeline produced faster, archivable analysis and partnership intelligence. It has not yet produced a separately attributable revenue figure.

---

## About

**Melodie Liu (刘成成)** is a user-growth operator with eight years across K12 education, FinTech and Web3. She uses strategic diagnosis, BD and AI-native execution to build scalable growth systems, and works professionally in English and Mandarin.

[Email](mailto:melodieliu13@gmail.com) · [Browse the flagship system](./01-kol-growth-intelligence) · [Read the case study](./03-case-studies/kol-growth-intelligence.md)

<details>
<summary><strong>中文摘要</strong></summary>

### 我是用户增长操盘手，AI 是我放大增长方法的工具

我的工作顺序是：先诊断真正的增长断点，再设计能够规模化的系统，最后用 AI 压缩研究和执行成本。

- **增长实绩**：OKX 约 300 个 affiliate 节点，累计利润超过 2,500 万 USDT；一个 KOL 案例中首交 26 → 144、返佣 +65%；作业帮扩科率 18%，高于行业 13–14%。
- **AI 主作品**：KOL 增长情报流水线，覆盖 197 个账号、11,109 条推文，由 Chrome 插件完成结构化存档，MCP Server 提供检索，AI 辅助生成可复用的情报报告。
- **诚实边界**：增长实绩证明我过去被买单的结果；本仓库证明我现在怎样用 AI 放大增长工作。两组证据不做虚假因果归因。

我负责定义问题、增长逻辑、系统架构、验收标准和最终判断；AI 负责实现、调试与重复劳动。这不是程序员作品集，而是一份 **用户增长 × AI 执行力** 的真实证据。

</details>

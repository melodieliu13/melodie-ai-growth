# kol-signal-mcp

一个 **MCP Server**，让 Claude 直接查询 MelodieOS 的 KOL 情报库，不用每次手动翻文件。
属 P5（信号情报）配套工具，也是对齐 Foresight / Predict.fun JD "AI 生态拓展"（把数据/API 封装成 Agent 可调用的工具）的最小真实练习。

## 它做什么

暴露两个工具给 Claude：

| 工具 | 作用 |
|---|---|
| `list_kols(category?)` | 列出库里所有已抓取的 KOL：handle / 身份分类 / 已有月份 / 推文数。想知道"库里都有谁"先用它。 |
| `search_kol(query, month?, limit?, sort?)` | `query` 是 **handle**（如 `star_okx`）→ 返回这个 KOL 的推文；是**关键词**（如 `MiCA`、`稳定币`）→ 全库检索命中的推文。可按 `month` 过滤、`limit` 限量、`sort=time\|engagement` 排序。 |

数据源是 `05-信号情报/KOL情报库/KOL详情/[分类]/[handle]/YYYY-MM_handle.md`（Chrome 插件抓的月度推文存档）。

## 怎么接进 Claude Code

项目根 `05-信号情报` 所在的 vault 根目录（`MelodieOS/`）已放了 `.mcp.json`：

```json
{
  "mcpServers": {
    "kol-signal": {
      "command": "node",
      "args": ["/Users/melodie2026/Documents/MelodieOS 2/kol-signal-mcp/server.js"]
    }
  }
}
```

1. `cd kol-signal-mcp && npm install`（只需一次）
2. 重启 Claude Code（在 MelodieOS 目录里启动），首次会提示是否信任这个项目的 MCP server → 允许
3. 之后直接对 Claude 说"用 search_kol 查一下 star_okx 六月说了啥"即可

## 自己验证能跑

```bash
npm install
node smoke_test.js   # 起一个真实 MCP client 调三个工具，打印真数据
```

## 数据根目录

默认写死指向 Melodie 本机的 `KOL详情/`。换机器 / 开源给别人用时，用环境变量覆盖：

```bash
KOL_DATA_ROOT=/path/to/KOL详情 node server.js
```

## 技术说明

- Node（ESM），官方 `@modelcontextprotocol/sdk`，stdio transport。
- 解析：按 frontmatter 取 `month/tweet_count`，按 `<!-- id:xxx -->` 注释切推文，正则抠时间戳和 `互动：转发/点赞/回复`。
- 索引进程内缓存（月度快照数据 session 内不变，够用）。

## 为什么是 Node 不是 Python

Melodie 的工具链（KOL 抓取插件、得到导出器）都是 JS，系统 Python 是老的 3.9 且没装 uv。Node v24 现成、零摩擦。
（P5 的另一个脚本 `市场快照/market_snapshot.py` 是 Python——因为那个只用标准库、不装依赖反而最省事。分工：抓取/查询走 JS，纯 API 拉取走 Python stdlib。）

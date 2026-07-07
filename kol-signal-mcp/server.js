#!/usr/bin/env node
// KOL Signal Intelligence — MCP Server
// 让 Claude 直接查询 MelodieOS 的 KOL 情报库，不用每次手动翻文件。
//
// 暴露两个工具：
//   - list_kols(category?)        列出所有已抓取的 KOL（handle / 身份分类 / 月份 / 推文数）
//   - search_kol(query, ...)      按 handle 取某个 KOL 的推文，或按关键词全库检索推文
//
// 数据根目录默认指向 MelodieOS 的 KOL详情/；可用环境变量 KOL_DATA_ROOT 覆盖。

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DATA_ROOT =
  process.env.KOL_DATA_ROOT ||
  "/Users/melodie2026/Documents/MelodieOS/05-信号情报/KOL情报库/KOL详情";

// ---------- 解析层 ----------

// 遍历 KOL详情/[分类]/[handle]/20*.md，跳过「待抓取.md」占位文件。
function collectFiles() {
  const files = [];
  let categories;
  try {
    categories = readdirSync(DATA_ROOT, { withFileTypes: true });
  } catch (e) {
    return files; // 数据根目录不存在时返回空，工具会给出提示
  }
  for (const cat of categories) {
    if (!cat.isDirectory()) continue;
    const catPath = join(DATA_ROOT, cat.name);
    for (const handle of readdirSync(catPath, { withFileTypes: true })) {
      if (!handle.isDirectory()) continue;
      const handlePath = join(catPath, handle.name);
      for (const f of readdirSync(handlePath)) {
        if (!f.endsWith(".md")) continue;
        if (!/^20\d\d-\d\d/.test(f)) continue; // 只要 2026-06_handle.md 这类，排除 待抓取.md
        files.push({
          category: cat.name,
          handle: handle.name,
          path: join(handlePath, f),
        });
      }
    }
  }
  return files;
}

// 解析单个月度 MD：frontmatter + 按 <!-- id:xxx --> 切出的推文。
function parseFile(file) {
  const raw = readFileSync(file.path, "utf8");
  const meta = { month: null, tweet_count: null };
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const m = fmMatch[1].match(/month:\s*"?([\d-]+)"?/);
    if (m) meta.month = m[1];
    const c = fmMatch[1].match(/tweet_count:\s*(\d+)/);
    if (c) meta.tweet_count = Number(c[1]);
  }

  const tweets = [];
  // 用 id 注释切块
  const blocks = raw.split(/<!--\s*id:(\d+)\s*-->/);
  // blocks[0] 是 frontmatter 之前的部分；之后 [id, body, id, body, ...]
  for (let i = 1; i < blocks.length; i += 2) {
    const id = blocks[i];
    const body = blocks[i + 1] || "";
    const tsMatch = body.match(/##\s*\[([^\]]+)\]/);
    const engMatch = body.match(/互动：转发(\d+)\s*·\s*点赞(\d+)\s*·\s*回复(\d+)/);
    // 正文 = 从作者行之后到「互动：」之前
    let text = body;
    const afterAuthor = body.split(/\n作者：[^\n]*\n/);
    if (afterAuthor.length > 1) text = afterAuthor.slice(1).join("\n");
    if (engMatch) text = text.split("互动：")[0];
    // 去掉图片行、引用行保留（引用往往含信号），压缩空白
    text = text
      .replace(/!\[\]\([^)]*\)/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    tweets.push({
      id,
      timestamp: tsMatch ? tsMatch[1] : null,
      text,
      retweets: engMatch ? Number(engMatch[1]) : null,
      likes: engMatch ? Number(engMatch[2]) : null,
      replies: engMatch ? Number(engMatch[3]) : null,
    });
  }
  return { ...file, month: meta.month, tweet_count: meta.tweet_count, tweets };
}

// 建立索引（进程内缓存；数据是月度快照，session 期间不变，缓存足够）。
let _index = null;
function getIndex() {
  if (_index) return _index;
  const files = collectFiles().map(parseFile);
  const byHandle = new Map();
  for (const f of files) {
    if (!byHandle.has(f.handle)) {
      byHandle.set(f.handle, { handle: f.handle, category: f.category, months: [] });
    }
    byHandle.get(f.handle).months.push(f);
  }
  _index = { files, byHandle };
  return _index;
}

// ---------- MCP 工具层 ----------

const server = new McpServer({ name: "kol-signal-mcp", version: "1.0.0" });

server.tool(
  "list_kols",
  "列出 KOL 情报库里所有已抓取的 KOL：handle、身份分类、已有月份、推文数。可选 category 只看某一类（如 官方账号 / 机构投研 / 独立研究）。想知道「库里都有谁」时先用这个。",
  {
    category: z.string().optional().describe("身份分类，如 官方账号 / 机构投研 / 独立研究 / 媒体 / 个人交易员；留空看全部"),
  },
  async ({ category }) => {
    const { byHandle } = getIndex();
    const rows = [];
    for (const k of byHandle.values()) {
      if (category && k.category !== category) continue;
      rows.push({
        handle: k.handle,
        category: k.category,
        months: k.months.map((m) => m.month),
        total_tweets: k.months.reduce((s, m) => s + m.tweets.length, 0),
      });
    }
    rows.sort((a, b) => b.total_tweets - a.total_tweets);
    if (rows.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `未找到任何 KOL 数据。数据根目录：${DATA_ROOT}${
              category ? `（分类过滤：${category}）` : ""
            }`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `共 ${rows.length} 个 KOL（数据根：${DATA_ROOT}）\n\n` +
            JSON.stringify(rows, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "search_kol",
  "查询 KOL 情报库。query 可以是 handle（如 star_okx，返回这个 KOL 的推文）或关键词（如 ETF、稳定币、Binance，全库检索命中的推文）。可选 month 过滤月份（如 2026-06）、limit 限制返回条数、sort（time 按时间倒序 / engagement 按点赞排序）。",
  {
    query: z.string().describe("handle 或关键词"),
    month: z.string().optional().describe("月份过滤，如 2026-06；留空则所有月份"),
    limit: z.number().int().positive().optional().describe("最多返回多少条推文，默认 30"),
    sort: z.enum(["time", "engagement"]).optional().describe("time=按时间倒序（默认），engagement=按点赞数排序"),
  },
  async ({ query, month, limit = 30, sort = "time" }) => {
    const { files, byHandle } = getIndex();
    const q = query.trim().toLowerCase();

    // 1) 先看是不是 handle（精确或子串匹配）
    const handleHits = [...byHandle.keys()].filter((h) => h.toLowerCase().includes(q));
    let mode, matched, tweets;

    if (handleHits.length > 0) {
      mode = "handle";
      matched = handleHits;
      tweets = [];
      for (const h of handleHits) {
        for (const mf of byHandle.get(h).months) {
          if (month && mf.month !== month) continue;
          for (const t of mf.tweets) {
            tweets.push({ handle: h, category: byHandle.get(h).category, month: mf.month, ...t });
          }
        }
      }
    } else {
      // 2) 关键词全库检索推文正文
      mode = "keyword";
      matched = null;
      tweets = [];
      for (const f of files) {
        if (month && f.month !== month) continue;
        for (const t of f.tweets) {
          if (t.text && t.text.toLowerCase().includes(q)) {
            tweets.push({ handle: f.handle, category: f.category, month: f.month, ...t });
          }
        }
      }
    }

    if (sort === "engagement") {
      tweets.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      tweets.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    }

    const total = tweets.length;
    const shown = tweets.slice(0, limit);

    const header =
      mode === "handle"
        ? `模式：handle 匹配 → ${matched.join(", ")}${month ? `（月份 ${month}）` : ""}｜命中 ${total} 条，显示前 ${shown.length} 条`
        : `模式：关键词「${query}」全库检索${month ? `（月份 ${month}）` : ""}｜命中 ${total} 条，显示前 ${shown.length} 条`;

    if (total === 0) {
      const hint =
        mode === "keyword"
          ? `\n\n未命中。可先用 list_kols 看库里有哪些 KOL，或换个关键词。`
          : "";
      return { content: [{ type: "text", text: header + hint }] };
    }

    return {
      content: [
        {
          type: "text",
          text: header + "\n\n" + JSON.stringify(shown, null, 2),
        },
      ],
    };
  }
);

// ---------- 启动 ----------
const transport = new StdioServerTransport();
await server.connect(transport);

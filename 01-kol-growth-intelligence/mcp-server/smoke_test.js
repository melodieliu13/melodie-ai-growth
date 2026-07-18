// 冒烟测试：起一个真实的 MCP client，spawn server.js，调用工具，验证能查到真数据。
// 跑法：node smoke_test.js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"],
  env: { ...process.env },
});
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(transport);

function show(title, res) {
  const text = res.content?.[0]?.text ?? "";
  console.log(`\n===== ${title} =====`);
  console.log(text.length > 900 ? text.slice(0, 900) + "\n…(截断)" : text);
}

// 1) 有哪些工具
const tools = await client.listTools();
console.log("工具列表:", tools.tools.map((t) => t.name).join(", "));

// 2) list_kols（只看官方账号）
const listResult = await client.callTool({
  name: "list_kols",
  arguments: { category: "官方账号" },
});
show("list_kols(category=官方账号)", listResult);
if ((listResult.content?.[0]?.text ?? "").startsWith("未找到任何 KOL 数据")) {
  await client.close();
  throw new Error("No archive data found. Set KOL_DATA_ROOT before running the smoke test.");
}

// 3) search_kol —— handle 模式
show("search_kol(query=star_okx, limit=2)", await client.callTool({
  name: "search_kol",
  arguments: { query: "star_okx", limit: 2 },
}));

// 4) search_kol —— 关键词全库检索
show("search_kol(query=MiCA, limit=3)", await client.callTool({
  name: "search_kol",
  arguments: { query: "MiCA", limit: 3 },
}));

await client.close();
console.log("\n✅ 冒烟测试跑完");

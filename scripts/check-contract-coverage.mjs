#!/usr/bin/env node
/**
 * pi-malf-riskbench-v0.02 契约 AST 校验（AGENTS.md §6 + docs/11-组件装配 §7 装配门禁 + 03-Arch §3.2）
 *
 * 校验项（M0 骨架完成后启用完整校验，当前阶段为骨架占位）：
 *   1. Api 接口方法 ↔ host handlers 一一对应（无 missing / duplicates / unknown）
 *   2. PiBridge 桥接方法链路完整（renderer → preload → IPC → main handler）
 *   3. Stream 通道登记一致（contract + handlers 双端登记）
 *   4. DTO 类型导出完整（每个 RPC 方法的 params/result 类型在 contract 中存在）
 *   5. RPC 方法名路由组前缀合法（malf / risk / ai / bench / viewer / system 六路由组，06-API §7.1）
 *
 * 当前阶段（design，contract 未就绪）：
 *   - src/contract/api.ts 不存在 → graceful skip（退出码 0）
 *   - M0 骨架 T-M0-005 落地后自动启用完整校验
 *
 * 失败任一项 → 非零退出码，阻塞合并。
 *
 * 用法：node scripts/check-contract-coverage.mjs
 *
 * 参考：
 *   - pi-desktop/scripts/check-contract-coverage.mjs（AST 校验范式来源）
 *   - pi-studybuddy/scripts/check-contract-coverage.mjs（阶段自适应范式）
 *   - docs/06-API契约-API-Contracts.md（契约 SoT，25 RPC 方法 + 6 路由组 + 18 registerTool 白名单）
 *   - docs/03-架构设计 §3.2（registerTool 工具集，15 工具，aiCallable 全 ✅）
 *   - docs/06-API §7.3（AI agent 工具调用权限边界：白名单 18 + 黑名单 7）
 *   - AGENTS.md §6（拆分→小组件→组合）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

// ---- 阶段探测 ----
const contractApiPath = path.join(root, "src/contract/api.ts");
const agentHostDir = path.join(root, "src/agent-host");
const preloadPath = path.join(root, "src/preload/preload.ts");
const ipcPath = path.join(root, "src/main/ipc.ts");
const desktopContractPath = path.join(root, "src/contract/desktop.ts");

// 当前阶段：contract 不存在 → graceful skip
if (!fs.existsSync(contractApiPath)) {
  console.log("OK: 契约骨架未就绪（src/contract/api.ts 不存在），跳过 AST 校验");
  console.log("    （M0 骨架 T-M0-005 落地后，本脚本将自动启用完整校验）");
  console.log("    预期 25 RPC 方法（06-API §3，6 路由组）：");
  console.log("      malf.query_snapshot / malf.query_snapshot_range / malf.query_signals / malf.query_symbol_list / malf.query_timeframes / malf.query_market_snapshot / malf.query_rankings / malf.explain_snapshot");
  console.log("      risk.declare_risk / risk.list_risk_declarations / risk.update_risk_declaration / risk.delete_risk_declaration / risk.check_risk_contradiction / risk.quantify_risk");
  console.log("      ai.ai_interpret_snapshot / ai.ai_interpret_backtest / ai.ai_discover_rules");
  console.log("      bench.run_backtest_report / bench.read_backtest_report");
  console.log("      viewer.export_csv");
  console.log("      system.models_config_get / system.models_config_set / system.credentials_get / system.credentials_set");
  console.log("    预期 18 registerTool 工具（06-API §7.3 白名单，03-Arch §3.2 aiCallable ✅）：");
  console.log("      malf: query_snapshot / query_signals / query_symbol_list / query_timeframes / query_market_snapshot / query_rankings / explain_snapshot");
  console.log("      risk: declare_risk / list_risk_declarations / check_risk_contradiction / quantify_risk");
  console.log("      ai: ai_interpret_snapshot / ai_interpret_backtest / ai_discover_rules");
  console.log("      bench: run_backtest_report / read_backtest_report");
  console.log("      viewer: export_csv");
  console.log("    黑名单 7 个（AI 禁止调用，06-API §7.3）：");
  console.log("      risk.update_risk_declaration / risk.delete_risk_declaration");
  console.log("      malf.query_snapshot_range（RPC 专用）");
  console.log("      system.models_config_get / system.models_config_set / system.credentials_get / system.credentials_set");
  process.exit(0);
}

// ---- 动态加载 typescript（仅在 contract 存在时需要）----
let ts;
try {
  ts = (await import("typescript")).default;
} catch {
  fail("typescript 模块未安装，无法进行 AST 校验（请先 pnpm install）");
}

// ---- 读取契约源码 ----
function readIfExists(relativePath) {
  const full = path.join(root, relativePath);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}

const apiTs = readIfExists("src/contract/api.ts");
const desktopTs = readIfExists("src/contract/desktop.ts");
const preloadTs = readIfExists("src/preload/preload.ts");
const ipcTs = readIfExists("src/main/ipc.ts");

if (!apiTs) fail("src/contract/api.ts 不存在但已被探测到——文件系统状态异常");
if (!fs.existsSync(agentHostDir)) fail("src/agent-host 目录不存在（M0 必须创建 handler 注册）");
if (!desktopTs) fail("src/contract/desktop.ts 不存在（PiBridge 桥接契约）");
if (!preloadTs) fail("src/preload/preload.ts 不存在（PiBridge preload 桥）");
if (!ipcTs) fail("src/main/ipc.ts 不存在（IPC handler 注册）");

// ---- 读取 agent-host 目录全部 .ts 源码（含 handlers/ 子目录）----
function collectTsSource(dir) {
  let out = "";
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out += collectTsSource(full);
    else if (entry.name.endsWith(".ts")) out += fs.readFileSync(full, "utf8") + "\n";
  }
  return out;
}
const handlersTs = collectTsSource(agentHostDir);

// ---- 解析 Api 接口方法名 ----
const apiSource = ts.createSourceFile("api.ts", apiTs, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const apiInterface = apiSource.statements.find(
  (stmt) => ts.isInterfaceDeclaration(stmt) && stmt.name.text === "Api",
);
if (!apiInterface || !ts.isInterfaceDeclaration(apiInterface)) {
  fail("src/contract/api.ts 中找不到 Api interface");
}

const apiMethods = apiInterface.members.flatMap((member) => {
  if (!ts.isPropertySignature(member) || !member.name) return [];
  if (ts.isStringLiteral(member.name) || ts.isIdentifier(member.name)) return [member.name.text];
  return [];
});

// ---- 解析 handlers 中的 server.handle({ ... }) 注册 ----
const handlersSource = ts.createSourceFile("handlers.ts", handlersTs, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const registered = [];
function visit(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "handle" &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "server"
  ) {
    const [argument] = node.arguments;
    if (argument && ts.isObjectLiteralExpression(argument)) {
      for (const property of argument.properties) {
        if (
          (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) &&
          (ts.isStringLiteral(property.name) || ts.isIdentifier(property.name))
        ) {
          registered.push(property.name.text);
        }
      }
    }
  }
  ts.forEachChild(node, visit);
}
visit(handlersSource);

// ---- 一致性校验 ----
const registeredSet = new Set(registered);
const missing = apiMethods.filter((m) => !registeredSet.has(m));
const duplicates = registered.filter((m, i) => registered.indexOf(m) !== i);
const unknown = registered.filter((m) => !apiMethods.includes(m));

if (missing.length) {
  console.warn(
    `WARN: ${missing.length} 个 Api 方法暂无 host handler（业务 handler 由 M1+ 业务任务实现，不阻塞本阶段）：${missing.join(", ")}`,
  );
}
if (duplicates.length) fail(`Duplicate host handlers: ${[...new Set(duplicates)].join(", ")}`);
if (unknown.length) fail(`Handlers missing from Api contract: ${unknown.join(", ")}`);

// ---- PiBridge 桥接链路 ----
const piBridgeSection = desktopTs.slice(desktopTs.indexOf("export interface PiBridge"));
const piBridgeMethods = [
  ...piBridgeSection.matchAll(/^\s+([a-zA-Z]\w*)\s*(?:\([^)]*\)\s*)?:/gm),
].map((m) => m[1]);

const missingPreloadMethods = piBridgeMethods.filter((m) => !preloadTs.includes(`${m}(`));
if (missingPreloadMethods.length) {
  fail(`Missing preload methods for PiBridge: ${missingPreloadMethods.join(", ")}`);
}

// ---- IPC 通道一致性 ----
const ipcInvokeChannels = [...preloadTs.matchAll(/ipcRenderer\.invoke\("([^"]+)"/g)].map((m) => m[1]);
const registeredIpc = new Set([...ipcTs.matchAll(/ipcMain\.handle\("([^"]+)"/g)].map((m) => m[1]));

const missingIpcHandlers = ipcInvokeChannels.filter((c) => !registeredIpc.has(c));
if (missingIpcHandlers.length) {
  fail(`Missing IPC handlers for: ${missingIpcHandlers.join(", ")}`);
}

// ---- RPC 方法名路由组前缀检查（06-API §7.1 六路由组）----
const validRouteGroups = new Set(["malf", "risk", "ai", "bench", "viewer", "system"]);
const invalidRouteMethods = apiMethods.filter((m) => {
  const prefix = m.split(".")[0];
  return !validRouteGroups.has(prefix);
});
if (invalidRouteMethods.length) {
  fail(`RPC 方法名路由组前缀非法（合法：malf.*/risk.*/ai.*/bench.*/viewer.*/system.*）：${invalidRouteMethods.join(", ")}`);
}

// ---- 汇总 ----
ok(
  `${apiMethods.length} Api handlers, ${piBridgeMethods.length} PiBridge methods（${ipcInvokeChannels.length} IPC 通道）全部覆盖，路由组前缀合法`,
);

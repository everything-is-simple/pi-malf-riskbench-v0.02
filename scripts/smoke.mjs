#!/usr/bin/env node
/**
 * pi-malf-riskbench-v0.02 M0 系统冒烟（03-Arch §8 + 08-Test §5 + 04-Todo §M0 退出门槛）
 *
 * 验证 M0 退出门槛五项：
 *   1. build 产物齐全（main/preload/agent-host/renderer/contract）
 *   2. contract RPC 往返 system.ping（renderer→main→agent-host 链路）
 *   3. MALF Adapter 子进程 JSON Lines 往返（query_symbol_list 冒烟）
 *   4. credential-vault 加密/解密往返（注入 fake SafeStorageAdapter，set→get 一致性 + 磁盘无明文）
 *   5. 安全不变量六条全过（调用 check-desktop-security.mjs 子进程）
 *
 * 任一失败退出非零，阻塞 M0 退出。
 *
 * 真实 GUI 启动（pnpm dev 打开窗口）由人工在带显示环境执行；本脚本在
 * 无显示环境（CI/agent）下验证可启动前置条件与全链路。
 *
 * 当前阶段（design，dist/ 未就绪）：
 *   - dist/main/main.js 不存在 → graceful skip（退出码 0）
 *   - M0 骨架完成后自动启用完整冒烟
 *
 * 运行数据隔离（AGENTS.md §5.3 + 12-目录治理）：
 *   建库/vault 写 Z:\pi-malf-riskbench-v0.02-runtime\runs\T-M0-009\smoke\
 *
 * 用法：node scripts/smoke.mjs
 *
 * 参考：
 *   - pi-desktop/scripts/smoke.mjs（M0 冒烟范式来源）
 *   - pi-studybuddy/scripts/smoke.mjs（阶段自适应范式）
 *   - AGENTS.md §5.3（测试运行数据隔离）
 *   - docs/08-测试验收 §5（M0 退出门槛）
 *   - docs/04-任务清单 §M0（退出门槛）
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- 阶段探测 ----
const distMainPath = path.join(root, "dist/main/main.js");

if (!fs.existsSync(distMainPath)) {
  console.log("OK: 构建产物未就绪（dist/main/main.js 不存在），跳过 M0 系统冒烟");
  console.log("    （M0 骨架 T-M0-001 ~ T-M0-009 落地后，本脚本将自动启用完整冒烟）");
  console.log("    预期 M0 退出门槛五项（04-Todo §M0）：");
  console.log("      1. build 产物齐全（main/preload/agent-host/renderer/contract）");
  console.log("      2. contract RPC 往返 system.ping（renderer→main→agent-host）");
  console.log("      3. MALF Adapter 子进程 JSON Lines 往返（query_symbol_list 冒烟）");
  console.log("      4. credential-vault 加密/解密往返（safeStorage fake adapter）");
  console.log("      5. 安全不变量六条全过（check-desktop-security.mjs）");
  process.exit(0);
}

// ---- 完整冒烟阶段（M0+）----
const require = createRequire(import.meta.url);
const RUN_DIR = path.join("Z:\\pi-malf-riskbench-v0.02-runtime\\runs\\T-M0-009\\smoke");

function fail(msg) {
  console.error(`[smoke] FAILED: ${msg}`);
  process.exit(1);
}

const steps = [];
function record(name, ok, detail = "") {
  steps.push({ name, ok });
  const mark = ok ? "✅" : "❌";
  console.log(`  ${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("[smoke] pi-malf-riskbench-v0.02 M0 系统冒烟（04-Todo §M0 退出门槛五项）\n");

// ---- 1. build 产物齐全 ----
console.log("[1/5] build 产物齐全");
const required = [
  "dist/main/main.js",
  "dist/main/window.js",
  "dist/main/protocol.js",
  "dist/main/ipc.js",
  "dist/main/credential-vault.js",
  "dist/preload/preload.js",
  "dist/agent-host/index.js",
  "dist/renderer/index.html",
  "dist/contract/rpc.js",
];
let buildOk = true;
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    buildOk = false;
    console.error(`  缺少构建产物：${rel}（请先 pnpm build）`);
  }
}
record("build 产物齐全", buildOk, `${required.length} 项`);

// ---- 2. RPC 往返 system.ping ----
console.log("\n[2/5] contract RPC 往返 system.ping");
const { MessageChannel } = require("node:worker_threads");
const { createAgentHost } = require(path.join(root, "dist/agent-host/index.js"));
const { createRpcClient } = require(path.join(root, "dist/contract/rpc.js"));

const listeners = [];
const parentPort = {
  addEventListener(_t, cb) {
    listeners.push(cb);
  },
  start() {},
};
const agentHost = createAgentHost(parentPort);

const { port1, port2 } = new MessageChannel();
for (const cb of listeners) cb({ data: { type: "connect" }, ports: [port1] });

const client = createRpcClient(port2);

// ---- 3. MALF Adapter 子进程 JSON Lines 往返 ----
console.log("\n[3/5] MALF Adapter 子进程 JSON Lines 往返（query_symbol_list）");
const { createMalfAdapter } = require(path.join(root, "dist/agent-host/malf-adapter.js"));

let adapterOk = false;
let adapterDetail = "";
try {
  // v0.01 五组件路径（12-目录治理 §6.2）
  const malfEnginePath = "Z:\\ai-malf-riskbench-components\\malf-engine";
  const adapter = createMalfAdapter({
    pythonExe: process.env.PI_MALF_PYTHON || "python",
    enginePath: malfEnginePath,
    dataRoot: "Z:\\ai-malf-riskbench-data",
  });
  const symbols = await adapter.call("query_symbol_list", {});
  adapterOk = Array.isArray(symbols) && symbols.length > 0;
  adapterDetail = `symbols 返回 ${symbols.length} 个标的`;
  adapter.dispose();
} catch (e) {
  adapterDetail = `异常：${e.message ?? e}（检查 v0.01 组件路径与 Python 环境）`;
}
record("MALF Adapter JSON Lines 往返", adapterOk, adapterDetail);

// ---- 4. credential-vault 加密/解密往返 ----
console.log("\n[4/5] credential-vault 加密/解密往返");
fs.mkdirSync(RUN_DIR, { recursive: true });
const { CredentialVault } = require(path.join(root, "dist/main/credential-vault.js"));

// fake SafeStorageAdapter（Node 环境无 Electron safeStorage，构造注入）
const fakeAdapter = {
  isEncryptionAvailable: () => true,
  encryptString: (v) => Buffer.from(`pseudocrypt:${v}`, "utf8"),
  decryptString: (b) => {
    const t = b.toString("utf8");
    if (!t.startsWith("pseudocrypt:")) throw new Error("bad ciphertext");
    return t.slice("pseudocrypt:".length);
  },
};

const vaultPath = path.join(RUN_DIR, "smoke-vault.json");
try {
  fs.rmSync(vaultPath, { force: true });
} catch {}
const vault = new CredentialVault(vaultPath, fakeAdapter);

const TEST_KEY = "modelProvider:smoke-test";
const TEST_VAL = "sk-secret-SmokeTest-凭证往返-2026";
let vaultOk = false;
let vaultDetail = "";
try {
  vault.set(TEST_KEY, TEST_VAL);
  const got = vault.get(TEST_KEY);
  // 私密性：磁盘文件不含明文 value
  const onDisk = fs.readFileSync(vaultPath, "utf8");
  const leaksPlaintext = onDisk.includes(TEST_VAL);
  // 键名校验：非法键拒绝
  let badKeyRejected = false;
  try {
    vault.set("invalidKey:bad", "x");
  } catch {
    badKeyRejected = true;
  }
  vaultOk = got === TEST_VAL && !leaksPlaintext && badKeyRejected;
  vaultDetail = `set→get 一致=${got === TEST_VAL}, 磁盘无明文=${!leaksPlaintext}, 非法键拒绝=${badKeyRejected}`;
} catch (e) {
  vaultDetail = `异常：${e.message ?? e}`;
}
record("credential-vault set→get 往返", vaultOk, vaultDetail);

// ---- 5. 安全不变量六条 ----
console.log("\n[5/5] 安全不变量六条（check-desktop-security.mjs）");
const sec = spawnSync(process.execPath, [path.join(root, "scripts/check-desktop-security.mjs")], {
  stdio: "inherit",
});
record("安全不变量六条全过", sec.status === 0, `退出码 ${sec.status}`);

// ---- RPC 往返结果（等待 Promise） ----
console.log("\n[2/5] contract RPC 往返 system.ping（续）");
try {
  const res = await client.call("system.ping", { message: "smoke" });
  const rpcOk = res?.pong === "smoke" && typeof res.timestamp === "number";
  record("RPC 往返 system.ping", rpcOk, `{ pong:${res?.pong}, timestamp:${res?.timestamp} }`);
  client.dispose();
  agentHost.dispose();
  port1.close();
  port2.close();
} catch (e) {
  record("RPC 往返 system.ping", false, e.message ?? String(e));
  try {
    client.dispose();
    agentHost.dispose();
    port1.close();
    port2.close();
  } catch {}
}

// ---- 汇总 ----
const failed = steps.filter((s) => !s.ok);
console.log(`\n[smoke] 汇总：${steps.length} 项，通过 ${steps.length - failed.length}，失败 ${failed.length}`);
if (failed.length > 0) {
  for (const s of failed) console.error(`  ❌ ${s.name}`);
  fail("存在未通过项");
}
console.log("[smoke] M0 系统冒烟全部通过 ✅");
process.exit(0);

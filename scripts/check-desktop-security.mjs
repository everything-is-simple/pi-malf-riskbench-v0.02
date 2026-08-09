#!/usr/bin/env node
/**
 * pi-malf-riskbench-v0.02 桌面安全不变量校验（AGENTS.md §9.6 + 03-Arch §7 + 08-Test §5.7）
 *
 * 硬断言脚本：静态审计 src/ 关键安全配置，任一断言失败立即退出（非零码）。
 *
 * 六条不变量（INV-01 ~ INV-06，03-Arch §7 + 01-TRD §5.5）：
 *   1. INV-01 sandbox:true（webPreferences）                       → T-M0-001 实现
 *   2. INV-02 严格 CSP（default-src 'self' + script-src 'self'）   → T-M0-001 实现
 *   3. INV-03 preload 仅 exposeInMainWorld('piBridge')             → T-M0-001 实现
 *   4. INV-04 credential-vault 用 safeStorage（Windows DPAPI）     → T-M0-003 实现
 *   5. INV-05 Host RPC 契约化（api.ts 完整接口，21 RPC 方法）       → T-M0-002 实现
 *   6. INV-06 HTML 预览独立 CSP（form-action 'none'）              → T-M0-009 实现
 *
 * 当前阶段（design，src/ 未就绪）：
 *   - src/main/window.ts 不存在 → graceful skip（退出码 0）
 *   - M0 骨架 T-M0-001 落地后自动启用完整校验
 *
 * 用法：node scripts/check-desktop-security.mjs
 *
 * 参考：
 *   - pi-desktop/scripts/check-desktop-security.mjs（硬断言范式来源）
 *   - pi-studybuddy/scripts/check-desktop-security.mjs（阶段自适应范式）
 *   - AGENTS.md §9.6（安全不变量六条）
 *   - docs/03-架构设计 §7（安全不变量六条 SoT）
 *   - docs/08-测试验收 §5.7（六条不变量断言）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

// ---- 阶段探测 ----
const windowPath = path.join(root, "src/main/window.ts");
const constantsPath = path.join(root, "src/shared/constants.ts");
const preloadPath = path.join(root, "src/preload/preload.ts");
const vaultPath = path.join(root, "src/main/credential-vault.ts");
const apiPath = path.join(root, "src/contract/api.ts");
const protocolPath = path.join(root, "src/main/protocol.ts");

// 当前阶段：window.ts 不存在 → graceful skip
if (!fs.existsSync(windowPath)) {
  console.log("OK: 桌面壳骨架未就绪（src/main/window.ts 不存在），跳过安全不变量校验");
  console.log("    （M0 骨架 T-M0-001 落地后，本脚本将自动启用六条不变量完整校验）");
  console.log("    预期六条不变量（03-Arch §7）：");
  console.log("      INV-01 sandbox:true（webPreferences）");
  console.log("      INV-02 严格 CSP（default-src 'self' + script-src 'self'）");
  console.log("      INV-03 preload 仅 exposeInMainWorld('piBridge')");
  console.log("      INV-04 credential-vault safeStorage（Windows DPAPI）");
  console.log("      INV-05 Host RPC 契约化（api.ts 21 RPC 方法，路由组 malf/risk/ai/bench/viewer/system）");
  console.log("      INV-06 HTML 预览独立 CSP（form-action 'none'）");
  process.exit(0);
}

// ---- 完整校验阶段（M0+）----
function readSource(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`必需源文件缺失：${rel}（M0 骨架必须创建）`);
  }
  return fs.readFileSync(full, "utf8");
}

const results = [];
function check(id, name, ok, detail = "") {
  results.push({ id, name, ok });
  const mark = ok ? "✅" : "❌";
  console.log(`  ${mark} [${id}] ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("[check-desktop-security] 安全不变量六条校验（03-Arch §7 + 08-Test §5.7）\n");

// ---- INV-01：sandbox:true ----
const windowSrc = readSource("src/main/window.ts");
check(
  "INV-01",
  "renderer 沙箱 sandbox:true（webPreferences）",
  /sandbox:\s*true/.test(windowSrc),
  "BrowserWindow webPreferences.sandbox",
);

// ---- INV-02：严格 CSP（default-src 'self' + script-src 'self'）----
const constantsSrc = readSource("src/shared/constants.ts");
check(
  "INV-02",
  "严格 CSP（default-src 'self' + script-src 'self'）",
  constantsSrc.includes("default-src 'self'") &&
    constantsSrc.includes("script-src 'self'"),
  "src/shared/constants.ts CSP 常量",
);

// ---- INV-03：preload 受控桥接（不暴露 Node API）----
const preloadSrc = readSource("src/preload/preload.ts");
const exposeCount = (preloadSrc.match(/exposeInMainWorld\s*\(/g) || []).length;
const exposesOnlyPiBridge = /exposeInMainWorld\s*\(\s*["']piBridge["']/.test(preloadSrc);
check(
  "INV-03",
  "preload 受控桥接（仅 exposeInMainWorld('piBridge')）",
  exposesOnlyPiBridge && exposeCount === 1,
  `exposeInMainWorld 调用数 ${exposeCount}（应仅 1 次，键名 piBridge）`,
);

// 额外断言：preload 不得直接使用 Node API（require/import fs/child_process 等）
const nodeApiLeak = /\b(?:require|import\s+.*\bfrom)\s+['"](?:node:)?(?:fs|child_process|path|os|net|http|https)['"]/.test(
  preloadSrc,
);
check(
  "INV-03b",
  "preload 不直接使用 Node API（fs/child_process/path 等）",
  !nodeApiLeak,
  "preload 不得 import Node 内建模块",
);

// ---- INV-04：credential-vault safeStorage（Windows DPAPI）----
const vaultSrc = readSource("src/main/credential-vault.ts");
check(
  "INV-04",
  "credential-vault 用 safeStorage（Windows DPAPI）",
  /import\s*\{\s*safeStorage\s*\}\s*from\s*["']electron["']/.test(vaultSrc),
  "src/main/credential-vault.ts import safeStorage",
);

// 额外断言：键名匹配正则（01-TRD §5.2）
const keyRegexPattern = /modelProvider:[a-z0-9._-]{1,160}/i;
check(
  "INV-04b",
  "credential-vault 键名校验（modelProvider:* + riskbench:*）",
  keyRegexPattern.test(vaultSrc) || /riskbench:[a-z0-9._-]{1,160}/i.test(vaultSrc),
  "键名正则 /^modelProvider:[a-z0-9._-]{1,160}$/i 或 /^riskbench:[a-z0-9._-]{1,160}$/i",
);

// ---- INV-05：Host RPC 契约化（api.ts 完整接口，21 RPC 方法）----
const apiTs = readSource("src/contract/api.ts");
// 统计 Api interface 中以 "namespace.method": 形式定义的方法（06-API §3 21 方法）
const apiMethodCount = (apiTs.match(/^\s*"[a-zA-Z]+\.[a-zA-Z_]+"\s*:/gm) || []).length;
check(
  "INV-05",
  "Host RPC 契约化（api.ts 完整接口，21 RPC 方法）",
  apiMethodCount >= 21,
  `api.ts 方法数 ${apiMethodCount}（阈值 ≥ 21，06-API §3）`,
);

// 额外断言：六路由组前缀全覆盖（malf/risk/ai/bench/viewer/system）
const validRouteGroups = new Set(["malf", "risk", "ai", "bench", "viewer", "system"]);
const apiMethods = [...apiTs.matchAll(/^\s*"([a-zA-Z]+\.[a-zA-Z_]+)"\s*:/gm)].map((m) => m[1]);
const foundGroups = new Set(apiMethods.map((m) => m.split(".")[0]));
const missingGroups = [...validRouteGroups].filter((g) => !foundGroups.has(g));
check(
  "INV-05b",
  "六路由组前缀全覆盖（malf/risk/ai/bench/viewer/system）",
  missingGroups.length === 0,
  missingGroups.length === 0
    ? "六路由组全部出现"
    : `缺失路由组：${missingGroups.join(", ")}`,
);

// ---- INV-06：HTML 预览独立 CSP（form-action 'none'）----
const protocolSrc = readSource("src/main/protocol.ts");
check(
  "INV-06",
  "HTML 预览独立 CSP（form-action 'none'）",
  constantsSrc.includes("HTML_PREVIEW_CSP") &&
    constantsSrc.includes("form-action 'none'") &&
    protocolSrc.includes("HTML_PREVIEW_CSP"),
  "constants.ts 定义 HTML_PREVIEW_CSP + protocol.ts 接入",
);

// ---- 汇总 ----
const failed = results.filter((r) => !r.ok);
console.log(
  `\n[check-desktop-security] ${results.length} 条断言：通过 ${results.length - failed.length}，失败 ${failed.length}`,
);

// 六条全绿才通过（08-Test §5.7：任一断言失败阻塞合并）
if (failed.length > 0) {
  console.error("\n[check-desktop-security] FAILED：存在未通过的不变量");
  for (const r of failed) {
    console.error(`  ❌ [${r.id}] ${r.name}`);
  }
  process.exit(1);
}

console.log("[check-desktop-security] 安全不变量六条全部通过 ✅");

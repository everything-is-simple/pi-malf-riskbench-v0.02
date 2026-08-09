#!/usr/bin/env node
/**
 * pi-malf-riskbench-v0.02 文档治理检查（AGENTS.md §11 + docs/00-文档索引）
 *
 * 检查项：
 *   1. 设计文档文件名规范：^\d{2}-.+-[A-Za-z0-9-]+\.md$ + prep-参考点核对表.md
 *   2. 每份 docs/ 文档头部 版本/日期/状态 三字段齐全
 *   3. 00-索引 §3.2 文档登记表与磁盘文档一致（无幽灵、无遗漏）
 *   4. 00-索引 §3.2 状态列与文档头部状态一致
 *   5. supersedes 关系显式（若文档标注 supersedes，需指向具体被替代的版本）
 *   6. 治理资产清单一致性（AGENTS.md §3.4 表）
 *   7. 根目录 .md 白名单（仅 README.md / AGENTS.md，防幽灵副本）
 *   8. 治理基线文件存在性（AGENTS.md §11.1）
 *   9. .pi/skills 与 .pi/prompts 完整性
 *
 * 失败任一项 → 非零退出码，阻塞合并。
 *
 * 用法：node scripts/check-docs-governance.mjs
 *
 * 参考：
 *   - AGENTS.md §11（治理文件修改规则）
 *   - AGENTS.md §3.4（治理资产清单）
 *   - docs/00-文档索引-Index.md
 *   - pi-studybuddy/scripts/check-docs-governance.mjs（范式来源，独立重实现适配 v0.02 格式）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs");

const failures = [];
const warnings = [];

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}
function warn(msg) {
  warnings.push(msg);
  console.warn(`WARN: ${msg}`);
}

// ---- 1. 读取 00-索引 ----
const indexPath = path.join(docsDir, "00-文档索引-Index.md");
if (!fs.existsSync(indexPath)) {
  fail("docs/00-文档索引-Index.md 不存在——无法治理");
  process.exit(1);
}
const indexContent = fs.readFileSync(indexPath, "utf8");

// ---- 2. 扫描 docs/ 下所有设计文档 ----
const docFileNamePattern = /^(\d{2})-(.+)-([A-Za-z0-9-]+)\.md$/;
const designDocs = [];
for (const file of fs.readdirSync(docsDir)) {
  if (!file.endsWith(".md")) continue;
  const m = file.match(docFileNamePattern);
  if (m) {
    designDocs.push({
      file,
      number: m[1],
      slug: m[2],
      suffix: m[3],
      fullPath: path.join(docsDir, file),
    });
  } else if (file === "prep-参考点核对表.md") {
    // prep 是合法的非编号文档，跳过
    continue;
  } else if (!/^\d{2}-/.test(file)) {
    // 非编号文档，跳过
    continue;
  } else {
    fail(`文档文件名不规范：${file}（应匹配 ${docFileNamePattern}）`);
  }
}

// ---- 3. 每份设计文档头部字段检查 ----
function parseHeader(content) {
  // 兼容 Windows CRLF 与 Unix LF 行尾
  const headerMatch = content.match(/^\*\*版本\*\*：(.+?)\r?\n\*\*日期\*\*：(.+?)\r?\n\*\*状态\*\*：(.+?)\r?\n/m);
  if (!headerMatch) return null;
  return {
    version: headerMatch[1].trim(),
    date: headerMatch[2].trim(),
    status: headerMatch[3].trim(),
  };
}

const docHeaders = new Map();
for (const doc of designDocs) {
  const content = fs.readFileSync(doc.fullPath, "utf8");
  const header = parseHeader(content);
  if (!header) {
    // 00 索引作为元文档豁免（头部字段含"用途"而非"状态"）
    if (doc.number === "00") continue;
    fail(`${doc.file}：头部缺少 **版本**/**日期**/**状态** 三字段`);
    continue;
  }
  docHeaders.set(doc.file, header);

  // 状态字段规范检查
  if (
    !header.status.includes("草案") &&
    !header.status.includes("待审查") &&
    !header.status.includes("已审查批准") &&
    !header.status.includes("待用户审查")
  ) {
    warn(`${doc.file}：状态字段非标准格式："${header.status}"`);
  }
}

// ---- 4. 00-索引 §3.2 文档登记表核对 ----
// v0.02 00-索引 §3.2 文档登记表格式：
// | 编号 | 文档名 | 职责 | 状态 | 上游 | 下游 |
// |---|---|---|:--:|---|---|
// | prep | 参考点核对表 | ... | ✅ 草案 | ... |
// | 00 | 文档索引 | ... | ✅ 草案 | ... |
const indexTableSection = indexContent.split("### 3.2 文档登记表")[1]?.split("### 3.3")[0] || "";
// 提取每行的"编号"列（第一列），跳过分隔行和表头
const indexTableRows = [...indexTableSection.matchAll(/^\|\s*(\w+)\s*\|[^|]+\|[^|]+\|\s*([^|]+?)\s*\|/gm)];
const indexRegisteredNumbers = new Set(indexTableRows.map((m) => m[1]));
const indexStatusMap = new Map(indexTableRows.map((m) => [m[1], m[2].trim()]));

for (const doc of designDocs) {
  if (!indexRegisteredNumbers.has(doc.number)) {
    fail(`${doc.file}（编号 ${doc.number}）未在 00-索引 §3.2 文档登记表登记`);
  }
}

// 检查 00-索引登记的编号，是否在磁盘都有对应文件
const docNumbersOnDisk = new Set(designDocs.map((d) => d.number));
for (const num of indexRegisteredNumbers) {
  if (!docNumbersOnDisk.has(num) && num !== "prep") {
    fail(`00-索引 §3.2 登记了编号 ${num}，但磁盘无对应文档文件`);
  }
}

// ---- 5. 文档头部状态与 00-索引 §3.2 状态列一致性 ----
for (const [file, header] of docHeaders) {
  const docNumber = file.match(docFileNamePattern)?.[1];
  if (!docNumber || docNumber === "00") continue;
  const indexStatus = indexStatusMap.get(docNumber);
  if (!indexStatus) {
    fail(`${file} 未在 00-索引 §3.2 状态列登记`);
    continue;
  }
  // 头部"草案"与索引"草案"一致
  if (header.status.includes("草案") && !indexStatus.includes("草案")) {
    fail(`${file} 头部状态"草案"与 00-索引 §3.2 状态"${indexStatus}"不一致`);
  }
  if (header.status.includes("已审查批准") && !indexStatus.includes("已审查批准")) {
    fail(`${file} 头部状态"已审查批准"与 00-索引 §3.2 状态"${indexStatus}"不一致`);
  }
}

// ---- 6. supersedes 关系检查 ----
for (const doc of designDocs) {
  const content = fs.readFileSync(doc.fullPath, "utf8");
  const supersedesMatch = content.match(/\*\*supersedes\*\*[:：]\s*(.+)/i);
  if (supersedesMatch) {
    const target = supersedesMatch[1].trim();
    if (!/v\d+\.\d+\.\d+/.test(target)) {
      fail(`${doc.file}：supersedes 未指向具体版本号（应含 vX.Y.Z 格式）："${target}"`);
    }
  }
}

// ---- 7. 治理资产清单一致性（AGENTS.md §3.4）----
const agentsPath = path.join(root, "AGENTS.md");
if (fs.existsSync(agentsPath)) {
  const agentsContent = fs.readFileSync(agentsPath, "utf8");
  // 提取 §3.4 表中列出的治理资产（status ✅）
  const governanceAssetsSection = agentsContent.split("### 3.4 治理资产清单")[1]?.split("## §4")[0] || "";
  const listedAssets = [...governanceAssetsSection.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1]);
  for (const asset of listedAssets) {
    // 对已 ✅ 的资产检查文件存在
    const rowMatch = governanceAssetsSection.match(new RegExp(`\\| \\\`${asset.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\\`[^\\n]*✅`));
    if (!rowMatch) continue;

    let exists = false;
    if (asset.endsWith("/")) {
      exists = fs.existsSync(path.join(root, asset));
    } else if (asset.includes("*")) {
      const baseDir = path.join(root, path.dirname(asset));
      if (fs.existsSync(baseDir) && fs.statSync(baseDir).isDirectory()) {
        exists = fs.readdirSync(baseDir).length > 0;
      }
    } else if (asset.startsWith("docs/") && !path.extname(asset)) {
      const dir = path.dirname(path.join(root, asset));
      const prefix = path.basename(asset);
      if (fs.existsSync(dir)) {
        exists = fs.readdirSync(dir).some((f) => f.startsWith(prefix + "-") && f.endsWith(".md"));
      }
    } else {
      exists = fs.existsSync(path.join(root, asset));
    }
    if (!exists) {
      fail(`AGENTS.md §3.4 标 ✅ 的治理资产 ${asset} 不存在`);
    }
  }
}

// ---- 8. 根目录 .md 文件白名单（防幽灵副本 + 防幽灵治理资产）----
const allowedRootMd = new Set(["README.md", "AGENTS.md"]);
const rootMdFiles = fs.readdirSync(root).filter((f) => f.endsWith(".md"));
for (const file of rootMdFiles) {
  if (allowedRootMd.has(file)) continue;
  if (fs.existsSync(path.join(docsDir, file))) {
    fail(`根目录存在 docs/ 文档副本：${file}（文档只应在 docs/ 下，见 docs/12-目录治理）`);
  } else {
    fail(`根目录存在未登记的 .md 文件：${file}（根目录仅允许 README.md / AGENTS.md，见 AGENTS.md §3.4 治理资产清单）`);
  }
}

// ---- 9. 治理基线文件检查（AGENTS.md §11.1）----
const baselineFiles = [
  "AGENTS.md",
  "README.md",
  "docs/00-文档索引-Index.md",
  "docs/10-开发规范-Dev-Rules.md",
  "docs/11-组件装配-Component-Assembly.md",
  "docs/12-目录治理-Directory-Governance.md",
];
for (const file of baselineFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`治理基线文件缺失：${file}`);
  }
}

// ---- 10. .pi/skills 与 .pi/prompts 完整性 ----
const skillDirs = [
  ".pi/skills/riskbench-task-complete",
  ".pi/skills/riskbench-component-assembly",
];
for (const dir of skillDirs) {
  const skillFile = path.join(root, dir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    fail(`治理 Skill 缺失：${skillFile}`);
  } else {
    const skillContent = fs.readFileSync(skillFile, "utf8");
    if (!skillContent.startsWith("---\n") || !skillContent.includes("name:")) {
      fail(`治理 Skill frontmatter 缺失：${skillFile}`);
    }
  }
}

const promptFiles = [".pi/prompts/wr.md", ".pi/prompts/plan.md"];
for (const file of promptFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`工作流模板缺失：${file}`);
  }
}

// ---- 汇总 ----
console.log("");
if (failures.length === 0) {
  console.log(`OK: 文档治理检查通过（${designDocs.length} 份设计文档 + ${skillDirs.length} 个 Skill + ${promptFiles.length} 个 prompt）`);
  if (warnings.length > 0) {
    console.log(`（${warnings.length} 条警告，不阻塞）`);
  }
  process.exit(0);
} else {
  console.error(`\n文档治理检查失败：${failures.length} 项失败`);
  process.exit(1);
}

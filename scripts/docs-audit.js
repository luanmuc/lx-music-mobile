#!/usr/bin/env node
/**
 * docs-audit.js — 文档一致性巡检（L4 定时兜底，mobile-app 定制版）
 *
 * 目的：Hook 管"当下提交"，本脚本管"历史欠账"——每日检查文档中
 * 与真实状态漂移的「确定性低风险项」（数字/版本串/commit 引用），自动对齐；
 * 语义类项（章节内容）只报告不修改。
 *
 * 用法：
 *   node scripts/docs-audit.js            # 自动修复低风险项
 *   node scripts/docs-audit.js --dry-run  # 只报告，不修改
 *
 * 修复前打印 before → after，全部为从真实文件提取的值（可复核）。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');
const report = [];
let fixed = 0;

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function write(p, s) { fs.writeFileSync(path.join(ROOT, p), s); }

function fixAll(p, re, replacer, note) {
  const s = read(p);
  const m = s.match(re);
  if (!m) { report.push(`⚠️ [${p}] 模式 ${re} 未命中，跳过`); return; }
  const before = m[0];
  const after = replacer(m);
  if (before === after) return;
  const noteStr = typeof note === 'function' ? note(before, after) : note;
  if (DRY) {
    report.push(`🟡 [${p}] ${noteStr}\n    ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  } else {
    write(p, s.replace(re, after));
    fixed++;
    report.push(`✅ [${p}] ${noteStr}\n    ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  }
}

// ── 规则 1：TS/TSX 文件数 ↔ 文档（RELEASE_SOP / DEV_SETUP）──────────────
function ruleTsCount() {
  const n = execSync(`find src -name '*.ts' -o -name '*.tsx' | wc -l`, { encoding: 'utf8', cwd: ROOT }).trim();
  for (const p of ['docs/RELEASE_SOP.md', 'docs/DEV_SETUP.md']) {
    if (!fs.existsSync(path.join(ROOT, p))) continue;
    if (p === 'docs/RELEASE_SOP.md') {
      fixAll(p, /(\d+) 个 TS\/TSX/, () => `${n} 个 TS/TSX`, (b) => `TS 文件数 ${b}→${n}`);
    } else if (p === 'docs/DEV_SETUP.md') {
      fixAll(p, /全量 TS\/TSX 语法检查（(\d+) 个文件）/, () => `全量 TS/TSX 语法检查（${n} 个文件）`, (b) => `TS 文件数 ${b}→${n}`);
    }
  }
}

// ── 规则 2：三语言键数一致（报告项，无法自动补词条）────────────────────
function ruleLangKeys() {
  try {
    const counts = {};
    for (const l of ['zh-cn', 'zh-tw', 'en-us']) {
      counts[l] = Object.keys(JSON.parse(read(`src/lang/${l}.json`))).length;
    }
    const uniq = new Set(Object.values(counts));
    if (uniq.size === 1) {
      report.push(`🟢 三语言键数一致：${counts['zh-cn']} 键`);
    } else {
      report.push(`🔴 三语言键数不一致：${JSON.stringify(counts)}（需补词条，不能自动修复）`);
    }
  } catch (e) {
    report.push(`⚠️ 三语言键数读取失败：${e.message}`);
  }
}

// ── 规则 3：底座版本 bN ↔ README「当前底座 vX.Y 至 bN」────────────────
function ruleBuildNumber() {
  try {
    const b = JSON.parse(read('publish/build-state.json'));
    const readme = read('README.md');
    const m = readme.match(/当前底座 v([\d.]+) 至 b(\d+)/);
    if (m) {
      if (m[1] !== b.baseVersion || Number(m[2]) !== b.build) {
        fixAll('README.md', /当前底座 v[\d.]+ 至 b\d+/, () => `当前底座 v${b.baseVersion} 至 b${b.build}`, (bb) => `README 底座版本 ${bb}→v${b.baseVersion}-b${b.build}`);
      } else {
        report.push(`🟢 README 底座版本一致：v${b.baseVersion} 至 b${b.build}`);
      }
    }
  } catch (e) {
    report.push(`⚠️ build-state 读取失败：${e.message}`);
  }
}

// ── 规则 4：track-player 锁定 commit ↔ UPSTREAM_LIFECYCLE ──────────────
function ruleTrackPlayer() {
  try {
    const pkg = JSON.parse(read('package.json'));
    const m = (pkg.dependencies['react-native-track-player'] || '').match(/#([0-9a-f]{7,40})/);
    if (!m) { report.push('⚠️ package.json 未找到 track-player 锁定 commit'); return; }
    const sha7 = m[1].slice(0, 7);
    const doc = 'docs/UPSTREAM_LIFECYCLE.md';
    const d = read(doc);
    const m2 = d.match(/commit `([0-9a-f]{7})`/);
    if (m2 && m2[1] !== sha7) {
      fixAll(doc, /commit `[0-9a-f]{7}`/, () => `commit \`${sha7}\``, (bb) => `track-player commit ${bb}→${sha7}`);
    } else {
      report.push(`🟢 track-player 锁定 commit 一致：${sha7}`);
    }
  } catch (e) {
    report.push(`⚠️ track-player 规则异常：${e.message}`);
  }
}

// ── 执行 ────────────────────────────────────────────────────────────────
ruleTsCount();
ruleLangKeys();
ruleBuildNumber();
ruleTrackPlayer();

console.log(`\n[L4 文档巡检·mobile] ${DRY ? 'DRY-RUN（不修改）' : '自动修复'} — ${new Date().toISOString().slice(0, 10)}\n`);
for (const r of report) console.log(r);
console.log(`\n汇总：${DRY ? '待处理' : '已修复'} ${fixed} 项 · 报告 ${report.length - fixed} 项\n`);
process.exit(0);  // 恒成功：修复/报告已落盘，workflow 以 git diff 判断是否有提交

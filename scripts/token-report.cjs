#!/usr/bin/env node
/**
 * Token-footprint report for the plugin's always-loaded context surface:
 * the YAML frontmatter of every skills/<name>/SKILL.md and agents/<name>.md
 * (what Claude Code reads for skill/agent dispatch on every session).
 *
 * Token counts are ESTIMATES: chars / 4, the common English-text heuristic.
 * No tokenizer dependency by design — the budget enforces an order of
 * magnitude, not an exact count.
 *
 * Usage:
 *   node scripts/token-report.cjs           # report only, always exit 0
 *   node scripts/token-report.cjs --check   # exit 1 if any budget exceeded
 *   node scripts/token-report.cjs [--check] [repo-root]
 */
"use strict";

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const ROOT = path.resolve(
  args.find((a) => a !== "--check") || path.join(__dirname, "..")
);

// Budgets (estimated tokens). Chosen 2026-07-12 with ~40% headroom over the
// then-largest items (largest agent ~240, largest skill ~167, total ~3.6k).
// Raising a budget is a deliberate act — do it in a PR, not by accident.
const BUDGET = {
  skill: 250, // per SKILL.md frontmatter
  agent: 350, // per agents/*.md frontmatter
  total: 5000, // whole always-loaded surface
};

const estTokens = (s) => Math.round(s.length / 4);

function frontmatter(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0].trim() !== "---") return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end === -1) return null;
  return lines.slice(1, end).join("\n");
}

function collect() {
  const rows = [];
  const skillsDir = path.join(ROOT, "skills");
  const agentsDir = path.join(ROOT, "agents");

  if (fs.existsSync(skillsDir)) {
    for (const d of fs.readdirSync(skillsDir).sort()) {
      const f = path.join(skillsDir, d, "SKILL.md");
      if (!fs.existsSync(f)) continue;
      const fm = frontmatter(fs.readFileSync(f, "utf8"));
      rows.push({
        kind: "skill",
        name: d,
        file: path.relative(ROOT, f),
        tokens: fm === null ? 0 : estTokens(fm),
        broken: fm === null,
      });
    }
  }
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir).sort()) {
      if (!f.endsWith(".md")) continue;
      const full = path.join(agentsDir, f);
      const fm = frontmatter(fs.readFileSync(full, "utf8"));
      rows.push({
        kind: "agent",
        name: f.replace(/\.md$/, ""),
        file: path.relative(ROOT, full),
        tokens: fm === null ? 0 : estTokens(fm),
        broken: fm === null,
      });
    }
  }
  return rows;
}

function main() {
  const rows = collect();
  if (rows.length === 0) {
    console.error("FAIL — no skills or agents found. Wrong repo root?");
    process.exit(1);
  }

  const violations = [];
  for (const r of rows) {
    if (r.broken) violations.push(`${r.file}: missing/unterminated frontmatter`);
    else if (r.tokens > BUDGET[r.kind]) {
      violations.push(
        `${r.file}: ~${r.tokens} tokens exceeds ${r.kind} budget ${BUDGET[r.kind]}`
      );
    }
  }
  const total = rows.reduce((s, r) => s + r.tokens, 0);
  if (total > BUDGET.total) {
    violations.push(`total: ~${total} tokens exceeds total budget ${BUDGET.total}`);
  }

  rows.sort((a, b) => b.tokens - a.tokens);
  const width = Math.max(...rows.map((r) => r.name.length));
  console.log(`Token-footprint report (estimate = chars/4) — ${ROOT}\n`);
  console.log(`  ${"name".padEnd(width)}  kind   ~tokens  budget`);
  for (const r of rows) {
    const over = r.broken || r.tokens > BUDGET[r.kind] ? "  ← OVER" : "";
    console.log(
      `  ${r.name.padEnd(width)}  ${r.kind.padEnd(5)}  ${String(r.tokens).padStart(7)}  ${BUDGET[r.kind]}${over}`
    );
  }
  console.log(
    `\n  TOTAL ~${total} tokens (budget ${BUDGET.total}) across ${rows.length} items`
  );

  if (violations.length > 0) {
    console.log(`\n${CHECK ? "FAIL" : "WARN"} — ${violations.length} over budget:`);
    for (const v of violations) console.log(`  ✗ ${v}`);
    if (CHECK) process.exit(1);
    return;
  }
  console.log("\nOK — all items within budget.");
}

main();

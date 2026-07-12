#!/usr/bin/env node
/**
 * Repo validator: lints every skills/<name>/SKILL.md against the 8-section
 * anatomy documented in README.md ("Skill anatomy"), and checks that the
 * plugin version is in sync between .claude-plugin/plugin.json and
 * .claude-plugin/marketplace.json.
 *
 * CI-runnable, zero dependencies. Exits 1 on any violation (fail loud —
 * unlike the hook scripts, this is a gate, not a convenience).
 *
 * Usage: node scripts/validate-plugin.cjs [repo-root]
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, ".."));

// Skills exempt from the 8-section anatomy (off-spine setup skills — see
// README.md "The 5-phase spine"). Frontmatter checks still apply.
const ANATOMY_EXEMPT = new Set(["init"]);

// Required ## sections, in relative order (extra sections are allowed).
const REQUIRED_SECTIONS = [
  "Overview",
  "When to Use",
  "When NOT to Use",
  "Process",
  "Rationalizations",
  "Evidence Requirements",
  "Red Flags",
  "References",
];

const REQUIRED_FRONTMATTER = ["name", "description", "user-invocable"];

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

// --- Skill checks ---------------------------------------------------------

function parseFrontmatter(file, text) {
  // Normalize CRLF so Windows-committed files don't false-fail.
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0].trim() !== "---") {
    fail(file, "missing YAML frontmatter (file must start with ---)");
    return null;
  }
  // Match the closing delimiter tolerantly (trailing whitespace), so we never
  // latch onto a later "---" horizontal rule in the body.
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end === -1) {
    fail(file, "unterminated YAML frontmatter");
    return null;
  }
  const keys = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(.*)$/); // top-level keys only
    if (m) {
      // Drop inline comments, then surrounding quotes ("x" / 'x').
      let v = m[2].replace(/\s#.*$/, "").trim();
      const q = v.match(/^(["'])(.*)\1$/);
      if (q) v = q[2];
      keys[m[1]] = v;
    }
  }
  return { keys, body: lines.slice(end + 1).join("\n") };
}

// Blank out fenced code blocks so example headings/tables inside ``` fences
// don't fool the section checks (line count is preserved).
function stripFences(body) {
  let inFence = false;
  return body
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return "";
      }
      return inFence ? "" : line;
    })
    .join("\n");
}

function checkSkill(dirName, file, text) {
  const parsed = parseFrontmatter(file, text);
  if (!parsed) return;
  const { keys } = parsed;
  const body = stripFences(parsed.body);

  for (const key of REQUIRED_FRONTMATTER) {
    if (!(key in keys)) {
      fail(file, `frontmatter missing required key "${key}"`);
    } else if (keys[key] === "" && key !== "description") {
      // description is often a folded block (`description: >`), so an empty
      // inline value is legitimate there; name/user-invocable must be inline.
      fail(file, `frontmatter key "${key}" has an empty value`);
    }
  }
  if (keys.name && keys.name !== dirName) {
    fail(file, `frontmatter name "${keys.name}" does not match directory name "${dirName}"`);
  }

  if (ANATOMY_EXEMPT.has(dirName)) return;

  const sections = [...body.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);

  // Required sections must all be present, in relative order.
  let cursor = 0;
  for (const required of REQUIRED_SECTIONS) {
    const idx = sections.indexOf(required, cursor);
    if (idx === -1) {
      if (sections.includes(required)) {
        fail(file, `section "## ${required}" is out of order (expected after "${REQUIRED_SECTIONS[REQUIRED_SECTIONS.indexOf(required) - 1] || "start"}")`);
      } else {
        fail(file, `missing required section "## ${required}"`);
      }
    } else {
      cursor = idx + 1;
    }
  }

  // Rationalizations must contain a markdown table (README requires a table
  // of excuses with rebuttals).
  const ration = body.split(/^## Rationalizations\s*$/m)[1];
  if (ration !== undefined) {
    const sectionBody = ration.split(/^## /m)[0];
    if (!/^\s*\|.+\|\s*$/m.test(sectionBody)) {
      fail(file, 'section "## Rationalizations" contains no markdown table');
    }
  }
}

// --- Version sync check ---------------------------------------------------

function checkVersionSync() {
  const pluginPath = path.join(ROOT, ".claude-plugin", "plugin.json");
  const marketPath = path.join(ROOT, ".claude-plugin", "marketplace.json");
  let plugin, market;
  try {
    plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
  } catch (e) {
    return fail(".claude-plugin/plugin.json", `unreadable or invalid JSON (${e.message})`);
  }
  try {
    market = JSON.parse(fs.readFileSync(marketPath, "utf8"));
  } catch (e) {
    return fail(".claude-plugin/marketplace.json", `unreadable or invalid JSON (${e.message})`);
  }

  if (!plugin.version || typeof plugin.version !== "string") {
    return fail(".claude-plugin/plugin.json", 'missing or empty "version"');
  }
  const entry = (market.plugins || []).find((p) => p.name === plugin.name);
  if (!entry) {
    return fail(
      ".claude-plugin/marketplace.json",
      `no plugins[] entry named "${plugin.name}" (plugin.json name)`
    );
  }
  if (entry.version !== plugin.version) {
    fail(
      ".claude-plugin/marketplace.json",
      `version "${entry.version}" out of sync with plugin.json version "${plugin.version}"`
    );
  }
}

// --- Run ------------------------------------------------------------------

function main() {
  const skillsDir = path.join(ROOT, "skills");
  let skillCount = 0;

  let dirNames = [];
  try {
    dirNames = fs.readdirSync(skillsDir).sort();
  } catch (e) {
    fail("skills/", `unreadable directory (${e.message}) — wrong repo root?`);
  }
  for (const dirName of dirNames) {
    const dir = path.join(skillsDir, dirName);
    let stat;
    try {
      stat = fs.statSync(dir); // throws on dangling symlinks
    } catch (e) {
      fail(`skills/${dirName}`, `unreadable entry (${e.message})`);
      continue;
    }
    if (!stat.isDirectory()) continue;
    const file = path.join(dir, "SKILL.md");
    const rel = path.relative(ROOT, file);
    if (!fs.existsSync(file)) {
      fail(`skills/${dirName}/`, "missing SKILL.md");
      continue;
    }
    skillCount++;
    checkSkill(dirName, rel, fs.readFileSync(file, "utf8"));
  }
  if (skillCount === 0 && errors.length === 0) {
    fail("skills/", "no skills found — wrong repo root?");
  }

  checkVersionSync();

  if (errors.length > 0) {
    console.error(`FAIL — ${errors.length} violation(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log(
    `OK — ${skillCount} skills validated (${ANATOMY_EXEMPT.size} anatomy-exempt), plugin/marketplace versions in sync.`
  );
}

main();

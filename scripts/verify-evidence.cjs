#!/usr/bin/env node
/**
 * Evidence gate: mechanically checks that an AI agent's *claimed* evidence is
 * real, rather than trusting the transcript. Two modes:
 *
 *   --citations <artifact.md>  Resolve `file:line` / `file:start-end` citations
 *                              in an evidence artifact; fail if a path is
 *                              missing, absolute/outside the repo, or the line
 *                              is out of range.
 *   --tripwires                Scan `git diff HEAD` for fake-green tampering:
 *                              deleted test files, newly skipped tests, and new
 *                              TODO/FIXME left in changed code.
 *
 * With no mode flag, runs --tripwires (citations need an artifact argument).
 *
 * This is a GATE, not a convenience hook: it fails loud.
 *   exit 0 = clean   exit 1 = violations found   exit 2 = usage / internal error
 * (Exit 2 is kept distinct from 1 so a crash can never masquerade as a
 * "violation", per scripts/test-verify-evidence.cjs.)
 *
 * Precision-first by design: it would rather miss an oddly-shaped citation or an
 * unusually-named test than cry wolf — a gate that cries wolf gets disabled. It
 * deliberately does NOT attempt deep test-tamper analysis (assertion-count
 * deltas, mutation proofs); that is out of scope for this slice.
 *
 * Zero dependencies. Usage: node scripts/verify-evidence.cjs [--citations <f>] [--tripwires]
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const USAGE =
  "Usage: node scripts/verify-evidence.cjs [--citations <artifact.md>] [--tripwires]";

// ---------------------------------------------------------------- citations
// A citation is `path:line` or `path:start-end`, backtick-optional. To avoid
// false positives from prose ("ratio 3:2", "12:30") and URLs, the path token
// must contain a "." or "/", URLs are stripped first, and a match preceded by a
// word char or ":" is rejected.
const CITATION_RE =
  /(?<![\w:])(\/?[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*):(\d+)(?:-(\d+))?(?![\d-])/g;

function findCitations(text) {
  const stripped = text.replace(/\bhttps?:\/\/\S+/gi, " ");
  const out = [];
  let m;
  CITATION_RE.lastIndex = 0;
  while ((m = CITATION_RE.exec(stripped)) !== null) {
    const p = m[1];
    if (!p.includes("/") && !p.includes(".")) continue; // not a path-like token
    out.push({
      raw: m[0],
      filePath: p,
      start: parseInt(m[2], 10),
      end: m[3] ? parseInt(m[3], 10) : parseInt(m[2], 10),
    });
  }
  return out;
}

function checkCitations(artifactArg) {
  const violations = [];
  let artifactText;
  try {
    artifactText = fs.readFileSync(artifactArg, "utf8");
  } catch {
    return { usageError: `cannot read artifact: ${artifactArg}` };
  }
  const base = fs.realpathSync(process.cwd());
  const citations = findCitations(artifactText);

  for (const c of citations) {
    if (path.isAbsolute(c.filePath)) {
      violations.push(`${c.raw} — absolute path, cannot verify against repo`);
      continue;
    }
    const full = path.resolve(base, c.filePath);
    if (!fs.existsSync(full)) {
      violations.push(`${c.raw} — cited file does not exist`);
      continue;
    }
    let realFull;
    try {
      realFull = fs.realpathSync(full);
    } catch {
      violations.push(`${c.raw} — cited file does not exist`);
      continue;
    }
    if (realFull !== base && !realFull.startsWith(base + path.sep)) {
      violations.push(`${c.raw} — resolves outside the repository`);
      continue;
    }
    let stat;
    try {
      stat = fs.statSync(realFull);
    } catch {
      violations.push(`${c.raw} — cited file does not exist`);
      continue;
    }
    if (!stat.isFile()) {
      violations.push(`${c.raw} — citation does not point at a file`);
      continue;
    }
    const lineCount = fs.readFileSync(realFull, "utf8").split("\n").length;
    if (c.start < 1 || c.end < c.start || c.end > lineCount) {
      violations.push(
        `${c.raw} — line out of range (file has ${lineCount} lines)`
      );
    }
  }
  return { violations, checked: citations.length };
}

// ---------------------------------------------------------------- tripwires
function isTestFile(p) {
  const f = p.toLowerCase();
  return (
    /(^|\/)tests?\//.test(f) ||
    /(^|\/)__tests__\//.test(f) ||
    /\.(test|spec)\.[a-z0-9]+$/.test(f) ||
    /(^|\/)test_[^/]*\.py$/.test(f) ||
    /_test\.py$/.test(f)
  );
}

const SKIP_PATTERNS = [
  { name: "skipped test (.skip)", re: /\.skip\s*\(/ },
  { name: "skipped test (xit/xdescribe/xtest)", re: /\bx(it|describe|test)\s*\(/ },
  { name: "skipped test (@pytest.mark.skip)", re: /@pytest\.mark\.skip/ },
  { name: "skipped test (@unittest.skip)", re: /@unittest\.skip/ },
];
const MARKER_RE = /\b(TODO|FIXME)\b/;

function getDiff() {
  const override = process.env.VERIFY_EVIDENCE_DIFF_FILE;
  if (override) {
    try {
      return { text: fs.readFileSync(override, "utf8") };
    } catch {
      return { unavailable: `cannot read VERIFY_EVIDENCE_DIFF_FILE: ${override}` };
    }
  }
  const r = spawnSync("git", ["diff", "HEAD"], { encoding: "utf8", timeout: 10000 });
  if (r.error || r.status !== 0) {
    return { unavailable: "git diff HEAD unavailable (not a git repo?)" };
  }
  return { text: r.stdout || "" };
}

function checkTripwires() {
  const diff = getDiff();
  if (diff.unavailable) return { skipped: diff.unavailable };

  const violations = [];
  const lines = diff.text.split("\n");
  let aPath = null;
  let bPath = null;
  let curFile = null;
  let newLineNo = 0;

  const stripPrefix = (s) =>
    s === "/dev/null" ? "/dev/null" : s.replace(/^[ab]\//, "");

  for (const line of lines) {
    if (line.startsWith("--- ")) {
      aPath = stripPrefix(line.slice(4).trim());
      continue;
    }
    if (line.startsWith("+++ ")) {
      bPath = stripPrefix(line.slice(4).trim());
      curFile = bPath === "/dev/null" ? aPath : bPath;
      // A file whose new side is /dev/null was deleted.
      if (bPath === "/dev/null" && aPath && isTestFile(aPath)) {
        violations.push(`deleted test file: ${aPath}`);
      }
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      newLineNo = parseInt(hunk[1], 10);
      continue;
    }
    if (line.startsWith("+++")) continue;
    if (line.startsWith("+")) {
      const content = line.slice(1);
      const loc = curFile ? `${curFile}:${newLineNo}` : "(unknown)";
      for (const s of SKIP_PATTERNS) {
        if (s.re.test(content)) violations.push(`${s.name} added at ${loc}`);
      }
      if (MARKER_RE.test(content)) {
        violations.push(`TODO/FIXME added at ${loc}: ${content.trim()}`);
      }
      newLineNo++;
      continue;
    }
    if (line.startsWith(" ")) {
      newLineNo++;
      continue;
    }
    // "-" lines and metadata: no new-side advance
  }
  return { violations };
}

// ---------------------------------------------------------------- main
function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }

  let artifact = null;
  let doCitations = false;
  let doTripwires = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--citations") {
      doCitations = true;
      artifact = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : null;
    } else if (argv[i] === "--tripwires") {
      doTripwires = true;
    } else {
      console.error(`Unknown argument: ${argv[i]}\n${USAGE}`);
      return 2;
    }
  }
  // Default: no mode flag → tripwires (citations require an artifact arg).
  if (!doCitations && !doTripwires) doTripwires = true;

  const findings = [];
  let anyViolation = false;

  if (doCitations) {
    if (!artifact) {
      console.error(`--citations requires an artifact path\n${USAGE}`);
      return 2;
    }
    const res = checkCitations(artifact);
    if (res.usageError) {
      console.error(res.usageError);
      return 2;
    }
    if (res.violations.length) {
      anyViolation = true;
      findings.push(
        `citations: ${res.violations.length} unresolved of ${res.checked} checked`
      );
      for (const v of res.violations) findings.push(`  ✗ ${v}`);
    } else {
      findings.push(`citations: ${res.checked} checked, all resolve`);
    }
  }

  if (doTripwires) {
    const res = checkTripwires();
    if (res.skipped) {
      findings.push(`tripwires: skipped — ${res.skipped}`);
    } else if (res.violations.length) {
      anyViolation = true;
      findings.push(`tripwires: ${res.violations.length} found`);
      for (const v of res.violations) findings.push(`  ✗ ${v}`);
    } else {
      findings.push(`tripwires: none`);
    }
  }

  const out = findings.join("\n");
  if (anyViolation) {
    console.error(out);
    console.error("\nFAIL — evidence gate found unverifiable claims.");
    return 1;
  }
  console.log(out);
  console.log("\nOK — evidence gate passed.");
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  // Internal error is exit 2, never 1 — a crash must not read as a violation.
  console.error(`verify-evidence: internal error: ${err && err.message}`);
  process.exit(2);
}

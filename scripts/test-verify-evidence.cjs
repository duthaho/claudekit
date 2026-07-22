#!/usr/bin/env node
/**
 * Test runner for verify-evidence.cjs (the evidence gate) and its fail-open
 * hook wrapper verify-evidence-hook.cjs. Zero dependencies, no framework:
 * builds hermetic fixtures in a temp dir, spawns the scripts, asserts exit
 * codes. Exit 0 when every case passes, 1 otherwise. A missing script or
 * spawn error counts as that case's FAIL — the run never aborts.
 *
 * Mirrors scripts/test-hooks.cjs conventions.
 *
 * Usage: node scripts/test-verify-evidence.cjs
 */
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const GATE = path.join(__dirname, "verify-evidence.cjs");
const HOOK = path.join(__dirname, "verify-evidence-hook.cjs");

let pass = 0;
let fail = 0;
const tmpRoots = [];

function mkTmp() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "vee-"));
  tmpRoots.push(d);
  return d;
}

function runGate(args, { cwd, diffFile, env } = {}) {
  const e = { ...process.env, ...env };
  if (diffFile) e.VERIFY_EVIDENCE_DIFF_FILE = diffFile;
  return spawnSync(process.execPath, [GATE, ...args], {
    cwd: cwd || process.cwd(),
    env: e,
    encoding: "utf8",
    timeout: 10000,
  });
}

function runHook(stdin, { diffFile } = {}) {
  const e = { ...process.env };
  if (diffFile) e.VERIFY_EVIDENCE_DIFF_FILE = diffFile;
  return spawnSync(process.execPath, [HOOK], {
    input: stdin,
    env: e,
    encoding: "utf8",
    timeout: 10000,
  });
}

function check(name, result, expected) {
  let status = null;
  let err = "";
  if (result.error) err = result.error.message;
  else status = result.status;
  const ok = !err && status === expected;
  if (ok) {
    pass++;
    console.log(`  ✓ ${name} (exit ${status})`);
  } else {
    fail++;
    console.log(`  ✗ ${name} — expected exit ${expected}, got ${err || `exit ${status}`}`);
  }
}

// ---- helpers to build fixtures ----
function citationDir(artifactBody, realFileLines) {
  const dir = mkTmp();
  if (realFileLines != null) {
    fs.writeFileSync(path.join(dir, "real.js"), realFileLines.join("\n") + "\n");
  }
  fs.writeFileSync(path.join(dir, "artifact.md"), artifactBody);
  return dir;
}

function diffFileWith(body) {
  const dir = mkTmp();
  const f = path.join(dir, "captured.diff");
  fs.writeFileSync(f, body);
  return f;
}

// A minimal unified-diff builder.
function diffAdd(filePath, addedLines) {
  return (
    `diff --git a/${filePath} b/${filePath}\n` +
    `index 111..222 100644\n` +
    `--- a/${filePath}\n` +
    `+++ b/${filePath}\n` +
    `@@ -1,1 +1,${addedLines.length + 1} @@\n` +
    ` context\n` +
    addedLines.map((l) => `+${l}`).join("\n") +
    "\n"
  );
}

function diffDelete(filePath) {
  return (
    `diff --git a/${filePath} b/${filePath}\n` +
    `deleted file mode 100644\n` +
    `index 111..000\n` +
    `--- a/${filePath}\n` +
    `+++ /dev/null\n` +
    `@@ -1,2 +0,0 @@\n` +
    `-test('x', () => {});\n` +
    `-test('y', () => {});\n`
  );
}

function diffRename(fromPath, toPath) {
  return (
    `diff --git a/${fromPath} b/${toPath}\n` +
    `similarity index 100%\n` +
    `rename from ${fromPath}\n` +
    `rename to ${toPath}\n`
  );
}

const diffConcat = (...parts) => parts.join("");

// ---- rerun helpers ----
// A fake test runner: a node script that prints a summary line and exits with a
// chosen code, so claim-vs-actual comparison is fully hermetic.
function fakeRunner(summaryLine, code) {
  const dir = mkTmp();
  const f = path.join(dir, "runner.cjs");
  fs.writeFileSync(
    f,
    `process.stdout.write(${JSON.stringify(summaryLine + "\n")});\n` +
      `process.exit(${code});\n`
  );
  return `${JSON.stringify(process.execPath)} ${JSON.stringify(f)}`;
}
function claimArtifact(body) {
  const dir = mkTmp();
  const f = path.join(dir, "claim.md");
  fs.writeFileSync(f, body);
  return f;
}
function npmProjectDir(testScript) {
  const dir = mkTmp();
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "x", scripts: { test: testScript } })
  );
  return dir;
}
function pytestDir() {
  const dir = mkTmp();
  fs.writeFileSync(path.join(dir, "pytest.ini"), "[pytest]\n");
  return dir;
}

// ============ CITATION CASES ============
console.log("\nverify-evidence.cjs --citations");
{
  const real = ["line one", "line two", "line three"];

  check(
    "valid single-line citation",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir("Root caused in `real.js:2` per the trace.", real),
    }),
    0
  );

  check(
    "valid range citation",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir("See real.js:1-3 for the fix.", real),
    }),
    0
  );

  check(
    "out-of-range line",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir("Broken at real.js:999.", real),
    }),
    1
  );

  check(
    "missing file",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir("See gone.js:1 for detail.", real),
    }),
    1
  );

  check(
    "absolute path citation is a violation",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir("Config at /etc/hosts:1 shows it.", real),
    }),
    1
  );

  check(
    "prose colons and URLs are not citations",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir(
        "The ratio was 3:2 and we hit http://example.com:8080 at 12:30.",
        real
      ),
    }),
    0
  );

  check(
    "decimal-colon prose (3.5:2) is not a citation",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir("Throughput rose 3.5:2 over baseline, and 18.04:30 held.", real),
    }),
    0
  );

  check(
    "last-line+1 on a newline-terminated file is out of range",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir("See real.js:2 for the change.", ["only one line"]),
    }),
    1
  );

  check(
    "no citations at all",
    runGate(["--citations", "artifact.md"], {
      cwd: citationDir("Just prose, nothing to resolve.", real),
    }),
    0
  );
}

// ============ TRIPWIRE CASES ============
console.log("\nverify-evidence.cjs --tripwires");
{
  check(
    "added .skip in a test file",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffAdd("src/app.test.js", ["it.skip('later', () => {});"])) }),
    1
  );
  check(
    "added xit in a spec file",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffAdd("src/app.spec.js", ["xit('later', () => {});"])) }),
    1
  );
  check(
    "added @pytest.mark.skip",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffAdd("tests/test_app.py", ["@pytest.mark.skip(reason='x')"])) }),
    1
  );
  check(
    "added @unittest.skip",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffAdd("tests/test_app.py", ["@unittest.skip('x')"])) }),
    1
  );
  check(
    "added TODO in changed code",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffAdd("src/app.js", ["// TODO: implement for real"])) }),
    1
  );
  check(
    "added FIXME in changed code",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffAdd("src/app.js", ["# FIXME later"])) }),
    1
  );
  check(
    "deleted test file",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffDelete("tests/test_app.py")) }),
    1
  );
  check(
    "test renamed to another test path is fine",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffRename("tests/test_old.py", "tests/test_new.py")) }),
    0
  );
  check(
    "test renamed OUT of the suite is a violation",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffRename("tests/test_app.py", "src/app.py")) }),
    1
  );
  check(
    "added bare @skip decorator",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffAdd("tests/test_app.py", ["@skip"])) }),
    1
  );
  check(
    "multi-file diff: clean file then skip in a later file, attributed correctly",
    runGate(["--tripwires"], {
      diffFile: diffFileWith(
        diffConcat(
          diffAdd("src/util.js", ["const y = 2;"]),
          diffAdd("src/util.test.js", ["it.skip('later', () => {});"])
        )
      ),
    }),
    1
  );
  check(
    "multi-file diff: deleted non-test then clean adds does not false-flag",
    runGate(["--tripwires"], {
      diffFile: diffFileWith(diffConcat(diffDelete("src/legacy.js"), diffAdd("src/new.js", ["const z = 3;"]))),
    }),
    0
  );
  check(
    "clean diff of normal code",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffAdd("src/app.js", ["const x = 1;", "return x;"])) }),
    0
  );
  check(
    "empty diff",
    runGate(["--tripwires"], { diffFile: diffFileWith("") }),
    0
  );
  check(
    "deleting a NON-test file is fine",
    runGate(["--tripwires"], { diffFile: diffFileWith(diffDelete("src/legacy.js")) }),
    0
  );
  check(
    "no git and no diff file -> skipped, not a failure",
    runGate(["--tripwires"], { cwd: mkTmp() }),
    0
  );
}

// ============ COMBINED / NO-FLAG / HELP ============
console.log("\nverify-evidence.cjs combined & meta");
{
  const dir = citationDir("Broken at real.js:999.", ["a", "b"]);
  check(
    "combined: bad citation + skip tripwire -> exit 1",
    runGate(["--citations", "artifact.md", "--tripwires"], {
      cwd: dir,
      diffFile: diffFileWith(diffAdd("a.test.js", ["it.skip('x', () => {})"])),
    }),
    1
  );
  check(
    "no flags runs tripwires (clean diff) -> exit 0",
    runGate([], { cwd: mkTmp(), diffFile: diffFileWith("") }),
    0
  );
  check("--help exits 0", runGate(["--help"]), 0);
}

// ============ HOOK (fail-open) ============
console.log("\nverify-evidence-hook.cjs (always exit 0)");
{
  const stop = JSON.stringify({ hook_event_name: "Stop" });
  check("valid stop event, clean diff", runHook(stop, { diffFile: diffFileWith("") }), 0);
  check(
    "violation present -> hook still exits 0 (advisory)",
    runHook(stop, { diffFile: diffFileWith(diffAdd("a.test.js", ["it.skip('x', () => {})"])) }),
    0
  );
  check("malformed stdin -> exit 0", runHook("{not json", {}), 0);
  check("empty stdin -> exit 0", runHook("", {}), 0);
}

// ============ RERUN CASES ============
console.log("\nverify-evidence.cjs --rerun");
{
  // AC1 — claim matches a passing run with matching counts.
  check(
    "claim pass + counts match a passing run",
    runGate(["--rerun", claimArtifact("Verified: 42 passed, 0 failed."), "--cmd", fakeRunner("42 passed, 0 failed", 0)]),
    0
  );
  // AC2 — claimed pass but the run fails (non-zero exit).
  check(
    "claimed pass but suite fails (exit 1)",
    runGate(["--rerun", claimArtifact("All tests pass."), "--cmd", fakeRunner("1 failed, 41 passed", 1)]),
    1
  );
  // AC3 — claimed count differs from actual passed count.
  check(
    "claimed 42 passed but actual reports 12",
    runGate(["--rerun", claimArtifact("Verified: 42 passed, 0 failed."), "--cmd", fakeRunner("12 passed, 0 failed", 0)]),
    1
  );
  // AC4 — no parseable claim in the artifact.
  check(
    "artifact has no test claim -> nothing to verify",
    runGate(["--rerun", claimArtifact("Refactored the parser; see notes."), "--cmd", fakeRunner("5 passed, 0 failed", 0)]),
    0
  );
  // AC5 — no --cmd and no detectable command -> cannot verify (exit 2).
  check(
    "no --cmd and no detectable command -> exit 2",
    runGate(["--rerun", claimArtifact("42 passed, 0 failed.")], { cwd: mkTmp() }),
    2
  );
  // A7 — claimed FAIL but the suite actually passes -> mismatch.
  check(
    "claimed failures but suite passes -> violation",
    runGate(["--rerun", claimArtifact("Result: 3 failed, 39 passed."), "--cmd", fakeRunner("42 passed, 0 failed", 0)]),
    1
  );
  // A2 — timeout / non-zero labelled "timed out" is treated as a failed run.
  check(
    "claimed pass but runner exits non-zero with no counts -> violation",
    runGate(["--rerun", claimArtifact("Suite green."), "--cmd", fakeRunner("boom", 2)]),
    1
  );
  // A3/R2 — framework summary parsed, prose does not false-match generic.
  check(
    "jest-style actual summary compared to jest-style claim",
    runGate(["--rerun", claimArtifact("Tests: 0 failed, 42 passed"), "--cmd", fakeRunner("Tests: 0 failed, 42 passed", 0)]),
    0
  );
  check(
    "prose 'passed the review' is not a test claim",
    runGate(["--rerun", claimArtifact("The change passed the review with flying colors."), "--cmd", fakeRunner("7 passed, 0 failed", 0)]),
    0
  );
}

// ============ DETECT-ONLY CASES ============
console.log("\nverify-evidence.cjs --detect-only");
{
  check(
    "npm project (scripts.test) -> detects, exit 0",
    runGate(["--detect-only"], { cwd: npmProjectDir("jest") }),
    0
  );
  check(
    "pytest.ini marker -> detects, exit 0",
    runGate(["--detect-only"], { cwd: pytestDir() }),
    0
  );
  check(
    "bare dir (no markers) -> none detected, exit 2",
    runGate(["--detect-only"], { cwd: mkTmp() }),
    2
  );
}

// ============ RERUN CLI VALIDATION (R6) ============
console.log("\nverify-evidence.cjs --rerun CLI validation");
{
  check(
    "--cmd without --rerun -> exit 2",
    runGate(["--cmd", "echo hi"]),
    2
  );
  check(
    "--rerun with no artifact value -> exit 2",
    runGate(["--rerun"]),
    2
  );
  check(
    "--rerun with unreadable artifact -> exit 2",
    runGate(["--rerun", "/no/such/artifact.md", "--cmd", fakeRunner("1 passed, 0 failed", 0)]),
    2
  );
  // aggregation: a citation violation AND a rerun run together still exit 1.
  {
    const dir = citationDir("Broken at real.js:999.", ["a", "b"]);
    check(
      "citation violation + clean rerun aggregate -> exit 1",
      runGate([
        "--citations", path.join(dir, "artifact.md"),
        "--rerun", claimArtifact("42 passed, 0 failed."),
        "--cmd", fakeRunner("42 passed, 0 failed", 0),
      ]),
      1
    );
  }
  check(
    "no-flag default still runs tripwires only (unchanged)",
    runGate([], { cwd: mkTmp(), diffFile: diffFileWith("") }),
    0
  );
}

// ---- cleanup ----
for (const d of tmpRoots) {
  try {
    fs.rmSync(d, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

console.log(`\n${fail === 0 ? "OK" : "FAIL"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

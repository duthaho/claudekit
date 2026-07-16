#!/usr/bin/env node
/**
 * Test runner for the PreToolUse hook scripts: pipes PreToolUse-shaped JSON
 * fixtures into each hook and asserts the exit code (0 = allow, 2 = block).
 * Zero dependencies. Exit 0 when every case passes, 1 otherwise.
 * A missing hook script or spawn error counts as that case's FAIL — the run
 * never aborts.
 *
 * Usage: node scripts/test-hooks.cjs
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const write = (content, file_path = "src/app.js") => ({
  tool_name: "Write",
  tool_input: { file_path, content },
});
const edit = (new_string, file_path = "src/app.js", old_string = "old") => ({
  tool_name: "Edit",
  tool_input: { file_path, old_string, new_string },
});
// Fixture secrets are synthetic (right shape, fake values).
const FAKE = {
  aws: "AKIA" + "ABCDEFGHIJKLMNOP",
  github: "ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8",
  slack: "xoxb-" + "123456789012-1234567890123-abcdefghijklmnopqrstuvwx",
  google: "AIza" + "SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6q",
  stripe: "sk_live_" + "a1B2c3D4e5F6g7H8i9J0k1L2",
  npm: "npm_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8",
  anthropic: "sk-ant-" + "api03-a1B2c3D4e5F6g7H8i9J0k1L2",
  openai: "sk-proj-" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6",
  pem: "-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----",
};

const CASES = {
  "detect-secrets.cjs": [
    // block — one per pattern family
    ["AWS key in Write content", write(`const k = "${FAKE.aws}";`), 2],
    ["GitHub token in Edit new_string", edit(`token: "${FAKE.github}"`), 2],
    ["Slack token", write(`SLACK=${FAKE.slack}`), 2],
    ["Google API key", write(`key=${FAKE.google}`), 2],
    ["Stripe live key", write(`stripe: "${FAKE.stripe}"`), 2],
    ["npm token", write(`//registry.npmjs.org/:_authToken=${FAKE.npm}`), 2],
    ["Anthropic key", write(`ANTHROPIC_API_KEY=${FAKE.anthropic}`), 2],
    ["OpenAI project key", write(`OPENAI_API_KEY=${FAKE.openai}`), 2],
    ["private key block", write(FAKE.pem), 2],
    // allow
    ["clean code", write("const x = 1;\nmodule.exports = x;"), 0],
    ["prose mentioning the word secret", write("Keep your secret keys in a vault."), 0],
    ["empty content", write(""), 0],
    ["clean Edit with both strings", edit("const y = 2;"), 0],
    ["non-string content", { tool_name: "Write", tool_input: { file_path: "a.js", content: 42 } }, 0],
    ["malformed stdin", "{not json", 0],
    ["empty stdin", "", 0],
  ],
  "guard-sensitive-files.cjs": [
    // block
    [".env", write("X=1", ".env"), 2],
    [".env.production", write("X=1", ".env.production"), 2],
    [".env.local via Edit", edit("X=1", ".env.local"), 2],
    ["nested config/.env", write("X=1", "config/.env"), 2],
    ["server.pem", write("cert", "server.pem"), 2],
    ["keys/signing.key", write("key", "keys/signing.key"), 2],
    ["id_rsa", write("key", "id_rsa"), 2],
    [".ssh/id_ed25519", write("key", ".ssh/id_ed25519"), 2],
    [".npmrc", write("token", ".npmrc"), 2],
    [".netrc", write("login", ".netrc"), 2],
    [".aws/credentials", write("id", ".aws/credentials"), 2],
    [".git-credentials", write("url", ".git-credentials"), 2],
    ["Windows path to .env", write("X=1", "C:\\proj\\.env"), 2],
    // allow
    [".env.example", write("X=", ".env.example"), 0],
    [".env.sample", write("X=", ".env.sample"), 0],
    [".env.template", write("X=", ".env.template"), 0],
    ["ordinary source file", write("code", "src/app.js"), 0],
    ["envy.js (no substring match)", write("code", "envy.js"), 0],
    ["monkey.js (no .key suffix match)", write("code", "monkey.js"), 0],
    ["missing file_path", { tool_name: "Write", tool_input: { content: "x" } }, 0],
    ["malformed stdin", "{not json", 0],
  ],
};

let pass = 0;
let fail = 0;
for (const [script, cases] of Object.entries(CASES)) {
  console.log(`\n${script}`);
  const scriptPath = path.join(__dirname, script);
  for (const [name, fixture, expected] of cases) {
    const input = typeof fixture === "string" ? fixture : JSON.stringify(fixture);
    let status = null;
    let err = "";
    try {
      const r = spawnSync(process.execPath, [scriptPath], { input, timeout: 10000 });
      if (r.error) err = r.error.message;
      else status = r.status;
    } catch (e) {
      err = e.message;
    }
    const ok = !err && status === expected;
    if (ok) {
      pass++;
      console.log(`  ✓ ${name} (exit ${status})`);
    } else {
      fail++;
      console.log(`  ✗ ${name} — expected exit ${expected}, got ${err || `exit ${status}`}`);
    }
  }
}
console.log(`\n${fail === 0 ? "OK" : "FAIL"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

#!/usr/bin/env node
/**
 * PreToolUse hook (matcher: Write|Edit): blocks edits to sensitive files —
 * env files, private key material, credential dotfiles.
 * Exit 0 = allow, Exit 2 = block.
 * Fails open on errors (exit 0) so a hook bug never stalls the session.
 *
 * Template env files (.env.example / .env.sample / .env.template) stay
 * editable — they exist to be written.
 */
"use strict";

const ALLOWED = [/\.env\.(example|sample|template)$/i];

const SENSITIVE_PATTERNS = [
  { name: "env file", re: /(^|\/)\.env(\.[^/]+)?$/i },
  { name: "key material", re: /\.(pem|key|p12|pfx)$/i },
  { name: "SSH private key", re: /(^|\/)id_(rsa|ed25519|ecdsa|dsa)[^/]*$/ },
  { name: "credential file", re: /(^|\/)\.(netrc|npmrc|git-credentials)$/ },
  { name: "AWS credentials", re: /(^|\/)\.aws\/credentials$/ },
];

async function main() {
  try {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    const input = JSON.parse(data);

    const raw = input?.tool_input?.file_path ?? "";
    // Normalize Windows separators so path-anchored patterns hold.
    const filePath = (typeof raw === "string" ? raw : "").replace(/\\/g, "/");
    if (!filePath) process.exit(0);

    if (ALLOWED.some((re) => re.test(filePath))) process.exit(0);

    for (const { name, re } of SENSITIVE_PATTERNS) {
      if (re.test(filePath)) {
        console.error(
          `BLOCKED: "${filePath}" is a ${name} — edit it manually, outside the agent session.`
        );
        process.exit(2);
      }
    }

    process.exit(0);
  } catch {
    // Fail open — never block on hook errors
    process.exit(0);
  }
}

main();

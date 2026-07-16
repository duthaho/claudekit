#!/usr/bin/env node
/**
 * PreToolUse hook (matcher: Write|Edit): blocks writes that contain
 * secret-looking material — API keys, tokens, private key blocks.
 * Exit 0 = allow, Exit 2 = block.
 * Fails open on errors (exit 0) so a hook bug never stalls the session.
 *
 * Patterns are precision-first (known key prefixes only, no entropy
 * heuristics): a blocking hook that cries wolf gets disabled. Extend the
 * list below for your org's token formats.
 */
"use strict";

const SECRET_PATTERNS = [
  { name: "AWS access key", re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{40,})\b/ },
  { name: "Slack token", re: /\bxox[a-z]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/ },
  { name: "Stripe live key", re: /\b[sr]k_live_[0-9a-zA-Z]{16,}\b/ },
  { name: "npm token", re: /\bnpm_[A-Za-z0-9]{30,}\b/ },
  { name: "Anthropic API key", re: /\bsk-ant-[A-Za-z0-9_-]{16,}\b/ },
  { name: "OpenAI API key", re: /\bsk-(proj-[A-Za-z0-9_-]{16,}|[A-Za-z0-9]{32,})\b/ },
  { name: "private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY( BLOCK)?-----/ },
];

async function main() {
  try {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    const input = JSON.parse(data);

    const raw =
      input?.tool_input?.content ?? input?.tool_input?.new_string ?? "";
    const text = typeof raw === "string" ? raw : "";

    for (const { name, re } of SECRET_PATTERNS) {
      if (re.test(text)) {
        // Name the family only — never echo the matched secret.
        console.error(
          `BLOCKED: content appears to contain a ${name}. Use an environment variable or secret manager instead.`
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

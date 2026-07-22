#!/usr/bin/env node
/**
 * Fail-open hook wrapper around the evidence gate (scripts/verify-evidence.cjs).
 * Intended for a Stop / PostToolUse hook: after the agent claims work is done,
 * run the tripwire scan and surface any fake-green findings as ADVISORY output
 * — it never blocks and never exits non-zero on its own errors.
 *
 * Fails open (exit 0 always), per the repo's hook convention
 * (see scripts/auto-format.cjs, scripts/detect-secrets.cjs). The loud,
 * blocking enforcement lives in verify-evidence.cjs run as a CI gate; this
 * wrapper is the low-friction in-session nudge.
 */
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

async function main() {
  try {
    // Drain stdin (hook payload); content is not needed for the diff scan.
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    try {
      JSON.parse(data);
    } catch {
      // Malformed / empty payload is fine — this hook fires opportunistically.
    }

    const gate = path.join(__dirname, "verify-evidence.cjs");
    const r = spawnSync(process.execPath, [gate, "--tripwires"], {
      encoding: "utf8",
      timeout: 10000,
    });

    // Exit 1 from the gate means tripwires were found — surface them, advisory.
    if (r.status === 1 && (r.stderr || r.stdout)) {
      console.error("[evidence] fake-green tripwires detected (advisory):");
      console.error(r.stderr || r.stdout);
    }
  } catch {
    // Fail open — a hook bug must never stall or block the session.
  }
  process.exit(0);
}

main();

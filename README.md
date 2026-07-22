# Claude Kit

A **verification-first engineering toolkit** for Claude Code. Built for senior ICs and tech leads who already know how to ship production code — and want a workflow that keeps the discipline tight without getting in the way.

15 skills, 8 agents, one philosophy: **every claim has evidence.** No `tests pass — trust me`. No `it works in my IDE`. No `I think the cache is stale`. Skills produce artifacts you could paste into a code review.

## What makes claudekit different

- **Rationalizations tables** in every skill. The excuses an engineer makes to skip a step ("I see the problem, let me just patch it") are documented in the skill itself, with rebuttals. The skill refuses to be skipped silently.
- **Evidence requirements** at every checkpoint. Each phase produces a specific artifact. If the artifact doesn't exist, the phase wasn't completed.
- **Pre-completion gates.** `verification-gate` runs before any "done" claim — runs the tests, checks the negative path, exercises the change in a non-IDE environment, cross-checks the original ask.
- **No founder voice.** No "ambitious vision," no "10x outcomes," no "delight." Engineering analogies, real file paths, real commands.
- **Plan-review pipeline as the headline.** Two parallel reviewers (architecture + experience) score 5 sub-dimensions each, consolidate into one fix gate. Catches structural issues before code.

## Install

```
/plugin marketplace add duthaho/claudekit-marketplace
/plugin install claudekit
/claudekit:init
```

`/claudekit:init` interactively scaffolds rules, hooks, and MCP server configs into your project's `.claude/` directory. Output styles ship with the plugin and are auto-discovered by Claude Code (no init step required).

## The 5-phase spine

| Phase | Skills | What's enforced |
|---|---|---|
| **Investigate** | `investigate-root-cause`, `map-codebase`, `audit-dependencies` | Every claim about the system has a `<file:line>` citation. No memory-based assertions. |
| **Design** | `shape-spec`, `write-plan`, `plan-review`, `plan-review-architecture`, `plan-review-experience` | Plans have file paths, exact test commands, falsifiable acceptance criteria, named rollbacks. Reviewed before implementation. |
| **Implement** | `test-first`, `incremental-shipping` | Red-green-refactor with pasted runner output. Vertical slices behind feature flags. Refactors prove behavior preservation with test/perf deltas. |
| **Verify** | `verification-gate`, `evidence-driven-debugging` | Mandatory pre-completion gate. Active debugging keeps a paper trail. |
| **Ship** | `code-review-loop`, `release-and-changelog` | Reviewable PRs with verification evidence pasted. Atomic releases with diff-built changelogs. |
| **Setup** *(off-spine)* | `init` | One-time scaffolding wizard for project-level config. |

All 15 skills are user-invocable as `/claudekit:<name>`.

## Output styles (5)

Five Claude Code [output styles](https://docs.claude.com/en/docs/claude-code/output-styles) ship with the plugin. They're auto-discovered by Claude Code — no init step required. Switch via `/config` or by setting `outputStyle` in `.claude/settings.local.json`.

| Style | When to use |
|---|---|
| **Brainstorm** | Creative exploration — divergent thinking, multiple alternatives, structured trade-offs before any code |
| **Deep Research** | Thorough investigation — completeness over speed, evidence-cited findings with confidence levels |
| **Implementation** | Code-focused execution — minimal prose, action-oriented updates, follow established patterns |
| **Review** | Critical analysis — find issues first, severity-tagged findings, actionable suggestions |
| **Token Efficient** | Compressed output — minimal prose, code-first, no preambles |

All styles use `keep-coding-instructions: true`, so Claude's default coding/testing/verification discipline still applies underneath.

## The 8-agent roster

Each agent has a single dispatcher and a clear job. No agent-bloat.

| Agent | Job | Dispatched by |
|---|---|---|
| `claudekit:planner` | Decompose specs into executable plans | `write-plan` |
| `claudekit:architect` | Score architecture dimension of a plan | `plan-review-architecture` |
| `claudekit:experience-reviewer` | Score UX + DX dimension of a plan | `plan-review-experience` |
| `claudekit:investigator` | Root-cause investigation with evidence chain | `investigate-root-cause`, `evidence-driven-debugging` |
| `claudekit:tester` | Design and write tests with red-green discipline | `test-first` |
| `claudekit:code-reviewer` | Pre-merge structural review of diffs | `code-review-loop` |
| `claudekit:security-auditor` | OWASP-aligned review of sensitive paths | `code-review-loop` (sensitive paths) |
| `claudekit:scout` | Codebase mapping and dependency audits | `map-codebase`, `audit-dependencies` |

## What `/claudekit:init` configures

| Category | What | Location |
|---|---|---|
| **Rules** | API, frontend, migrations, security, testing | `.claude/rules/` |
| **Hooks** | auto-format, block-dangerous-commands, detect-secrets, guard-sensitive-files, notifications | `.claude/hooks/` + `settings.local.json` |
| **MCP Servers** | Context7, Sequential, Playwright, Memory, Filesystem | `.mcp.json` |

Output styles ship with the plugin (in `output-styles/`) and are auto-discovered by Claude Code; no init step needed.

## Skill anatomy

Every claudekit skill has 8 required sections:

1. **Frontmatter** — name, user-invocable, description with trigger keywords.
2. **Overview** — one paragraph: what the skill does, who for, what's enforced.
3. **When to Use / When NOT to Use** — concrete trigger conditions.
4. **Process** — numbered phases or steps with explicit Goal / Inputs / Actions / Output.
5. **Rationalizations** — table of excuses with verbatim quotes, steelmanned reasoning, named failure modes, concrete alternatives.
6. **Evidence Requirements** — what artifact each checkpoint must produce, with the lazy version it rejects.
7. **Red Flags** — concrete observations that mean STOP and reassess.
8. **References** — cited works (Software Engineering at Google, A Philosophy of Software Design, The Pragmatic Programmer, etc.) where directly relevant.

## Workflow chains

Pick the chain that matches your task. Each one ends at a real stopping point — not every project needs every step.

### New feature
*"There's a request. No code yet."*

```
shape-spec → write-plan → plan-review → [test-first + incremental-shipping] → verification-gate → code-review-loop
```

`test-first` and `incremental-shipping` are paired, not sequential — every task goes through red-green-refactor while the whole slice ships behind a feature flag. For library, plugin, or CLI work that ships a tagged version, append `→ release-and-changelog`.

### Bug fix
*"Something is broken. Fix the cause, not the symptom."*

```
investigate-root-cause → test-first (regression test) → verification-gate → code-review-loop
```

`evidence-driven-debugging` activates inside Phase 3 of `investigate-root-cause` when you need runtime instrumentation (logs, breakpoints, probes) to test the hypothesis.

### Refactor
*"Improve structure. Preserve behavior. Prove preservation."*

```
map-codebase → incremental-shipping (refactor-with-evidence section) → verification-gate → code-review-loop
```

The refactor-with-evidence section requires before/after test deltas (and perf numbers if perf-sensitive). That's the whole discipline — no behavior-preservation claim without measured proof.

### Codebase exploration
*"How does X work? What calls Y? What's the blast radius?"*

```
map-codebase
```

Standalone. Output is an evidence-cited map you can attach to a plan or hand to a teammate. Only chain into `shape-spec` if exploration revealed a real problem worth specifying.

### Dependency audit
*"A CVE landed. Or it's quarterly hygiene. Or you're adding a new package."*

```
audit-dependencies
```

Standalone. Produces a per-dep table (declared / imports / verdict) plus advisory verdicts with reachability proof. Action items go into a follow-up PR.

### Sensitive-path code review
*"This diff touches auth, payments, crypto, sessions, or tokens."*

```
code-review-loop  (auto-dispatches security-auditor on sensitive paths)
```

No prep skill needed. `code-review-loop` detects sensitive paths from the diff and dispatches both `code-reviewer` and `security-auditor` automatically. You get OWASP-aligned findings alongside structural ones.

### Pre-release sweep
*"You're about to cut a tagged version of a library, plugin, or CLI."*

```
audit-dependencies → release-and-changelog
```

For library/plugin authors before tagging. The audit catches stale deps and unaccounted CVEs; the release skill builds the changelog from the actual diff (not from memory) and makes the release commit atomic.

---

In practice, devs skip steps for trivial work. The chains show the full discipline; use what the task earns.

## Development

CI (`.github/workflows/validate.yml`) lints every skill against the 8-section
anatomy above, checks `plugin.json`/`marketplace.json` version sync, enforces
token budgets on the always-loaded skill/agent frontmatter (the "no agent-bloat"
claim, measured), and exercises the evidence gate. Run locally before committing:

```
node scripts/validate-plugin.cjs
node scripts/token-report.cjs --check
node scripts/test-verify-evidence.cjs
```

`scripts/verify-evidence.cjs` is the evidence gate itself — dogfooding the
"every claim has evidence" philosophy against the agent's own output. It
resolves `file:line` citations in an artifact (`--citations <file>`) and scans
`git diff HEAD` for fake-green tampering — deleted test files, added test skips,
new TODO/FIXME (`--tripwires`) — exiting non-zero when a claim can't be verified.

## Requirements

- Claude Code 1.0+
- Git
- Node.js or Python (depending on your stack)

## License

MIT

---

Built by [duthaho](https://github.com/duthaho).

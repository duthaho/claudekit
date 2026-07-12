# AGENTS.md
<!-- mapped 2026-07-12 @ 52e2cd6 · regenerate with /map refresh -->

## What this is
claudekit — a Claude Code **plugin** (not an app): 15 skills, 8 agents, 5 output
styles, and 3 hook scripts, distributed via a plugin marketplace. Almost everything
is markdown consumed by Claude Code at runtime; the only buildable code is the
docs website (`website/`, Astro Starlight). The only repo-level check is
`scripts/validate-plugin.cjs` (skill anatomy + version sync).

## Build, test, run
- Plugin: nothing to build. Lint before committing: `node scripts/validate-plugin.cjs`
  — validates every SKILL.md against the 8-section anatomy and plugin/marketplace
  version sync (also runs in CI, `.github/workflows/validate.yml`).
- Test by installing locally:
  `/plugin marketplace add <path-or-repo>` → `/plugin install claudekit` → `/claudekit:init`
- Website (`cd website/`): `npm install`, `npm run dev`, `npm run build`,
  `npm run preview`. Deployed to Cloudflare via `wrangler.jsonc` (assets from `./dist`).

## Architecture
- `.claude-plugin/plugin.json` — plugin manifest; `.claude-plugin/marketplace.json`
  — marketplace listing. **Version lives in both files; bump them together.**
- `skills/<name>/SKILL.md` — one dir per skill. Only `skills/init/` has extras:
  `templates/` (hooks.json, mcp-servers.json, rules/*.md) that init scaffolds into
  a user's `.claude/` dir.
- `agents/<name>.md` — YAML frontmatter (`name`, `description` with embedded
  `<example>` blocks as an escaped single-line string, `tools`, `memory: project`)
  + system prompt body. See `agents/tester.md`.
- `output-styles/<name>.md` — frontmatter must keep `keep-coding-instructions: true`.
- `scripts/*.cjs` — Node hook scripts (PostToolUse etc.); they **fail open** —
  errors are swallowed by design (see `scripts/auto-format.cjs`).
- `website/src/content/docs/` — docs pages; `reference/{skills,agents,output-styles,mcp-servers}.md`
  mirror the plugin contents.

## Conventions & gotchas
- Every skill follows a fixed 8-section anatomy (frontmatter, Overview, When to
  Use / NOT, Process, **Rationalizations table**, **Evidence Requirements**, Red
  Flags, References) — documented in README.md "Skill anatomy". New skills must match.
- Counts and tables ("15 skills", "8 agents", workflow chains) are restated in
  `README.md`, `CHANGELOG.md`, and `website/src/content/docs/reference/*` — adding
  or removing a skill/agent means updating all three.
- Skill frontmatter descriptions carry trigger keywords ("Use when…", "Activate
  for…") — they are load-bearing for skill dispatch, not doc prose.
- `CHANGELOG.md` follows Keep a Changelog + SemVer; releases go through the
  repo's own `skills/release-and-changelog/SKILL.md` discipline.
- House style: evidence-first, no marketing voice (README.md "No founder voice") —
  keep that tone in any skill/agent/doc text.

## Landmarks
- `README.md` — canonical overview: 5-phase spine, agent roster, workflow chains
- `.claude-plugin/plugin.json` — manifest / version
- `skills/init/SKILL.md` — the setup wizard; templates in `skills/init/templates/`
- `agents/tester.md` — reference example of agent file format
- `website/astro.config.mjs` — docs site config

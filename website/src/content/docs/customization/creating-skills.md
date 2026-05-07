---
title: Creating Skills
description: How to create custom skills for Claude Kit.
---

# Creating Skills

Skills are the core building block of Claude Kit. You can create custom skills for your project's specific patterns, frameworks, or workflows.

## Skill Structure

Plugin skills live in the `skills/` directory at the plugin root. For project-specific skills, create them in `.claude/skills/`:

```
.claude/skills/
└── my-skill/
    ├── SKILL.md           # Skill definition (required)
    └── resources/         # Optional bundled references
        ├── patterns.md
        └── examples.md
```

## SKILL.md Format

```markdown
---
name: my-skill
description: Use when [trigger conditions]. Activate for keywords like
  "keyword1", "keyword2". Also trigger when [specific scenarios].
---

# My Skill

## When to Use
- [Scenario 1]
- [Scenario 2]

## When NOT to Use
- [Anti-scenario 1]

---

## Core Patterns

### Pattern 1: [Name]

[Explanation]

\`\`\`typescript
// Code example
\`\`\`

### Pattern 2: [Name]

[Explanation]

## Best Practices

- [Practice 1]
- [Practice 2]

## Common Pitfalls

- [Pitfall 1]
- [Pitfall 2]
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill identifier (kebab-case) |
| `description` | Yes | Trigger description — Claude reads this to decide when to activate |
| `argument-hint` | No | Hint for user-invocable skills (e.g., `<topic>`) |
| `user-invocable` | No | If `true`, users can invoke with `/skill-name` |
| `disable-model-invocation` | No | If `true`, only manual invocation works |

## Writing Effective Descriptions

The `description` field is critical — it determines when Claude activates your skill. Include:

1. **Primary trigger**: "Use when [main scenario]"
2. **Keywords**: "Activate for keywords like X, Y, Z"
3. **Secondary triggers**: "Also trigger when [less obvious scenarios]"

### Good Description

```yaml
description: Use when implementing JWT tokens, OAuth2 flows, session
  management, or role-based access control. Activate for keywords like
  "login", "signup", "token refresh", "protected routes". Also trigger
  when code handles password hashing or API key authentication.
```

### Bad Description

```yaml
description: Authentication skill for handling auth stuff.
```

## Bundled Resources

For complex skills, include reference documents in a `resources/` subdirectory:

```
my-framework/
├── SKILL.md
└── resources/
    ├── api-reference.md      # Framework API docs
    ├── migration-guide.md    # Version migration patterns
    └── examples.md           # Code examples
```

Reference them from SKILL.md:

```markdown
See `resources/api-reference.md` for the full API surface.
```

## Skill Types

### Rigid Skills

Follow exactly — no adaptation. Used for methodologies where discipline matters:

- TDD (red-green-refactor cycle)
- Systematic debugging (four-phase investigation)
- Verification before completion

### Flexible Skills

Adapt principles to context. Used for patterns that vary by project:

- Language idioms
- Framework patterns
- Architecture guidelines

## Example: Custom Deployment Skill

```markdown
---
name: deploy-to-fly
description: Use when deploying to Fly.io or configuring Fly.io
  services. Activate for keywords like "fly deploy", "fly.toml",
  "Fly.io", "fly machines", or any Fly.io-specific configuration.
---

# Deploy to Fly.io

## When to Use
- Deploying applications to Fly.io
- Configuring fly.toml
- Setting up Fly.io machines or volumes

## When NOT to Use
- Deploying to other platforms (this skill is Fly.io-specific)

---

## Deployment Checklist

1. Verify `fly.toml` exists and is configured
2. Check environment secrets are set: `fly secrets list`
3. Deploy: `fly deploy --strategy rolling`
4. Verify: `fly status` and `fly logs`

## Common Patterns

### Multi-region deployment

\`\`\`toml
[env]
  PRIMARY_REGION = "iad"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
\`\`\`
```

## Tips

- **Start small**: Begin with the core patterns, add detail as you learn what Claude needs
- **Be specific**: Vague skills produce vague results. Include exact code patterns.
- **Test the trigger**: After creating a skill, test that it activates on the right keywords
- **Update regularly**: Skills should evolve with your codebase

## Related Pages

- [Skills Reference](/reference/skills/) — All 35 built-in skills
- [Creating Agents & Modes](/customization/creating-agents-and-modes/) — Custom agents and modes

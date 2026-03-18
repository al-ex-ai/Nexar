# Nexar -- Project Guide

## What is Nexar?

Intent-Driven UI Framework. The AI layer between business intent and rendered UI.

Developers define what the user needs to accomplish (intents). Nexar's AI engine composes the right UI from a registered component library, adapting to user context, device, and business rules at runtime.

## Quick Reference

| Item | Value |
|------|-------|
| Language | TypeScript 5.9+ (strict, zero `any`) |
| Runtime | Node 22+ LTS |
| Package manager | pnpm (workspaces) |
| Monorepo | Turborepo |
| Linting/Formatting | Biome |
| Testing | Vitest |
| CI | GitHub Actions |
| License | Apache 2.0 |

## Project Structure

```
packages/
  @nexar/core        # Intent schema, types, validators, component registry (zero deps)
  @nexar/engine      # AI composition engine (intent -> component tree)
  @nexar/ai          # Model adapter, RAG engine, agent engine, guardrails
  @nexar/react       # React renderer (maps NexarTree to React components)
  @nexar/state       # Server-driven state management
  @nexar/analytics   # Render + interaction tracking
  @nexar/cli         # CLI: scaffold, test, deploy intents
  @nexar/devtools    # Browser devtools extension
apps/
  docs/              # Starlight documentation site
```

## Package Dependency Graph

```
@nexar/core (no deps -- pure types)
  <- @nexar/engine (core)
  <- @nexar/ai (core)
  <- @nexar/state (core)
  <- @nexar/analytics (core)
  <- @nexar/react (core, engine)
  <- @nexar/cli (core, engine)
```

## Key Concepts

- **Intent**: What the user needs to accomplish. Not a screen definition.
- **Component Registry**: All available building blocks, with constraints and platform traits.
- **NexarTree**: Platform-agnostic component tree output by the engine.
- **NexarNode**: A single node in the tree, with type, props, children, tokens.
- **Design System**: Tokens + themes that the engine respects when composing.
- **Plugin**: Extension point for custom components, intents, validators, tools.

## Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm build            # Build all packages (respects dependency order)
pnpm test             # Run all tests
pnpm lint             # Lint all packages (Biome)
pnpm lint:fix         # Auto-fix lint issues
pnpm format           # Format all files
pnpm typecheck        # Type-check all packages
pnpm clean            # Remove all dist/ directories
```

## Conventions

- See STANDARDS.md for the full rulebook.
- TypeScript strict mode. Zero `any`. `readonly` by default.
- Biome enforces: no default exports, no barrel files, no unused imports, no `any`.
- Tests next to source: `src/foo.ts` -> `src/foo.test.ts`.
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Pure types in `@nexar/core`. No runtime code.
- Server always binds to `127.0.0.1`.

## Architecture Principles

1. **Intent over implementation** -- describe what, not how.
2. **Compose, don't hardcode** -- AI assembles UI from approved components.
3. **Context-aware** -- same intent, different user, different UI.
4. **Design system enforced** -- impossible to ship off-brand.
5. **Framework agnostic** -- React first, then anything.
6. **Pluggable AI** -- swap models, vector stores, guardrails independently.
7. **Open source** -- Apache 2.0, community-driven.

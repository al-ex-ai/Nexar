# Nexar Standards

Every file, every function, every commit follows these rules. No exceptions.

## Language

- TypeScript strict mode. Zero `any`. Zero `@ts-ignore`.
- `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` enabled.
- All public APIs must have explicit return types.
- Use `readonly` on all interface properties and arrays unless mutation is intentional and documented.
- Use `type` imports (`import type { X }`) for type-only imports. Biome enforces this.

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | kebab-case | `component-registry.ts` |
| Types/Interfaces | PascalCase | `NexarComponent` |
| Functions/Variables | camelCase | `resolveIntent` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Packages | `@nexar/name` | `@nexar/core` |
| Test files | `*.test.ts` | `intent.test.ts` |

- Prefix all public types with `Nexar` to avoid collisions: `NexarNode`, `NexarEvent`, `NexarPlugin`.
- No abbreviations in public APIs. `component` not `comp`. `configuration` not `config` (internal shorthand is fine).
- Boolean variables start with `is`, `has`, `can`, `should`: `isValid`, `hasChildren`.

## File Structure

- One concept per file. Don't mix intent types with component types.
- Files export types OR implementations, not both in the same file (barrel files are exceptions).
- No barrel files (`index.ts` that re-exports everything) inside packages. One `index.ts` at the package root only.
- Biome enforces `noBarrelFile` and `noReExportAll` inside source directories.

## Functions

- Pure functions preferred. Side effects must be explicit and documented.
- Max 3 parameters. Use an options object for more.
- No default exports. Biome enforces `noDefaultExport`.
- Async functions must handle errors. No unhandled promise rejections.

## Error Handling

- Use typed error classes, not string throws.
- Errors at system boundaries (user input, API calls, file I/O) must be caught and wrapped.
- Internal code trusts internal types. Don't validate what TypeScript already guarantees.
- Never swallow errors silently. Log or rethrow.

## Testing

- Every public function has a test.
- Test files live next to source: `src/intent.ts` -> `src/intent.test.ts`.
- Use Vitest. No Jest, no Mocha.
- Test names describe behavior, not implementation: "resolves intent with valid context" not "test resolveIntent".
- No mocks unless absolutely necessary. Prefer dependency injection.
- Integration tests for cross-package interactions live in a top-level `tests/` directory.

## Dependencies

- Zero runtime dependencies in `@nexar/core`. It's pure types.
- Minimize dependencies everywhere. Audit every new dependency.
- Peer dependencies for framework integrations (React, etc.).
- Workspace dependencies use `workspace:*`.
- Pin exact versions in production packages.

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`.
- One logical change per commit.
- Branch names: `feat/intent-resolver`, `fix/tree-validation`, `docs/api-reference`.
- PRs require passing CI (build + lint + test + typecheck).
- Squash merge to main.

## Code Review

- No `any`. If you think you need it, you don't. Use generics or unknown.
- No `// @ts-expect-error` without a linked issue.
- No `console.log` in production code. Use the logger.
- No hardcoded strings for user-facing text. Use constants or i18n keys.
- No magic numbers. Extract to named constants.

## Documentation

- JSDoc on all public interfaces and functions.
- Keep JSDoc concise. One sentence for simple things.
- README per package explaining what it does and how to use it.
- Architecture decisions documented in `docs/adr/` as ADRs (Architecture Decision Records).

## Performance

- No premature optimization. Measure first.
- Lazy-load heavy modules.
- Tree-shakeable: named exports only, no side effects in module scope.
- Bundle size tracked in CI. Alert on significant increases.

## Security

- Never log secrets, tokens, or PII.
- Validate all external input at system boundaries.
- Use parameterized queries. No string interpolation in queries.
- Server binds to `127.0.0.1`, never `0.0.0.0`.
- Rate limit all public endpoints.
- Guardrails on all AI inputs and outputs.

## Accessibility

- All interactive components must support keyboard navigation.
- Color contrast ratio minimum 4.5:1 (AA) by default.
- Screen reader labels on all interactive elements.
- Components declare their a11y requirements in the registry.

## Versioning

- Semantic versioning (semver) for all packages.
- Changesets for version management.
- Breaking changes require a migration guide.
- Pre-1.0: minor version bumps may include breaking changes.

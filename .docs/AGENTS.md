# AGENTS Guide for svgen

Repository playbook for agentic coding tools.
Use these defaults unless asked otherwise.

## Project Structure

- Stack: TypeScript, Vite, Vitest, Tailwind CSS v4.
- App: multi-page web app for SVG generation, settings, and gallery.
- Entrypoints:
  - `src/index.html` + `src/index.ts`
  - `src/settings/index.html` + `src/settings/index.ts`
  - `src/gallery/index.html` + `src/gallery/index.ts`
- Domain/core logic: `src/core/`
- UI web components: `src/ui/components/`
- Static assets: `src/_public/`

Read before major edits:

- `README.md`
- `CONTRIBUTING.md`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `vitest.config.ts`
- `src/core/app/composition-root.ts`

## Architecture Boundaries

- Keep business/domain logic in `src/core/`.
- Keep DOM rendering and custom elements in `src/ui/components/`.
- Wire dependencies in `src/core/app/composition-root.ts`.
- Prefer dependency injection over hidden globals.
- Keep provider-specific logic in `src/core/services/ai/providers/`.
- Keep validation/sanitization at domain boundaries (not only in UI).

## Code Style Rules

### Imports and modules

- Use ES modules with explicit relative imports.
- Keep side-effect imports first (component registration, CSS, etc.).
- Prefer `import type` for type-only imports.
- Reuse existing `index.ts` barrels where already established.
- Do not add path aliases unless configs are updated intentionally.
- Keep modules cohesive; split files that become too broad.

### Formatting

- Follow Prettier (`.prettierrc`):
  - `semi: true`
  - `singleQuote: false`
  - `trailingComma: all`
  - `printWidth: 100`
  - `tabWidth: 2`
- Follow EditorConfig: 2-space indentation.
- Prefer early returns over deep nesting.
- Use `const` by default; use `let` only when reassignment is required.
- Never use `var`.

### TypeScript

- Keep `strict` mode clean.
- Keep `noUnusedLocals` and `noUnusedParameters` clean.
- Use `unknown` in catches and narrow with `instanceof Error`.
- Prefer interfaces for object contracts.
- Prefer type aliases for unions/intersections.
- Avoid `any`; isolate and justify when unavoidable.

### Naming

- Files/folders: `kebab-case`
- Variables/functions: `camelCase` (functions as verbs)
- Classes/types/interfaces: `PascalCase`
- Constants/enums: `UPPER_SNAKE_CASE`
- Booleans: prefix with `is`, `has`, `can`, `should`
- Arrays: plural nouns

### Error handling and security

- Validate inputs early and fail fast.
- Never swallow errors silently.
- Return safe user-facing messages for recoverable failures.
- Log technical context with `console.error` or `console.warn`.
- Preserve SVG sanitization in `src/core/utils/svg-sanitizer.ts`.
- Never commit secrets, API keys, or local-storage dumps.

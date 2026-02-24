# SVGen Architecture

This document explains how the app is wired so coding agents can make safe,
targeted changes without breaking hidden contracts.

## 1. What this app is

SVGen is a **frontend-only TypeScript app** (Vite + Tailwind + Web Components)
that generates SVGs with AI providers.

- No backend in this repository.
- Provider API keys are managed in the browser.
- Main responsibilities:
  - prompt + references in, SVG candidates out,
  - sanitize results for safety,
  - persist settings and gallery locally.

## 2. Runtime shape at a glance

The app has **3 entry pages** configured in `vite.config.ts`:

- `src/index.html` -> generation page
- `src/settings/index.html` -> settings/models page
- `src/gallery/index.html` -> gallery page

Vite uses `src` as project root and `_public` as static assets directory.

## 3. Folder map and responsibilities

Top-level source folders:

- `src/core/` -> domain, persistence, provider integrations, utilities
- `src/ui/` -> web components and page UI behavior
- `src/settings/` -> settings page bootstrap
- `src/gallery/` -> gallery page bootstrap

High-value files to understand first:

- `src/core/app/composition-root.ts`
  - Composition root / dependency wiring.
  - Creates singletons for settings repository, gallery repository,
    provider registry, AI service.
- `src/index.ts`
  - Generation page orchestrator.
  - Listens for UI event, calls use case, emits lifecycle events.
- `src/core/use-cases/generate-svg.ts`
  - Main generation use case (validation, key checks, fallback logic,
    sanitization, UI notifications).
- `src/core/services/ai/index.ts`
  - AI service that builds system prompt and dispatches generation to
    chosen provider using active API key.

## 4. Architecture style

The code follows a lightweight layered approach:

- **UI layer** (`src/ui/components/*`)
  - Web components render controls and emit/listen to events.
- **Use-case layer** (`src/core/use-cases/*`)
  - Business workflow and guardrails.
- **Service/provider layer** (`src/core/services/ai/*`)
  - Provider selection, API calls, response parsing.
- **Persistence layer** (`src/core/modules/*`)
  - `localStorage` settings and `IndexedDB` gallery.

Dependency wiring happens once in `composition-root.ts`, then modules consume
`appComposition` (manual dependency injection pattern).

## 5. Generation lifecycle (end-to-end)

### Event pipeline

The generation page uses window custom events in `src/core/events/app-events.ts`
and constants in `src/core/constants/events.ts`:

- `start-generation`
- `generation-started`
- `generation-finished`
- `svgen-results`

### Flow

1. `generator-controls` emits `start-generation` with prompt/model/provider/
   references/variations.
2. `src/index.ts` receives it and emits `generation-started`.
3. `GenerateSvgUseCase.execute()` runs:
   - validates model/provider selection,
   - verifies active key for provider,
   - verifies provider exists in registry,
   - calls AI service for N variations,
   - applies GCP fallback (if model disallows multi-candidate),
   - sanitizes each SVG,
   - returns safe payload + metadata.
4. `src/index.ts` emits `svgen-results` then `generation-finished`.
5. `results-grid` listens and renders cards.

## 6. Persistence model

### A. Settings (localStorage)

Repository: `src/core/modules/db/index.ts`

- Storage key: `svgen_settings`
- Main settings shape (`AppSettings`):
  - `apiKeys: ApiKeyItem[]`
  - `activeKeys: Record<string, string>` (providerId -> keyId)
  - `variations: number` (clamped 1..4)
  - `temperature: number` (clamped 0..2, 0.1 precision)
  - `systemPrompt: string`
  - `lastSelectedModel?: string`
  - `lastSelectedProviderId?: string`

Important behavior:

- `getSettings()` returns deep-cloned objects (treat as immutable snapshots).
- Repository normalizes/clamps and migrates legacy payloads.
- Use command-style methods (`setActiveKey`, `toggleModelSelection`, etc.)
  instead of direct storage edits.

### B. Gallery (IndexedDB)

Repository: `src/core/modules/gallery-db/index.ts`

- DB name: `SVGenGalleryDB`
- Store: `svgs`
- `GalleryItem`: `{ id, svg, prompt, model, timestamp }`

## 7. AI provider subsystem

### Registry

`src/core/services/ai/providers/index.ts` holds `AiProviderRegistry`.

- Current providers:
  - `open-router`
  - `gcp` (Gemini)

### Provider contract

Type: `AiProvider` in `src/core/types/index.ts`.

Each provider must implement:

- `generate(options): Promise<string[]>`
- `fetchModels(apiKey): Promise<string[]>`
- metadata (id, name, icon, config fields)

### API clients and validation

`src/core/services/ai/providers/clients.ts`:

- Uses `fetch` wrappers (injectable for tests).
- Validates provider JSON responses using `zod` schemas.
- Throws rich errors on non-OK responses.

## 8. Security and sanitization boundaries

Sanitizer: `src/core/utils/svg-sanitizer.ts`

Security model is defense-in-depth:

- blocks script/foreignObject tags early,
- blocks inline `on*` attributes,
- sanitizes through DOMPurify with strict SVG allow-lists,
- reparses output and verifies valid `<svg>` root,
- rejects parser errors and unsafe residues.

Sanitization is applied in multiple places:

- after AI generation (`GenerateSvgUseCase`),
- before rendering SVG cards (`svg-card.ts`),
- before saving to gallery (`results-grid.ts`),
- when loading gallery items (`gallery/index.ts`).

Do not bypass these calls.

## 9. UI structure and component boundaries

Main custom elements:

- `app-header`
  - shared navigation for all pages.
- `generator-controls`
  - prompt input, model selection, attachments, generation settings,
    emits generation event.
- `model-dropdown`
  - reads enabled models from settings, grouped by provider.
- `results-grid`
  - listens for generation lifecycle events and renders result cards.
- `api-keys-modal`
  - add/edit/delete keys, set active key, sync models.
- `app-modal`
  - generic modal shell.

Reusable view utilities:

- `src/core/utils/svg-card.ts`
  - card rendering + delegated menu actions (copy/download/custom).
- `src/core/utils/alert.ts`
  - global toast-like notifications.

## 10. Styling and frontend stack

- Tailwind v4 via `@tailwindcss/vite` plugin.
- Theme tokens and base utility customizations in `src/ui/main.css`.
- Typography defaults to Inter stack in theme variable.
- Design system is dark-neutral; maintain existing visual language unless
  explicitly redesigning.

## 11. Test layout and intent

Core tests:

- `src/core/modules/db/index.test.ts`
  - settings normalization/migrations/command methods.
- `src/core/services/ai/index.test.ts`
  - prompt building and provider dispatch.
- `src/core/services/ai/providers/*.test.ts`
  - provider API handling and extraction.
- `src/core/use-cases/generate-svg.test.ts`
  - use-case validation/fallback/success behavior.
- `src/core/utils/svg-sanitizer.test.ts`
  - sanitizer safety checks.

Integration tests:

- `src/index.integration.test.ts`
  - orchestrator event sequence contract.
- `src/settings/index.integration.test.ts`
  - settings page model toggle behaviors.
- `src/ui/components/results-grid.integration.test.ts`
  - save-to-gallery workflow.

## 12. Agent playbook for common changes

### Add a new provider

1. Add provider id/type support in `src/core/types/index.ts`.
2. Implement provider class in `src/core/services/ai/providers/`.
3. Add client logic + zod schemas in `clients.ts` (or new client file).
4. Register provider in `createDefaultProviderRegistry()`.
5. Ensure provider icon exists in `src/_public/assets/`.
6. Add tests for model fetch + generation parsing.

### Change generation guardrails/prompt behavior

1. Update `DEFAULT_SYSTEM_PROMPT` and/or guardrails in
   `src/core/services/ai/index.ts`.
2. Keep output contract strict (single `<svg>` payload requirement).
3. Run AI service + use-case tests.

### Change settings behavior

1. Add/update fields in `AppSettings` + defaults.
2. Update normalization logic and command methods.
3. Wire UI in `generator-controls` and/or `settings/index.ts`.
4. Add migration handling if field shape changes.

### Change gallery behavior

1. Modify `GalleryItem` shape if needed.
2. Update save/load paths in `results-grid.ts` and `gallery/index.ts`.
3. Keep sanitization before save/render.

## 13. Non-obvious constraints and pitfalls

- `ModelDropdown` restores last selection from settings if values exist.
  It does not fully revalidate presence in currently enabled models.
- `attachSvgCardEvents()` uses delegated listeners and a
  `data-svg-events-attached` guard to avoid duplicate bindings.
- API key values are stored in localStorage (client-side only). Treat this as
  a product/security constraint if proposing major changes.
- `BrowserSettingsRepository` may migrate legacy data structures at read time;
  keep migration paths backward compatible.

## 14. Safe editing checklist for coding agents

- Prefer edits behind existing boundaries (UI <-> events <-> use case <->
  services/repositories).
- Keep sanitization in place at all ingress/egress points.
- Use repository command methods instead of mutating persisted shapes ad hoc.
- Preserve event names and payload contracts unless all listeners are updated.
- Add/adjust tests when changing cross-module behavior.

# SVGen Refactor Roadmap

## Phase 1 - Safety and Contracts

- [x] Add typed event map and `emit/on` helpers.
- [x] Replace raw `CustomEvent` casts in generation/result flows.
- [x] Remove dead `SETTINGS_UPDATED` usage or implement real subscribers.
- [x] Add output escaping helper for dynamic `innerHTML` text interpolation.

Deliverable: stable event contracts and reduced runtime fragility.

## Phase 2 - Generation Use Case Extraction

- [x] Create `GenerateSvgUseCase` for provider/key resolution, fallback policy, sanitization, and result shaping.
- [x] Reduce `src/index.ts` to orchestration adapter only.
- [x] Move UI notifications/navigation side effects behind small adapter interfaces.

Deliverable: clear separation between app logic and UI shell.

## Phase 3 - Settings Mutation Hardening

- [ ] Add repository command methods: `setActiveKey`, `toggleModelSelection`, `setVariations`, `setTemperature`, `setSystemPrompt`.
- [ ] Stop direct mutation of settings objects in UI modules.
- [ ] Ensure repository returns immutable copies and does not leak default object references.

Deliverable: deterministic settings state transitions.

## Phase 4 - UI Module Decomposition

- [ ] Split large components (`generator-controls`, `model-dropdown`, `api-keys-modal`) into render/controller/state modules.
- [ ] Reduce full rerender patterns where local updates are enough.
- [ ] Keep custom element APIs unchanged.

Deliverable: smaller modules with single-purpose responsibilities.

## Phase 5 - Test Coverage Expansion

- [ ] Add integration tests for:
  - generation event pipeline,
  - save to gallery,
  - settings update workflows.
- [ ] Add repository tests for edge/error paths (including migration scenarios).

Deliverable: regression safety net for architecture changes.

## Execution Strategy

- Implement in small PRs, one phase per PR where possible.
- Preserve behavior first, then simplify internals.
- Validate each phase with `npm test` and manual smoke checks for generation/settings/gallery pages.

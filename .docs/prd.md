# SVGen Architecture Stabilization PRD

## Objective

Improve service/module structure to reduce coupling, improve maintainability, and lower regression risk without changing product behavior.

## Scope

- Refactor architecture boundaries in `src/core`, page entrypoints, and UI components.
- Improve event contracts and settings mutation flows.
- Add missing integration-focused test coverage for critical flows.

## Problems To Solve

- Hidden dependency coupling via global `appComposition` usage.
- `src/index.ts` mixes orchestration, business policy, UI concerns, and error handling.
- Untyped global app events create fragile runtime contracts.
- Settings are mutated in place across modules, risking inconsistent state.
- Large UI components mix rendering, persistence, and side effects.
- Dynamic HTML rendering increases XSS and maintainability risk.

## Non-Goals

- No framework migration.
- No major UI redesign.
- No provider feature expansion.

## Success Criteria

- Core generation flow moved into use-case/service with thin page adapter.
- Event payloads are typed end-to-end.
- Settings updates go through explicit repository commands (no ad-hoc object mutation).
- At least one integration test per critical flow: generate, save-to-gallery, settings update.
- No functional regressions in current user flows.

## Constraints

- Preserve current behavior and routes.
- Keep changes incremental and PR-friendly.
- Maintain compatibility with existing persisted settings.

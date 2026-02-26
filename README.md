# svgen

`svgen` is a web app for generating usable SVG assets with AI.

The goal is not just to forward a prompt to a provider. The app focuses on a more reliable SVG generation flow: structured generation requests, better prompt shaping, validation, and sanitization before showing results to users.

## What the app does

- Generates SVG output from user prompts
- Supports multiple AI providers through a shared app flow
- Applies app-level safeguards so output is safer and more consistent
- Lets users manage provider keys/settings in the app UI

## Project structure

- `src/index.ts`: main generation flow bootstrap
- `src/core/`: domain logic (generation use case, events, utilities, sanitization)
- `src/ui/`: web components and UI behavior
- `src/settings/`: provider/settings page
- `src/gallery/`: generated result browsing page

## Optional timeout tuning

Generation requests can be slower than model-list requests. You can tune request behavior with Vite env vars:

- `VITE_AI_FETCH_TIMEOUT_MS`: timeout for model-list fetches (default: `30000`)
- `VITE_AI_GENERATE_TIMEOUT_MS`: timeout for SVG generation requests (default: `120000`)
- `VITE_AI_GENERATE_TIMEOUT_RETRIES`: number of timeout-only retries for generation (default: `1`)
- `VITE_AI_TIMEOUT_RETRY_DELAY_MS`: delay before timeout retry (default: `600`)

Example `.env`:

```bash
VITE_AI_FETCH_TIMEOUT_MS=30000
VITE_AI_GENERATE_TIMEOUT_MS=120000
VITE_AI_GENERATE_TIMEOUT_RETRIES=1
VITE_AI_TIMEOUT_RETRY_DELAY_MS=600
```

## License

This project is licensed under the GNU AGPLv3 to ensure that all improvements to the hub remain open and benefit the community.

Because this is a web-based project, the AGPL prevents modified versions from being run as closed-source services without sharing the source code.

Our goal is to encourage collaboration while protecting the project from proprietary forks.

See the [LICENSE](./LICENSE) file for more details.

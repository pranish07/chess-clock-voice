# CLAUDE.md

## Project

Chess Clock Voice is a Manifest V3 Chrome extension for chess.com. It reads clock text and speaks remaining seconds below per-time-control thresholds. TypeScript, Vite + CRXJS, React, Tailwind, Vitest. No server, analytics, remote code, board reading, or move assistance.

## Commands

```bash
npm install
npm run dev        # CRXJS dev; load dist/ unpacked
npm test
npm run test:watch
npm run lint
npm run format:check
npm run build      # icons, tsc --noEmit, vite build
npm run package    # build + release/chess-clock-voice-<version>.zip
npm run bump -- patch
```

Load `dist/` in `chrome://extensions` with Developer mode. Test on a real chess.com live game for DOM, audio, and lifecycle changes.

## Architecture

- `src/core/` is site-, feature-, and UI-agnostic. No React, chess.com, or storage UI logic.
- `src/adapters/` is the only DOM layer. Implement `ClockProvider`; register a `ClockProviderFactory`.
- `src/engines/tts/` implements `TtsEngine`; keep `cancel()` semantics.
- `src/features/` owns behavior, schema, defaults, normalization, validation, presets. Register `FeatureDefinition` (alias `FeatureModule`).
- `src/app/` composes app defaults, migrations, validation, and `getFullSchema()`.
- `src/background/` is the only settings authority and the only real `chrome.storage` caller.
- `src/content/` wires providers + features and handles SPA remounts.
- `src/ui/` renders schemas. Never hardcode a settings field in popup/options.
- Messages are typed in `src/core/messages.ts`: `settings:get|patch|replace|reset`, broadcast `settings:changed`.

## Hard rules

- NEVER read the board, pieces, moves, move list, chat, evaluation, or account data. Fair play is architectural.
- NEVER add a permission, host match, network call, analytics, or remote code without an ADR and privacy/store updates.
- NEVER put a site selector outside `src/adapters/<site>/selectors.ts`.
- NEVER access `chrome.storage` outside `src/background/index.ts`; use typed messages.
- NEVER hardcode setting controls; add a schema field and locale keys.
- NEVER import UI, app, content, or background from `core/`; never import adapters/UI from `features/`.
- NEVER store game data. Settings are configuration only, in `chrome.storage.sync` key `settings`.
- Keep `SettingsStore` migrations idempotent and covered by tests.
- Presets are data. No executable preset code.
- Do not commit `dist/`, `release/`, secrets, cookies, or personal data.

## Style and tests

Use TypeScript strict, Prettier, ESLint. Prefer `unknown` + guards over `any`. Add locale strings to `public/_locales/en/messages.json`. Add tests for parser/announcer/validation/migrations; use jsdom fixtures for adapters and `memoryArea()` for storage. Mock only platform boundaries. Clean up timers/listeners.

## Before you finish

Run `npm run lint`, `npx tsc --noEmit`, and `npm test` (or `npm run build`). Update README/ARCHITECTURE/DECISIONS/docs/SELECTORS/docs/SETTINGS_SCHEMA/PUBLISHING when behavior, settings, selectors, permissions, or architecture change. State any unverified live-DOM assumptions.

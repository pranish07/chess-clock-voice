# Chess Clock Voice

Chess Clock Voice is a Manifest V3 Chrome extension for chess.com. It speaks the remaining seconds on your clock when time gets low, so you can keep your eyes on the board. Speech is generated locally; the extension reads only clock text and never reads the board.

> **Fair play:** this extension reads the clock and nothing else. It does not read the board, moves, or evaluation, suggest moves, or interact with chess.com's game logic. No analytics, no remote code, no data collection.

## Features

- Spoken low-time alerts at per-time-control thresholds: bullet, blitz, rapid, and daily.
- Defaults: bullet 50 s, blitz 20 s, rapid 20 s, daily off.
- Clock scope: my clock, opponent's clock, or both.
- Cadence: every whole second, panic mode (≤10 s or every 5 s), or custom milestones.
- Increment-aware thresholds: a 20 s threshold with a 2 s increment starts at 18 s.
- Time-control parsing (`3|2`, `3+2`, `10+5`, `3 min`, `30 sec`, `1 day`) and observed-increment fallback.
- Tenths parsing (`0:09.3` → second 10), once-per-second de-duplication, settle windows, and jump resets for bullet/premove play.
- Custom phrase with `{seconds}`, `{increment}`, and `{timeControl}` tokens, live character count, and spoken-duration estimate.
- Voice, language, rate, pitch, volume, and a test button.
- Five built-in presets plus user-saved presets.
- Schema-driven popup and options page with light/dark theme and inline validation.
- Master switch in both the popup and options page.
- Versioned settings with migrations; sync storage only.
- Permissions: `storage` and `https://*.chess.com/*`. No other hosts.

## Install

### From the Chrome Web Store

The store listing is not published yet. After approval, the listing will be at <https://chromewebstore.google.com/>; search for **Chess Clock Voice** or use the publisher's direct link.

### Load unpacked (developers)

Requirements: Node.js 20+ (tested on Node 25) and npm.

```bash
npm install
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/` folder.
5. Open a chess.com live game. The clock speaks when it crosses the configured threshold.
6. After changing code, run `npm run build`, click **Reload** on the extension card, then refresh the chess.com tab.

For HMR, run `npm run dev` and load `dist/` unpacked. Keep Vite running. If HMR does not attach on a chess.com tab, refresh the tab once.

## Commands

```bash
npm run dev          # icons + Vite/CRXJS dev server
npm run build        # icons + tsc --noEmit + production build in dist/
npm test             # 44 tests across 7 files
npm run test:watch
npm run lint
npm run format:check
npm run format
npm run package      # build + release/chess-clock-voice-<version>.zip
npm run bump -- patch # or minor / major / 1.2.3
```

`npm run package` excludes source maps and puts `manifest.json` at the ZIP root. `npm run bump` updates `package.json`, `manifest.json`, and `package-lock.json` together.

## Project structure

```text
chess-clock-voice/
├─ manifest.json                 MV3 manifest, permissions, content matches
├─ popup.html / options.html     React entry HTML
├─ src/
│  ├─ app/settings.ts            defaults, v2 migrations, validation, full schema
│  ├─ core/                      bus, logger, i18n, typed messages, time control,
│  │                             schema helpers, versioned sync storage
│  ├─ adapters/                  ClockProvider + registry
│  │  └─ chesscom/               provider, clock parser, ALL selectors
│  ├─ engines/tts/               TtsEngine + WebSpeechEngine
│  ├─ features/                  FeatureDefinition registry
│  │  └─ clock-voice/            schema, settings, announcer, controller,
│  │                             phrase, presets
│  ├─ content/index.ts           SPA-aware mount + settings listener
│  ├─ background/index.ts        settings authority + broadcasts
│  └─ ui/                        popup, options, shared components, theme
├─ tests/                        Vitest + jsdom + chess.com fixture
├─ docs/                         SELECTORS.md, SETTINGS_SCHEMA.md
├─ store/                        listing, privacy, icons, promo tile
├─ scripts/                      icons, package, version bump
├─ ARCHITECTURE.md
├─ DECISIONS.md
├─ CONTRIBUTING.md
├─ PUBLISHING.md
├─ CHANGELOG.md
└─ CLAUDE.md
```

## How it works

1. `ChessComClockProvider` reads two clock nodes, active-turn classes, the time-control label, and observed increments. It uses a `MutationObserver` plus a 100 ms interval, with a 30 ms debounce.
2. `ClockVoiceController` filters by master switch, category, scope, turn, and settle time.
3. `ClockAnnouncer` applies the effective threshold, cadence, once-per-second de-duplication, increment-jump reset, and settle windows.
4. `renderPhrase` replaces tokens; `WebSpeechEngine` cancels any previous utterance and speaks once.
5. The service worker is the only settings authority. Content, popup, and options use typed messages (`settings:get|patch|replace|reset`); the worker broadcasts `settings:changed`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the dependency rules, interfaces, message catalog, and increment flow. See [DECISIONS.md](DECISIONS.md) for the ADRs.

## Assumptions

- The **bottom clock is the player's clock** on chess.com live boards. Board orientation reflects color but does not move the clock panels. Change `getPlayerSide()` in `src/adapters/chesscom/provider.ts` and the fixture/tests if this changes.
- Threshold maximums are **category caps**, not the current game's base time: bullet 60 s, blitz 300 s, rapid 900 s, daily 3600 s.
- Time-control parsing is English-first. `3|2` means 3 minutes + 2 seconds; a paired base `<= 60` is treated as minutes unless the label says otherwise.
- The classifier is `base ≤ 180 && increment ≤ 1` → bullet, `base ≤ 300` → blitz, `base ≤ 3600` → rapid, else daily.
- Increment learning treats an upward jump of 0.8–15 s as an increment; larger jumps reset rather than teach.
- Whole seconds use `ceil`, so `0:09.3` is announced as 10.
- Speech uses the browser/OS voices; available voices and pronunciation vary by device.
- Only English ships, but every string goes through `chrome.i18n`.
- Selectors are **fixture-tested, not live-verified** in this repository. Verify on a real game before release.

## Documentation

| Document                                               | What it covers                                                                                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)                     | Layers, dependency rules, interfaces, messages, data flow, increment handling, storage, extension points                                            |
| [DECISIONS.md](DECISIONS.md)                           | ADRs for MV3, local TTS, schema UI, selectors, registries, sync storage, increment threshold, fair play, permissions, stack, presets, state machine |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Workflow, commits, code style, new feature/site/setting/TTS guides, test and PR checklist                                                           |
| [CHANGELOG.md](CHANGELOG.md)                           | Keep a Changelog history                                                                                                                            |
| [PUBLISHING.md](PUBLISHING.md)                         | Chrome Web Store account, build, listing, privacy, review, updates, rollback                                                                        |
| [docs/SELECTORS.md](docs/SELECTORS.md)                 | Selector table, fallback rules, DOM-change runbook, verification status                                                                             |
| [docs/SETTINGS_SCHEMA.md](docs/SETTINGS_SCHEMA.md)     | Field types, current keys/defaults, validation, add-a-setting example, migrations, presets                                                          |
| [CLAUDE.md](CLAUDE.md)                                 | Rules and commands for AI coding agents                                                                                                             |
| [store/LISTING.md](store/LISTING.md)                   | Store copy, single purpose, permission justifications, screenshot plan, promo text                                                                  |
| [store/PRIVACY.md](store/PRIVACY.md)                   | Plain-language privacy policy source                                                                                                                |
| [store/privacy-policy.html](store/privacy-policy.html) | Hostable privacy policy page                                                                                                                        |

## Adding a setting, feature, site, or engine

- **Setting:** [docs/SETTINGS_SCHEMA.md](docs/SETTINGS_SCHEMA.md).
- **Feature:** [CONTRIBUTING.md](CONTRIBUTING.md#add-a-new-feature).
- **Site adapter:** [CONTRIBUTING.md](CONTRIBUTING.md#add-a-new-site-adapter) and [docs/SELECTORS.md](docs/SELECTORS.md).
- **TTS engine:** [CONTRIBUTING.md](CONTRIBUTING.md#add-a-new-tts-engine).

The short version: settings are schema data; features register a `FeatureDefinition`; sites implement `ClockProvider` and keep selectors in one file; TTS implements `TtsEngine`. Core stays free of site and UI knowledge.

## Troubleshooting

- **Silent:** check OS voices, then use **Test voice** in options. On Linux, install a speech-dispatcher voice. Check the tab is not muted.
- **Wrong clock speaks:** confirm the bottom-clock assumption; update `getPlayerSide()` plus the fixture/test if chess.com changes placements.
- **No announcements after a site update:** update fallbacks in `src/adapters/chesscom/selectors.ts` and the fixture, following [docs/SELECTORS.md](docs/SELECTORS.md).
- **Debug logs:** in the chess.com tab console run `localStorage.setItem('ccv:debug','1')` and reload. Service-worker logs are prefixed `[ChessClockVoice]`.
- **Speech lags:** lower the rate and shorten the phrase; the UI flags phrases over the estimated duration limit. The engine cancels before each utterance, but OS synthesis can still be slow.

## Privacy and fair play

The extension has no server, accounts, analytics, telemetry, or remote code. Settings (thresholds, toggles, voice, phrase, presets) are stored in `chrome.storage.sync`; no game data is stored. The content script reads only clock text, turn state, the time-control label, and clock placement on `https://*.chess.com/*`. The only output is local speech. See [store/PRIVACY.md](store/PRIVACY.md).

Chess Clock Voice is an independent project and is not affiliated with chess.com.

## License

No license file is included. All rights are reserved by the project owner.

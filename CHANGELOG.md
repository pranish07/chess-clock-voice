# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Expanded documentation set: architecture, ADRs, selector runbook, settings schema guide, contributing guide, agent rules, consolidated store listing, privacy source, and publishing runbook.

### Changed

- Store documentation consolidated under `store/LISTING.md` and `store/PRIVACY.md`.

### Fixed

- Nothing yet.

### Security

- No known issues.

## [1.0.0] - 2026-10-22

First packaged release. Not yet published to the Chrome Web Store.

### Added

- Manifest V3 extension for chess.com live games.
- Spoken low-time alerts with per-time-control thresholds: bullet 50 s, blitz 20 s, rapid 20 s, daily off by default.
- Clock scope: mine, opponent, or both.
- Whole-second announcements with `ceil` behavior and once-per-second de-duplication.
- Time-control parsing for `3|2`, `3+2`, `10+5`, `3 min`, `30 sec`, and `1 day`.
- Observed increment learning from 0.8–15 s clock jumps.
- Increment-aware effective threshold (`max(5, threshold - increment)`).
- Settle windows and jump resets for bullet/premove play.
- Cadence modes: every second, panic (≤10 s or every 5 s), and milestones.
- Phrase tokens `{seconds}`, `{increment}`, `{timeControl}` with a 40-character limit and 1.4 s estimated-duration limit.
- Voice, language, rate, pitch, volume, and Test voice.
- Five built-in presets and up to 20 custom presets stored as data.
- Schema-driven popup and options page with light/dark theme and inline validation.
- Master switch in popup and options.
- Typed settings messages and a service-worker settings authority.
- `chrome.storage.sync` persistence with schema version 2 and migrations from the legacy flat shape.
- Minimal permissions: `storage` and `https://*.chess.com/*`.
- Local Web Speech synthesis; no network requests, analytics, accounts, or remote code.
- Test suite: 44 tests across 7 files (parser, adapter fixture, announcer, time control, phrase, migrations, validation).
- Icons 16/48/128 and a 440×280 promo tile.
- Store listing, privacy policy, permission justification, screenshot plan, and publishing runbook.

### Changed

- Clock side is assumed to be the bottom clock on chess.com live boards; board orientation is not used to swap sides.
- Threshold maximums are category caps: bullet 60, blitz 300, rapid 900, daily 3600 seconds.

### Security

- No data collection and no remote code. The content script reads clock text, running state, time-control label, and clock placement only.

## [0.1.0] - 2026-10-01

Initial implementation milestone. Not published.

### Added

- TypeScript + Vite + CRXJS project scaffold.
- Core event bus, logger, i18n, typed messages, time-control rules, and versioned settings storage.
- chess.com `ClockProvider`, clock parser, and centralized selectors.
- `TtsEngine` + `WebSpeechEngine`.
- Clock voice feature, schema, defaults, announcer, controller, and preset data.
- Popup and options UI with shared schema renderer.
- Initial unit tests and a chess.com fixture.

# Architecture Decision Records

Each record uses the same format: ID, title, status, context, decision, consequences, alternatives. These records describe the system as built; if code and an ADR disagree, fix one in the same PR.

- [Architecture](ARCHITECTURE.md)
- [README](README.md)
- [Contributing](CONTRIBUTING.md)

---

## ADR-001: Ship Manifest V3 only

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

Chrome is the target platform and the Chrome Web Store requires Manifest V3 for new listings. The extension needs a background settings authority, a content script, a popup, and an options page.

### Decision

Use Manifest V3 only: a module service worker, declared content scripts, `action.default_popup`, and `options_ui`. Do not maintain a Manifest V2 build.

### Consequences

- The extension is eligible for the Chrome Web Store.
- The service worker is ephemeral; settings must live in storage, not worker globals. `SettingsStore` is reconstructed and warmed on install/startup/message.
- Communication is asynchronous and typed through `chrome.runtime` messages.
- CRXJS handles the MV3 dev/build shape.

### Alternatives considered

- **Manifest V2:** rejected; not accepted for new Web Store items and being phased out.
- **Firefox-first WebExtensions:** rejected; the product target is chess.com on Chrome, and a Firefox build would add a second manifest/maintenance path.

---

## ADR-002: Use the Web Speech API instead of cloud TTS

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

The extension must speak short phrases with very low latency while a chess clock is ticking. A cloud TTS service would require network requests, an API key, a privacy disclosure, and error handling for offline play. The Chrome Web Store treats remote code and unnecessary data flows as review risks.

### Decision

Implement `WebSpeechEngine` on `window.speechSynthesis` and `SpeechSynthesisUtterance`. Cancel the previous utterance before each new one. Expose voice selection, language, rate, pitch, and volume. Keep the engine behind `TtsEngine`, so another implementation can be added later.

### Consequences

- No audio leaves the device; no server or API key.
- Voices and pronunciation depend on the OS/browser. The UI offers a test button and a voice picker.
- Some platforms have slow or missing voices; the controller de-duplicates and cancels but cannot guarantee instant audio.
- Cloud TTS is still possible later by implementing `TtsEngine`; it would require a new ADR, permissions, privacy policy changes, and store justification.

### Alternatives considered

- **Cloud TTS (Google/Amazon/Azure):** rejected for latency, privacy, cost, and review complexity.
- **Bundled audio samples for 1–60:** rejected; large, inflexible, and poor for custom phrases.
- **`chrome.tts`:** viable, but less direct control over picking installed voices in the page context and unnecessary for this scope.

---

## ADR-003: Generate all settings UI from one schema

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

The popup and options page show the same settings in different densities. Hand-writing each control twice invites drift, missing validation, and duplicated locale keys.

### Decision

Define settings as `SettingsSchema` data in `src/features/clock-voice/schema.ts` plus the app-level master section. Render it with `SchemaForm` on both surfaces. Use `surfaces: ['popup' | 'options']` to filter sections and fields. Every field has a `path`, `labelKey`, `kind`, and kind-specific metadata. UI code never hardcodes a feature field.

### Consequences

- Adding a normal setting is a schema edit plus type/default/normalize/validation/locale changes; no popup or options markup changes.
- Both pages share validation display, theming, and controls.
- A new control shape needs a new `SettingsField` kind and a renderer component.
- Complex bespoke interactions still belong in a component referenced by a dedicated kind (e.g. `preset-gallery`), not in page code.

### Alternatives considered

- **Separate hand-written forms:** rejected; duplicated and easy to desynchronize.
- **Server-driven JSON schema:** rejected; the extension is offline and the schema ships with the bundle.
- **A form library:** rejected; the schema is small, and a custom renderer keeps the bundle and dependency surface small.

---

## ADR-004: Keep every site selector in one file per adapter

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

chess.com changes its DOM. Selectors scattered across providers, features, and content code are hard to audit and slow to patch. A single change should not require a search across the repo.

### Decision

Put all chess.com selector lists in `src/adapters/chesscom/selectors.ts` as ordered fallbacks. Provider logic may query those lists but must not inline selectors. The adapter test fixture mirrors the live DOM and is updated with the selector file.

### Consequences

- A DOM change is a one-file patch plus fixture/test refresh.
- Fallback order is explicit and reviewable.
- The file can become a list of stale guesses; it must be re-verified against the live site and pruned.
- Other adapters repeat the pattern with their own `selectors.ts`.

### Alternatives considered

- **Selectors colocated with each query:** rejected; impossible to audit.
- **A remote selector config:** rejected; remote code/config is a review and privacy risk.
- **A generic heuristic scraper:** rejected; too fragile and risks reading non-clock content.

---

## ADR-005: Use adapter and feature registries

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

The roadmap includes other sites (for example lichess) and other features without touching core. The content script also needs to mount only what applies to the current URL.

### Decision

- Adapters implement `ClockProvider` and register a `ClockProviderFactory` in `src/adapters/registry.ts`. `createClockProviderFor(url)` picks the first matching factory.
- Features implement `FeatureDefinition` (aliased as `FeatureModule`) and register in `src/features/registry.ts`. `featuresForUrl(url)` filters by URL; clock-voice matches all URLs and relies on the `ClockProvider` to gate site support.
- App defaults, normalization, validation, and the full schema iterate the feature registry.

### Consequences

- Adding a feature or site is additive at the edges; `core/` stays untouched.
- Registries are code-level, not runtime plugins. Registration is explicit and tree-shakeable.
- Features must not import each other or the UI; shared behavior belongs in `core/`.
- A feature that needs a new permission still requires a manifest change, docs, and an ADR.

### Alternatives considered

- **Hardcoded conditionals in content script:** rejected; grows without bound.
- **Dynamic plugin loading:** rejected; remote code and CSP/review problems.
- **A dependency-injection container:** rejected; overkill for two small registries.

---

## ADR-006: Store settings in chrome.storage.sync with versioned migrations

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

Users expect settings to survive browser restarts and, ideally, follow their Chrome profile. The schema will evolve. The service worker is the only long-lived authority but can be terminated at any time. Game data must never be stored.

### Decision

Store one `settings` object in `chrome.storage.sync`, with an app-level `version` (currently 2) and feature slices under `features`. Run `migrateAppSettings` on every read, then normalize, then write back if the shape/version changed. Only the service worker constructs the real store. `memoryArea()` supports tests. All writes are validated first.

### Consequences

- Settings follow Chrome Sync when the user enables it.
- No game or personal data is stored; only configuration.
- Sync quota limits apply (verify current `chrome.storage.sync` quotas); the payload is small, but custom presets are capped at 20.
- Last write wins if two devices edit simultaneously; there is no merge protocol.
- Every shape change needs a version bump, migration, and test.
- `chrome.storage.sync` is not encrypted end-to-end by the extension; users should not put secrets in preset names/phrases. The UI does not invite that.

### Alternatives considered

- **`localStorage` on chess.com:** rejected; shared with the site, fragile across SPA navigation, and not available to the service worker.
- **`chrome.storage.local`:** rejected; does not follow the user across signed-in browsers.
- **A server-side profile:** rejected; accounts, privacy, and operational cost with no product need.

---

## ADR-007: Apply an increment-aware effective threshold

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

In increment games, a clock at 20 seconds will soon receive extra time. Announcing at the raw threshold can feel early and noisy. The product spec calls for increment-aware thresholds.

### Decision

When `incrementAware` is true and the increment is known, use `max(5, threshold - increment)`. Take the increment from the parsed time-control label when available, otherwise from observed jumps (0.8–15 s). The announcer also tracks jump deltas and uses the larger of the configured/observed values. On an upward jump greater than 0.75 s, clear the announced set, learn a 1–15 s increment, and wait `settleMs`.

### Consequences

- A 20 s threshold with a 2 s increment starts at 18 s.
- The 5 s floor prevents a zero/negative threshold.
- False jump detection can shift the threshold; the 15 s cap and settle window limit damage, and a huge jump clears the learned value.
- The behavior is covered by announcer and parser tests.

### Alternatives considered

- **Ignore increment:** rejected; poor experience in increment games.
- **Add increment instead of subtract:** rejected; would announce later, defeating the purpose.
- **Trust only the label:** rejected; some views omit it, so observed jumps are a useful fallback.

---

## ADR-008: Never read the board (fair play)

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

A chess extension that reads the position can be used for engine assistance. The product is a clock accessibility/time-management aid, and the store listing must be unambiguous.

### Decision

The adapter reads only clock text, active-turn classes, time-control label, and clock placement. `ClockSnapshot` has no board/piece/move field. The extension does not read the move list, evaluation, chat, or account data, does not call chess.com APIs, and does not modify game state.

### Consequences

- The extension cannot implement board-aware features without violating the architecture.
- Reviewers and users get a clear single purpose.
- Some potential features (e.g. “announce when the opponent blunders”) are permanently out of scope.
- Enforcement is by interface design and code review, not a runtime sandbox.

### Alternatives considered

- **Read the board for “helpful” context:** rejected; cheating risk and scope creep.
- **Read the move list to detect turns:** rejected; the clock's running class is sufficient and less invasive.
- **Interact with chess.com controls:** rejected; unnecessary and risky.

---

## ADR-009: Keep permissions minimal

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

Chrome Web Store review and user trust depend on justifying every permission. The extension needs settings storage and access to chess.com game pages only.

### Decision

Request exactly:

- `storage` — persist settings/presets.
- Host permission `https://*.chess.com/*` — declare the content script that reads the clock.

Do not request `tabs`, `scripting`, `cookies`, `webRequest`, `history`, clipboard, downloads, or `<all_urls>`. The service worker queries chess.com tabs using the host permission to broadcast settings; this works without the `tabs` permission. The content script is statically declared; no scripting injection is needed.

### Consequences

- The install prompt is narrow and explainable.
- Store permission justification is short and matches the code.
- Adding a site or permission requires an ADR, manifest change, privacy update, and new review.
- The extension cannot observe tabs outside chess.com.

### Alternatives considered

- **`<all_urls>` + runtime checks:** rejected; broad permission for no benefit.
- **`tabs` for broadcasts:** rejected; unnecessary with the host permission.
- **`scripting` + dynamic injection:** rejected; static content scripts are simpler and reviewable.

---

## ADR-010: TypeScript, Vite, CRXJS, React, Tailwind, Vitest

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

The extension needs typed messaging and settings, a fast dev loop for an MV3 bundle, a small UI, and tests that run in jsdom.

### Decision

Use TypeScript strict mode, Vite 5 with `@crxjs/vite-plugin`, React 18, Tailwind 3, Vitest 2 + jsdom, ESLint 9 flat config, and Prettier. Use React rather than Preact for familiar ecosystem behavior; the UI is small enough that bundle size is acceptable.

### Consequences

- Typed interfaces are shared across content, background, and UI.
- CRXJS generates the MV3 manifest/bundle and supports dev loading from `dist/`.
- Service-worker dynamic imports of local chunks are bundled and exposed as web-accessible resources by CRXJS; this is local code, not remote code.
- Build output must be checked after dependency upgrades; CRXJS manifest generation can duplicate match entries (functionally harmless).
- React adds bundle weight (~50 KB gzipped for the UI chunk) but simplifies the schema renderer.

### Alternatives considered

- **Preact:** viable; rejected for team familiarity and ecosystem parity.
- **Webpack:** rejected; slower loop and more config for this size.
- **No framework:** rejected; the schema renderer and preset interactions benefit from components/state.
- **Plain CSS:** rejected; Tailwind keeps the two surfaces consistent with little CSS.

---

## ADR-011: Presets are data, not code

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

Users want quick “use cases” (numbers only, panic mode, coach voice, etc.) and the ability to save their own. Presets that execute code would create a remote/dynamic-code surface and complicate review.

### Decision

Built-in presets are a typed data array (`BUILT_IN_PRESETS`) with locale keys, phrase, cadence, milestones, and optional rate. User presets are validated data stored in `features['clock-voice'].customPresets` (max 20). Applying a preset copies its values into the normal settings; it does not execute anything. Custom preset creation goes through `createCustomPreset` and normalization.

### Consequences

- No preset can run code or access storage directly.
- New built-ins are data + locale entries + optional tests.
- User presets sync with settings but are limited in size and count.
- A preset cannot express behavior outside the existing fields; new behavior needs a schema/code change.

### Alternatives considered

- **JavaScript preset functions:** rejected; dynamic code, security, and review risk.
- **Downloaded preset packs:** rejected; remote content and moderation burden.
- **No user presets:** rejected; the product explicitly offers custom use cases.

---

## ADR-012: Announce once per whole second with a pure state machine

- **Status:** Accepted
- **Date:** 2026-10-22

### Context

Clock text updates frequently (tenths under 10 seconds), and bullet/premove play can produce rapid or jumpy updates. Speaking every DOM mutation would queue audio and lag behind the clock.

### Decision

Use `ClockAnnouncer`, a pure per-side state machine:

- Convert `seconds` to `Math.ceil(seconds - 1e-6)` so `0:09.3` is second 10.
- Announce at most once per whole second via an `announced` set.
- Apply cadence: `every` (all whole seconds), `panic` (≤10 or multiples of 5), `milestones` (explicit list).
- Detect upward jumps >0.75 s, clear announced state, learn 1–15 s increments, and wait `settleMs`.
- Extend the settle window on smaller upward deltas.
- Reset the announced set when the clock is more than `threshold + 2`.
- Let the controller drop identical text within 800 ms and anything within 200 ms.

### Consequences

- Speech stays roughly one announcement per second without queueing.
- The current phrase may change without re-announcing the same second.
- The second spoken can be one higher than floor (`9.3` → `10`); this is intentional.
- The state machine is testable without DOM or audio.
- Aggressive settle values can skip a second in extreme bullet play; that is preferable to audio backlog.

### Alternatives considered

- **Speak on every mutation:** rejected; spam and queueing.
- **Floor instead of ceil:** rejected; a clock at 9.3 would say 9 while the display looks like 10 under 10 s.
- **Timer-based scheduler independent of clock text:** rejected; drifts and can speak after the game ends.
- **Global announcement lock:** rejected; it would suppress legitimate simultaneous clocks when scope is `both`.

---

## How to add a new ADR

1. Use the next number: `ADR-013`.
2. Copy the format above: title, status (`Proposed`, `Accepted`, `Superseded by ADR-XXX`, or `Deprecated`), date, context, decision, consequences, alternatives.
3. State the trade-off, not just the choice. Include what becomes harder.
4. Link the code path or PR that implements it.
5. If it supersedes an earlier ADR, update that ADR's status and link both ways.
6. Architectural changes (permissions, storage, fair-play boundary, message names, dependency rules) require an ADR before merge.

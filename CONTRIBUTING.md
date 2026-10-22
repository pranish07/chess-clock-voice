# Contributing

Thanks for improving Chess Clock Voice. The project is small on purpose: a clock reader, an announcer, local speech, and a schema-driven UI. Keep it that way.

- [README](README.md)
- [Architecture](ARCHITECTURE.md)
- [Decisions](DECISIONS.md)
- [Settings schema](docs/SETTINGS_SCHEMA.md)
- [Selectors](docs/SELECTORS.md)
- [Publishing](PUBLISHING.md)

## Prerequisites

- Node.js 20+ (tested on Node 25) and npm.
- Chrome/Chromium for manual extension testing.
- A chess.com account for live verification. Never commit game data, cookies, or personal screenshots.

```bash
npm install
npm run dev          # Vite + CRXJS, load dist/ unpacked
npm test             # 44 tests across 7 files
npm run test:watch
npm run lint
npm run format:check
npm run build
npm run package
```

## Workflow

1. Open an issue or describe the change in the PR. For architectural changes, write an ADR first ([DECISIONS.md](DECISIONS.md)).
2. Branch from the current main: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`, `test/<short-name>`, or `chore/<short-name>`.
3. Make one logical change per branch.
4. Add or update tests. A bug fix should have a failing test that now passes.
5. Run `npm run lint && npm test && npm run build` before opening the PR.
6. Open the PR with what changed, why, how it was tested, and any trade-offs. Include before/after screenshots for UI changes.

### Commit messages

Use Conventional Commits:

```text
feat(clock-voice): add per-category enable toggles
fix(chesscom): detect running clock after SPA navigation
docs(architecture): document storage migration rules
test(announcer): cover increment jump reset
chore(deps): update vite
```

Keep the subject imperative and under ~72 characters. Explain the why in the body. Do not commit generated `dist/`, `release/`, `node_modules/`, secrets, or personal data.

## Code style

- TypeScript strict mode. Prefer explicit types at module boundaries; let inference handle locals.
- Prettier formats everything; ESLint catches React hooks and JSX issues. Do not reformat unrelated code.
- No comments that restate the code. Comments explain a non-obvious decision or a site quirk.
- No `any` unless a platform boundary forces it; narrow `unknown` with guards.
- No new dependency without a reason and an ADR if it affects architecture, permissions, or the privacy story.
- Locale strings go in `public/_locales/en/messages.json`; do not hardcode user-visible English in components.
- Site selectors stay in `src/adapters/<site>/selectors.ts`.
- Settings controls stay in the schema; do not hardcode a feature field in `PopupApp` or `OptionsApp`.

## Add a new feature

A feature is a self-contained module registered in the feature registry. `FeatureModule` is an alias of `FeatureDefinition`.

1. Create `src/features/<id>/index.ts` and any private modules. Do not import another feature or the UI.
2. Export a `FeatureDefinition`:

```ts
import type { FeatureDefinition } from '../types';

export const exampleFeature: FeatureDefinition = {
  id: 'example',
  nameKey: 'featureExampleName',
  matches: () => true,
  settings: {
    schema: { sections: [] },
    defaults: {},
    normalize: (raw) => (raw && typeof raw === 'object' ? raw : {}),
    validate: () => [],
  },
  init(context) {
    context.logger.debug('Example feature mounted');
    return {
      dispose() {
        context.logger.debug('Example feature disposed');
      },
      onSettingsChanged(next) {
        context.logger.debug('Example feature settings changed', next.masterEnabled);
      },
    };
  },
};
```

This example is illustrative and is not registered. It shows the exact required shape. Site support is gated by the `ClockProvider`, so a site-agnostic feature can match every URL and still only run where an adapter exists.

3. Put settings under `features.<id>` and give every schema path that absolute prefix.
4. Implement `init(context)`; wire observers/timers and return `dispose()` that removes every listener and timer.
5. Register it in `src/features/registry.ts`:

```ts
import { exampleFeature } from './example';

export const FEATURES: FeatureDefinition[] = [clockVoiceFeature, exampleFeature];
```

6. Add locale strings for `nameKey` and every schema key.
7. App defaults, normalization, validation, and the options UI pick it up automatically because they iterate `FEATURES`.
8. Add tests for defaults/normalization/validation and, if it runs on a page, lifecycle cleanup.
9. If it needs a new permission or host, stop and write an ADR first.

### Feature checklist

- [ ] All state is disposable; no leaked intervals, observers, or speech.
- [ ] `onSettingsChanged` reacts to master off and relevant fields.
- [ ] Settings paths are absolute and normalized.
- [ ] No UI/persistence code in the feature.
- [ ] No board/chat/account reads.
- [ ] Tests and locale keys added.

## Add a new site adapter

Adapters are the only layer that knows a site's DOM. Read [docs/SELECTORS.md](docs/SELECTORS.md) first.

1. Create `src/adapters/<site>/selectors.ts`. Every selector and fallback list goes here.

```ts
export const EXAMPLE_SELECTORS = {
  clockContainers: ['.clock-component'],
  clockText: ['.clock-time'],
  turnClock: ['.clock-running'],
  timeControl: ['.time-control'],
  topClock: ['.clock-top'],
  bottomClock: ['.clock-bottom'],
} as const;

export function matchesExampleSite(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('example.com') && parsed.pathname.startsWith('/game/');
  } catch {
    return false;
  }
}
```

2. Create `provider.ts` implementing `ClockProvider`. Keep all DOM knowledge behind the interface; do not import features or UI.

```ts
import type { ClockProvider, ClockProviderFactory, ClockSnapshot } from '../types';
import { EXAMPLE_SELECTORS, matchesExampleSite } from './selectors';

export class ExampleClockProvider implements ClockProvider {
  readonly id = 'example';

  constructor(
    private readonly doc: Document,
    private readonly win: Window | null,
  ) {}

  matches(url: string): boolean {
    return matchesExampleSite(url);
  }

  getClocks(): ClockSnapshot | null {
    // Read the two clock panels and build a ClockSnapshot. Return null until
    // both clocks are present. Never read the board, moves, or account data.
    return null;
  }

  getTimeControl() {
    return {
      raw: null,
      category: null,
      baseSeconds: null,
      incrementSeconds: 0,
      incrementSource: 'none' as const,
    };
  }

  getPlayerSide() {
    return 'bottom' as const;
  }

  onTick(listener: (snapshot: ClockSnapshot) => void): () => void {
    // Attach an observer/poll, emit ClockSnapshot, and return an unsubscribe
    // that removes the observer, timer, and listener.
    void listener;
    return () => undefined;
  }

  destroy(): void {
    // Remove observers/timers/listeners.
  }
}

export const EXAMPLE_FACTORY: ClockProviderFactory = {
  id: 'example',
  matches: matchesExampleSite,
  create: (doc = document, win = doc.defaultView ?? undefined) =>
    new ExampleClockProvider(doc, win ?? null),
};
```

The `getClocks` body is deliberately empty in this skeleton; implement it against the fixture before registering. Do not leave a registered provider that cannot produce a snapshot.

3. Register the factory in `src/adapters/registry.ts`.
4. Add the site to `manifest.json` content-script matches and `host_permissions`. This requires an ADR, a privacy-policy update, and store permission justification.
5. Add a fixture:
   - save a trimmed, personal-data-free HTML snippet as `tests/fixtures/<site>-live.html`;
   - instantiate the provider with `new JSDOM(html)`'s `document`/`window`;
   - assert two clocks, top/bottom mapping, running side, time-control parse, and increment.
6. Verify live behavior in both colors and in increment/no-increment games. Update the selector doc's verification column only after live checks.
7. No changes are needed in `core/` or in clock-voice. The feature consumes `ClockProvider`.

## Add a new setting

Follow [docs/SETTINGS_SCHEMA.md](docs/SETTINGS_SCHEMA.md). Summary:

1. Add the field to `ClockVoiceSettings` (or the relevant feature type).
2. Add the default.
3. Normalize it (clamp/fallback, never throw).
4. Validate it if it has a meaningful invalid state.
5. Add a field descriptor to the schema at the absolute path.
6. Add `labelKey`/`helpKey`/`unitKey`/error strings to the locale file.
7. Consume it in the controller/announcer/engine.
8. Bump the settings version and write a migration only if the stored shape changes.
9. Add tests.
10. Do not add markup to the popup/options pages.

## Add a new TTS engine

1. Implement `TtsEngine` from `src/engines/tts/types.ts`:

```ts
import type { SpeakOptions, TtsEngine, TtsVoice } from './types';

export class ExampleTtsEngine implements TtsEngine {
  readonly id = 'example';

  isSupported(): boolean {
    return true;
  }

  speak(text: string, options?: SpeakOptions): void {
    void text;
    void options;
  }

  cancel(): void {}

  getVoices(): TtsVoice[] {
    return [];
  }

  onVoicesChanged(listener: (voices: TtsVoice[]) => void): () => void {
    void listener;
    return () => undefined;
  }
}
```

2. Instantiate it in the feature's `init` where `new WebSpeechEngine(window)` currently lives.
3. Preserve the contract: `speak()` should not queue indefinitely, and `cancel()` must stop current audio immediately.
4. Add tests with a fake engine; never rely on the OS voice in CI.
5. If the engine uses the network, stop: that changes the privacy policy, permissions, and requires an ADR. Cloud TTS is out of scope by default.

## Tests

- **Pure logic:** parser, announcer, phrase, validation, migrations. Fast; no DOM.
- **Adapter:** jsdom + fixture. No live site in CI.
- **Storage:** `memoryArea()`, never real `chrome.storage`.
- **UI:** if you add a new field kind, test rendering and value changes.
- **Gemini/fixtures:** strip usernames, avatars, chat, and account data before committing HTML.
- Do not mock the module under test. Mock only platform boundaries (`chrome.*`, `speechSynthesis`, timers when necessary).
- Clean up timers/listeners in tests; avoid real 100 ms loops where a fake clock is clearer.

Commands:

```bash
npm test
npm run test:watch
npm run lint
npm run format:check
npx tsc --noEmit
```

## PR checklist

- [ ] One logical change; description explains why.
- [ ] `npm run lint`, `npm test`, and `npm run build` pass.
- [ ] Tests added/updated for behavior changes.
- [ ] No new permissions or host matches without an ADR and privacy update.
- [ ] No selectors outside the adapter's `selectors.ts`.
- [ ] No direct `chrome.storage` access outside the service worker.
- [ ] No hardcoded settings UI outside the schema.
- [ ] No board/move/chat/account reads.
- [ ] No remote code, analytics, or network calls.
- [ ] Locale strings added; no user-visible hardcoded English.
- [ ] Docs updated: README/ARCHITECTURE/DECISIONS/settings/selectors/PUBLISHING as applicable.
- [ ] Manual smoke test on a real chess.com game for DOM/audio changes (both colors, bullet, blitz, increment).
- [ ] No personal data, cookies, secrets, `dist/`, or `release/` in the diff.

## Reporting security or fair-play issues

Do not open a public issue with exploit details. Use the support contact on the store listing or a private repository security advisory. Fair-play concerns (anything that reads the board or suggests moves) are treated as architecture violations and are not accepted.

# Settings Schema

One schema drives both the popup and the options page. The schema is data; the renderer is generic. This document explains the field types, current keys, validation, migrations, and presets.

- [Architecture](../ARCHITECTURE.md)
- [Selectors](SELECTORS.md)
- [Contributing](../CONTRIBUTING.md)

## Where the schema lives

| Piece                                    | File                                 | Role                                                                                                       |
| ---------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Field/section types and path helpers     | `src/core/settings/schema.ts`        | `SettingsField`, `SettingsSchema`, `getPathValue`, `setPathValue`, `schemaSections`                        |
| App-level master section and composition | `src/app/settings.ts`                | `appSchema`, `getFullSchema()`, defaults, migrations, validation                                           |
| Feature sections                         | `src/features/clock-voice/schema.ts` | `clockVoiceSchema`                                                                                         |
| Renderer                                 | `src/ui/components/SchemaForm.tsx`   | Maps `kind` to a control                                                                                   |
| Specialized fields                       | `src/ui/components/`                 | `Toggle`, `Slider`, `SelectField`, `TextField`, `NumberListField`, `VoicePicker`, `PresetGallery`, actions |
| Locale strings                           | `public/_locales/en/messages.json`   | Every `labelKey`, `helpKey`, `textKey`, option label, unit, and error                                      |

Paths are absolute from the root of `AppSettings`:

- `masterEnabled`
- `features.clock-voice.clockScope`
- `features.clock-voice.timeControls.bullet.threshold`
- `features.clock-voice.customPresets`

The UI imports `getFullSchema()` and filters with `schemaSections(schema, surface)`. There is no schema-over-message call.

## Field types

All fields extend `BaseField`:

| Property   | Required | Meaning                                                     |
| ---------- | -------- | ----------------------------------------------------------- |
| `path`     | Yes      | Dot path from the settings root; `''` for actions/info      |
| `labelKey` | Yes      | Locale key for the label                                    |
| `helpKey`  | No       | Locale key for supporting text                              |
| `surfaces` | No       | Restrict to `popup`, `options`, or both; omitted means both |

| `kind`           | Extra properties                                                         | Rendered as                                             | Notes                                                      |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| `boolean`        | —                                                                        | Toggle                                                  | Value is `boolean`                                         |
| `select`         | `options: { value, labelKey }[]`, `inline?`                              | Select or inline segmented control                      | Value is a string                                          |
| `slider`         | `min`, `max`, `step`, `unitKey?`, `showInput?`                           | Range slider, optional numeric input                    | Numeric value                                              |
| `number`         | `min`, `max`, `step`, `unitKey?`                                         | Number input                                            | Defined for future fields; no current field uses it        |
| `text`           | `maxLength?`, `placeholderKey?`, `tokens?`, `showSpeechMetrics?`         | Text input with token buttons and optional live metrics | Value is a string                                          |
| `numberList`     | `min`, `max`, `placeholder?`                                             | Comma/space-separated integer list                      | Value is `number[]`                                        |
| `voice`          | `langPath`                                                               | Voice select plus language select                       | Writes `voiceURI` at `path`; writes language at `langPath` |
| `action`         | `action: 'test-voice' \| 'open-options' \| 'reset-settings'`, `variant?` | Button                                                  | No stored value                                            |
| `preset-gallery` | —                                                                        | Built-in/custom preset cards plus a save form           | Backed by `customPresets`                                  |
| `info`           | `textKey`                                                                | Informational panel                                     | No stored value                                            |

`SettingsSection` has `id`, `titleKey`, optional `descriptionKey`, `fields`, and optional `surfaces`. A section disappears if its surface filter removes all fields.

## Current settings and defaults

### App level

| Path            | Type    | Default | Validation           | UI              |
| --------------- | ------- | ------- | -------------------- | --------------- |
| `version`       | number  | `2`     | Stamped by the store | Not rendered    |
| `masterEnabled` | boolean | `true`  | —                    | Popup + options |

### Clock voice feature

| Path                            | Type                                 | Default            | Validation / normalization                                           | UI                                                           |
| ------------------------------- | ------------------------------------ | ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `clockScope`                    | `'mine' \| 'opponent' \| 'both'`     | `'mine'`           | Falls back to `mine`                                                 | Popup + options                                              |
| `incrementAware`                | boolean                              | `true`             | Falls back to `true`                                                 | Options                                                      |
| `settleMs`                      | number                               | `300`              | Clamped 0–2000, integer                                              | **Not currently surfaced**; consumed by controller/announcer |
| `voiceURI`                      | string                               | `''`               | Trimmed, max 500                                                     | Options voice picker                                         |
| `rate`                          | number                               | `1`                | 0.5–2                                                                | Options slider                                               |
| `pitch`                         | number                               | `1`                | 0–2                                                                  | Options slider                                               |
| `volume`                        | number                               | `1`                | 0–1                                                                  | Options slider                                               |
| `lang`                          | string                               | `'en-US'`          | Non-empty, max 35                                                    | Options language select                                      |
| `phrase`                        | string                               | `'{seconds}'`      | Non-empty, ≤ 40 chars, allowed tokens, ≤ 1.4 s estimated             | Options text + metrics                                       |
| `cadence`                       | `'every' \| 'panic' \| 'milestones'` | `'every'`          | Falls back to `every`                                                | Options select                                               |
| `milestones`                    | number[]                             | `[10, 5, 3, 2, 1]` | 1–3600, rounded, unique, max 12; required if cadence is `milestones` | Options number list                                          |
| `timeControls.bullet.enabled`   | boolean                              | `true`             | Falls back to default                                                | Options                                                      |
| `timeControls.bullet.threshold` | number                               | `50`               | 1–60                                                                 | Options slider + input                                       |
| `timeControls.blitz.enabled`    | boolean                              | `true`             | Falls back to default                                                | Options                                                      |
| `timeControls.blitz.threshold`  | number                               | `20`               | 1–300                                                                | Options slider + input                                       |
| `timeControls.rapid.enabled`    | boolean                              | `true`             | Falls back to default                                                | Options                                                      |
| `timeControls.rapid.threshold`  | number                               | `20`               | 1–900                                                                | Options slider + input                                       |
| `timeControls.daily.enabled`    | boolean                              | `false`            | Falls back to default                                                | Options                                                      |
| `timeControls.daily.threshold`  | number                               | `20`               | 1–3600                                                               | Options slider + input                                       |
| `customPresets`                 | `CustomPreset[]`                     | `[]`               | Max 20; each normalized/validated                                    | Options preset gallery                                       |

Thresholds are **category caps**, not the current game's base time. Bullet is capped at 60 s even if the game is 1 minute; blitz at 300; rapid at 900; daily at 3600. This is intentional.

## Validation rules

Validation runs in the service worker before `replace`/`patch` persistence and in the options page for inline errors. Normalization is forgiving; validation is strict.

| Rule                                                               | Error code            |
| ------------------------------------------------------------------ | --------------------- |
| Each threshold is an integer from 1 to the category cap            | `errorThresholdRange` |
| `rate` is 0.5–2                                                    | `errorRateRange`      |
| `pitch` is 0–2                                                     | `errorPitchRange`     |
| `volume` is 0–1                                                    | `errorVolumeRange`    |
| Phrase is non-empty after trim                                     | `errorPhraseEmpty`    |
| Phrase length ≤ 40 characters                                      | `errorPhraseLength`   |
| Only `{seconds}`, `{increment}`, `{timeControl}` tokens            | `errorPhraseToken`    |
| Estimated speech ≤ 1.4 seconds (sample: 20, 2, `blitz`)            | `errorPhraseDuration` |
| Milestones non-empty, integers 1–3600 when cadence is `milestones` | `errorMilestones`     |
| Custom preset has a non-empty name ≤ 60 chars                      | `errorPresetName`     |
| Custom preset phrase passes phrase validation                      | `errorPresetPhrase`   |

The duration estimate is deterministic, not a real audio measurement: about 3.2 words/second plus 0.25 s and a 0.2 s digit penalty. The UI uses the same function, so the meter and the error agree.

## Add a setting end to end: `settleMs`

`settleMs` already exists in the type, defaults, normalization, and controller, but it is not exposed in the schema. This is a complete example of surfacing it. No new runtime behavior is needed.

### 1. The field already exists

```ts
// src/features/clock-voice/settings.ts
export interface ClockVoiceSettings {
  // ...
  settleMs: number;
}

export const clockVoiceDefaults: ClockVoiceSettings = {
  // ...
  settleMs: 300,
};
```

`normalizeClockVoice` clamps it:

```ts
settleMs: clampInt(value.settleMs, clockVoiceDefaults.settleMs, 0, 2000),
```

### 2. Add a schema field

In `src/features/clock-voice/schema.ts`, add to `generalSection.fields`:

```ts
{
  kind: 'slider',
  path: `${base}.settleMs`,
  labelKey: 'settleLabel',
  helpKey: 'settleHelp',
  min: 0,
  max: 2000,
  step: 50,
  unitKey: 'unitMilliseconds',
  showInput: true,
}
```

That is enough for both surfaces to render it (the section is options-only; add `surfaces: ['popup']` only if you also want it in the popup).

### 3. Add locale strings

In `public/_locales/en/messages.json`:

```json
"settleLabel": { "message": "Settle delay" },
"settleHelp": {
  "message": "Wait this long after a move or increment before speaking, so the clock can settle."
},
"unitMilliseconds": { "message": "ms" }
```

### 4. Validation

The normalizer already clamps the value. If you want an inline error instead of silent clamping, add a rule in `validateClockVoice`:

```ts
if (value.settleMs < 0 || value.settleMs > 2000) {
  errors.push({ path: `${CLOCK_VOICE_BASE}.settleMs`, code: 'errorSettleRange' });
}
```

Then add `errorSettleRange` to the locale file. Remember that normalization runs first in the service worker, so an out-of-range stored value is clamped before validation unless you also tighten normalization.

### 5. Behavior

No controller change is required; `ClockVoiceController` uses `settings.settleMs` for the turn settle window and passes it to the announcer.

### 6. Tests

- Add a settings validation test for a representative bad value if you added a rule.
- Add a renderer smoke test only if the new kind needs one; slider is already covered by the renderer.
- Run:

```bash
npm run lint
npm test
npm run build
```

## Migration guide

Bump the version when the **stored shape** changes in a way normalization cannot infer (renamed keys, moved data, new required meaning). Adding a new field with a safe default does not require a bump, but it still needs normalization and a test.

Current version: `APP_SETTINGS_VERSION = 2` in `src/app/settings.ts`.

### 1. Bump the version

```ts
export const APP_SETTINGS_VERSION = 3;
```

### 2. Add a migration branch

```ts
export function migrateAppSettings(raw: unknown): AppSettings {
  if (!isObject(raw)) return createDefaultSettings();

  const version = typeof raw.version === 'number' ? raw.version : 0;
  let working: Record<string, unknown> = raw;

  if (version < 1) {
    working = migrateLegacy(raw);
  } else if (version < 2) {
    // existing v1 → v2 handling
  }

  if ((version as number) < 3) {
    const features = isObject(working.features) ? { ...working.features } : {};
    const clock = isObject(features[CLOCK_VOICE_ID]) ? { ...features[CLOCK_VOICE_ID] } : {};
    // Example: rename settleMs -> settleWindowMs
    // clock.settleWindowMs = clock.settleWindowMs ?? clock.settleMs;
    // delete clock.settleMs;
    features[CLOCK_VOICE_ID] = clock;
    working = { ...working, features };
  }

  return normalizeAppSettings(working);
}
```

Rules:

- Migrations must be idempotent and must not throw on partial/garbage data.
- Read through `isObject` guards; stored data may be from an older or corrupted version.
- Do not delete user presets or reset unrelated settings.
- After migration, `normalizeAppSettings` fills defaults and clamps values for every registered feature.
- `SettingsStore.get()` writes the normalized object back, so the migration result persists.
- If the stored version is newer than the code, the code normalizes to the current shape. Do not pretend to understand future fields.

### 3. Tests

Add to `tests/settings-migrations.test.ts` using `memoryArea()`:

```ts
const area = memoryArea({
  settings: { version: 2, masterEnabled: true, features: {/* old shape */} },
});
const store = new SettingsStore<AppSettings>({
  area,
  defaults: createDefaultSettings(),
  version: APP_SETTINGS_VERSION,
  migrate: migrateAppSettings,
  normalize: normalizeAppSettings,
});

const loaded = await store.get();
expect(loaded.version).toBe(3);
expect(/* migrated value */).toBe(/* expected */);
```

Also assert that a second `get()` is stable (no migration loop) and that unknown keys are dropped or preserved intentionally.

## Presets

Presets are data, never executable code.

### Built-in presets

`BUILT_IN_PRESETS` in `src/features/clock-voice/presets.ts`:

| ID             | Name key            | Phrase                   | Cadence      | Milestones         | Rate    |
| -------------- | ------------------- | ------------------------ | ------------ | ------------------ | ------- |
| `numbers-only` | `presetNumbersName` | `{seconds}`              | `every`      | `[]`               | default |
| `seconds-left` | `presetSecondsName` | `{seconds} seconds left` | `every`      | `[]`               | default |
| `panic`        | `presetPanicName`   | `{seconds}`              | `panic`      | `[]`               | default |
| `minimal`      | `presetMinimalName` | `{seconds}`              | `milestones` | `[10, 5, 3, 2, 1]` | default |
| `coach`        | `presetCoachName`   | `{seconds} seconds left` | `every`      | `[]`               | `0.85`  |

Applying a preset copies `phrase`, `cadence`, `milestones`, and `rate` (when present) into the draft. It does **not** change voice, language, volume, pitch, clock scope, or per-time-control thresholds.

### Custom presets

`CustomPreset` stores `id`, `name`, `description`, `phrase`, `cadence`, `milestones`, optional `rate`, and `createdAt`.

- Created with `createCustomPreset(name, phrase, cadence, milestones, rate)`.
- Normalized on every load: name max 60, description max 120, phrase max 40, cadence fallback, milestones 1–3600 unique max 12, rate 0.5–2, ID fallback.
- Stored in `features.clock-voice.customPresets`, max 20 after normalization.
- Saving from the UI validates the current phrase first, appends the preset, and persists the whole settings object. Deleting a preset edits the draft; the user must save.
- Custom presets sync with the rest of settings and contain no personal data by design. The UI does not ask for a description.

### Adding a built-in preset

1. Add a `BuiltInPreset` object to `BUILT_IN_PRESETS`.
2. Add `nameKey` and `descriptionKey` strings to the locale file.
3. Ensure the phrase passes `validatePhrase`.
4. Add a test in `tests/phrase.test.ts` or the preset/validation tests.

No UI code changes are needed; `PresetGallery` maps the array.

## Adding a new field kind

1. Add the variant to `SettingsField`.
2. Implement the control in `SchemaForm`.
3. Add a locale-able label/help/error strategy.
4. Keep the field’s value serializable and normalizable.
5. Add a renderer test or a settings round-trip test.
6. Document it in the field table above.

Do not add feature-specific markup to `PopupApp` or `OptionsApp`; they should stay generic.

## Related

- [Architecture](../ARCHITECTURE.md)
- [Selectors](SELECTORS.md)
- [Contributing](../CONTRIBUTING.md)
- [Store listing](../store/LISTING.md)

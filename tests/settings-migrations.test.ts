import { describe, expect, it } from 'vitest';
import {
  APP_SETTINGS_VERSION,
  createDefaultSettings,
  migrateAppSettings,
  normalizeAppSettings,
  validateAppSettings,
} from '@/app/settings';
import { CLOCK_VOICE_ID, getClockVoiceSettings } from '@/features/clock-voice/settings';
import { memoryArea, SettingsStore } from '@/core/settings/storage';
import type { AppSettings, DeepPartial } from '@/core/settings/types';

describe('settings migration', () => {
  it('returns defaults for garbage', () => {
    const migrated = migrateAppSettings('nonsense');
    expect(migrated.version).toBe(APP_SETTINGS_VERSION);
    expect(migrated.masterEnabled).toBe(true);
    expect(validateAppSettings(migrated)).toEqual([]);
  });

  it('migrates the flat v0 shape', () => {
    const migrated = migrateAppSettings({
      threshold: 35,
      enabled: true,
      voiceURI: 'voice-1',
      rate: 1.25,
      pitch: 0.9,
      volume: 0.6,
      lang: 'en-GB',
      phrase: '{seconds} seconds left',
      clockScope: 'both',
      customPresets: [
        {
          id: 'legacy-preset',
          name: 'Legacy',
          phrase: '{seconds}',
          cadence: 'every',
          milestones: [10, 5],
          createdAt: 123,
        },
      ],
    });

    expect(migrated.version).toBe(APP_SETTINGS_VERSION);
    expect(migrated.masterEnabled).toBe(true);
    const clock = getClockVoiceSettings(migrated);
    expect(clock.timeControls.blitz.threshold).toBe(35);
    expect(clock.timeControls.rapid.threshold).toBe(35);
    expect(clock.timeControls.bullet.threshold).toBe(50);
    expect(clock.timeControls.daily.enabled).toBe(false);
    expect(clock.voiceURI).toBe('voice-1');
    expect(clock.rate).toBe(1.25);
    expect(clock.lang).toBe('en-GB');
    expect(clock.clockScope).toBe('both');
    expect(clock.customPresets[0]?.name).toBe('Legacy');
  });

  it('preserves v1 feature settings and fills new fields', () => {
    const migrated = migrateAppSettings({
      version: 1,
      masterEnabled: false,
      features: {
        [CLOCK_VOICE_ID]: {
          phrase: '{seconds}',
          cadence: 'panic',
          timeControls: {
            bullet: { enabled: false, threshold: 45 },
            blitz: { enabled: true, threshold: 30 },
            rapid: { enabled: true, threshold: 25 },
            daily: { enabled: false, threshold: 20 },
          },
        },
      },
    });

    expect(migrated.version).toBe(APP_SETTINGS_VERSION);
    expect(migrated.masterEnabled).toBe(false);
    const clock = getClockVoiceSettings(migrated);
    expect(clock.cadence).toBe('panic');
    expect(clock.incrementAware).toBe(true);
    expect(clock.milestones).toEqual([10, 5, 3, 2, 1]);
    expect(clock.timeControls.bullet).toEqual({ enabled: false, threshold: 45 });
    expect(clock.timeControls.blitz.threshold).toBe(30);
  });

  it('clamps invalid thresholds during normalization', () => {
    const normalized = normalizeAppSettings({
      version: 2,
      masterEnabled: true,
      features: {
        [CLOCK_VOICE_ID]: {
          timeControls: {
            bullet: { enabled: true, threshold: 999 },
            blitz: { enabled: true, threshold: -4 },
          },
        },
      },
    });
    const clock = getClockVoiceSettings(normalized);
    expect(clock.timeControls.bullet.threshold).toBe(60);
    expect(clock.timeControls.blitz.threshold).toBe(1);
  });
});

describe('SettingsStore', () => {
  const makeStore = (area = memoryArea()) =>
    new SettingsStore<AppSettings>({
      area,
      defaults: createDefaultSettings(),
      version: APP_SETTINGS_VERSION,
      migrate: migrateAppSettings,
      normalize: normalizeAppSettings,
    });

  it('creates, patches, and persists nested settings', async () => {
    const area = memoryArea();
    const store = makeStore(area);
    const initial = await store.get();
    expect(initial.version).toBe(APP_SETTINGS_VERSION);

    const patch: DeepPartial<AppSettings> = {
      features: { [CLOCK_VOICE_ID]: { rate: 1.5, clockScope: 'opponent' } },
    };
    const patched = await store.patch(patch);
    expect(getClockVoiceSettings(patched).rate).toBe(1.5);
    expect(getClockVoiceSettings(patched).clockScope).toBe('opponent');

    const stored = (await area.get('settings')).settings as AppSettings;
    expect(getClockVoiceSettings(stored).rate).toBe(1.5);
  });

  it('persists a migrated legacy value at the current version', async () => {
    const area = memoryArea({ settings: { threshold: 25, enabled: true } });
    const store = makeStore(area);
    const loaded = await store.get();
    expect(loaded.version).toBe(APP_SETTINGS_VERSION);
    expect(getClockVoiceSettings(loaded).timeControls.blitz.threshold).toBe(25);
    const stored = (await area.get('settings')).settings as AppSettings;
    expect(stored.version).toBe(APP_SETTINGS_VERSION);
  });
});

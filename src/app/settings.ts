import type { SettingsSchema } from '@/core/settings/schema';
import type { AppSettings, SettingsError } from '@/core/settings/types';
import { FEATURES } from '@/features/registry';
import {
  CLOCK_VOICE_ID,
  clockVoiceDefaults,
  normalizeClockVoice,
} from '@/features/clock-voice/settings';

export const APP_SETTINGS_VERSION = 2;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function createDefaultFeatures(): Record<string, unknown> {
  const features: Record<string, unknown> = {};
  for (const feature of FEATURES) {
    features[feature.id] = feature.settings.normalize(feature.settings.defaults);
  }
  return features;
}

export function createDefaultSettings(): AppSettings {
  return {
    version: APP_SETTINGS_VERSION,
    masterEnabled: true,
    features: createDefaultFeatures(),
  };
}

function migrateLegacy(raw: Record<string, unknown>): Record<string, unknown> {
  const legacyThreshold = Number(raw.threshold);
  const threshold = Number.isFinite(legacyThreshold) ? legacyThreshold : 20;
  const enabled = raw.enabled !== false;
  const features = isObject(raw.features) ? { ...raw.features } : {};
  features[CLOCK_VOICE_ID] = {
    clockScope: raw.clockScope,
    voiceURI: raw.voiceURI,
    rate: raw.rate,
    pitch: raw.pitch,
    volume: raw.volume,
    lang: raw.lang,
    phrase: raw.phrase,
    cadence: raw.cadence,
    milestones: raw.milestones,
    incrementAware: raw.incrementAware,
    timeControls: {
      bullet: {
        enabled,
        threshold: Number(raw.bulletThreshold) || clockVoiceDefaults.timeControls.bullet.threshold,
      },
      blitz: { enabled, threshold },
      rapid: { enabled, threshold },
      daily: { enabled: Boolean(raw.dailyEnabled), threshold },
    },
    customPresets: raw.customPresets,
  };
  return {
    version: APP_SETTINGS_VERSION,
    masterEnabled: raw.masterEnabled !== false,
    features,
  };
}

export function normalizeAppSettings(raw: unknown): AppSettings {
  const source = isObject(raw) ? raw : {};
  const features: Record<string, unknown> = isObject(source.features) ? { ...source.features } : {};

  for (const feature of FEATURES) {
    features[feature.id] = feature.settings.normalize(features[feature.id]);
  }

  return {
    version: APP_SETTINGS_VERSION,
    masterEnabled: typeof source.masterEnabled === 'boolean' ? source.masterEnabled : true,
    features,
  };
}

export function migrateAppSettings(raw: unknown): AppSettings {
  if (!isObject(raw)) return createDefaultSettings();

  const version = typeof raw.version === 'number' ? raw.version : 0;
  let working: Record<string, unknown> = raw;

  if (version < 1) {
    working = migrateLegacy(raw);
  } else if (version < 2) {
    const features = isObject(raw.features) ? { ...raw.features } : {};
    if (!features[CLOCK_VOICE_ID]) {
      working = migrateLegacy(raw);
    } else {
      working = {
        ...raw,
        version: APP_SETTINGS_VERSION,
        features: {
          ...features,
          [CLOCK_VOICE_ID]: normalizeClockVoice(features[CLOCK_VOICE_ID]),
        },
      };
    }
  }

  return normalizeAppSettings(working);
}

export function validateAppSettings(settings: AppSettings): SettingsError[] {
  const errors: SettingsError[] = [];
  for (const feature of FEATURES) {
    errors.push(...feature.settings.validate(settings));
  }
  return errors;
}

export const appSchema: SettingsSchema = {
  sections: [
    {
      id: 'master',
      titleKey: 'sectionMaster',
      descriptionKey: 'sectionMasterDesc',
      surfaces: ['popup', 'options'],
      fields: [
        {
          kind: 'boolean',
          path: 'masterEnabled',
          labelKey: 'masterToggleLabel',
          helpKey: 'masterToggleHelp',
          surfaces: ['popup', 'options'],
        },
      ],
    },
  ],
};

export function getFullSchema(): SettingsSchema {
  return {
    sections: [
      ...appSchema.sections,
      ...FEATURES.flatMap((feature) => feature.settings.schema.sections),
    ],
  };
}

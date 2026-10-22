import type { AppSettings, SettingsError } from '@/core/settings/types';
import {
  CATEGORY_META,
  TIME_CONTROL_CATEGORIES,
  isTimeControlCategory,
  type TimeControlCategory,
} from '@/core/time-control';
import { MAX_PHRASE_CHARS, validatePhrase } from './phrase';

export const CLOCK_VOICE_ID = 'clock-voice';
export const CLOCK_VOICE_BASE = `features.${CLOCK_VOICE_ID}`;

export type ClockScope = 'mine' | 'opponent' | 'both';
export type Cadence = 'every' | 'panic' | 'milestones';

export interface TimeControlConfig {
  enabled: boolean;
  threshold: number;
}

export interface CustomPreset {
  id: string;
  name: string;
  description: string;
  phrase: string;
  cadence: Cadence;
  milestones: number[];
  rate?: number;
  createdAt: number;
}

export interface ClockVoiceSettings {
  clockScope: ClockScope;
  incrementAware: boolean;
  settleMs: number;
  voiceURI: string;
  rate: number;
  pitch: number;
  volume: number;
  lang: string;
  phrase: string;
  cadence: Cadence;
  milestones: number[];
  timeControls: Record<TimeControlCategory, TimeControlConfig>;
  customPresets: CustomPreset[];
}

const DEFAULT_MILESTONES = [10, 5, 3, 2, 1];

export const clockVoiceDefaults: ClockVoiceSettings = {
  clockScope: 'mine',
  incrementAware: true,
  settleMs: 300,
  voiceURI: '',
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'en-US',
  phrase: '{seconds}',
  cadence: 'every',
  milestones: [...DEFAULT_MILESTONES],
  timeControls: {
    bullet: { enabled: true, threshold: CATEGORY_META.bullet.defaultThreshold },
    blitz: { enabled: true, threshold: CATEGORY_META.blitz.defaultThreshold },
    rapid: { enabled: true, threshold: CATEGORY_META.rapid.defaultThreshold },
    daily: { enabled: false, threshold: CATEGORY_META.daily.defaultThreshold },
  },
  customPresets: [],
};

export function isClockVoiceSettings(value: unknown): value is ClockVoiceSettings {
  return value !== null && typeof value === 'object' && 'timeControls' in value;
}

export function getClockVoiceSettings(settings: AppSettings): ClockVoiceSettings {
  const slice = settings.features[CLOCK_VOICE_ID];
  if (isClockVoiceSettings(slice)) return slice;
  return normalizeClockVoice(slice);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(clampNumber(value, fallback, min, max));
}

function normalizeCadence(value: unknown): Cadence {
  return value === 'panic' || value === 'milestones' || value === 'every' ? value : 'every';
}

function normalizeScope(value: unknown): ClockScope {
  return value === 'opponent' || value === 'both' || value === 'mine' ? value : 'mine';
}

function normalizeMilestones(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_MILESTONES];
  const cleaned = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .map((item) => Math.round(item))
    .filter((item) => item >= 1 && item <= 3600);
  const unique = [...new Set(cleaned)].sort((a, b) => b - a).slice(0, 12);
  return unique.length > 0 ? unique : [...DEFAULT_MILESTONES];
}

function normalizePreset(raw: unknown): CustomPreset | null {
  if (raw === null || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 60) : '';
  const phrase = typeof value.phrase === 'string' ? value.phrase.slice(0, MAX_PHRASE_CHARS) : '';
  if (!name || !phrase) return null;
  const id =
    typeof value.id === 'string' && value.id.trim()
      ? value.id.trim().slice(0, 80)
      : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name,
    description: typeof value.description === 'string' ? value.description.slice(0, 120) : '',
    phrase,
    cadence: normalizeCadence(value.cadence),
    milestones: normalizeMilestones(value.milestones),
    rate: clampNumber(value.rate, clockVoiceDefaults.rate, 0.5, 2),
    createdAt:
      typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : Date.now(),
  };
}

export function normalizeClockVoice(raw: unknown): ClockVoiceSettings {
  const value = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawTimeControls =
    value.timeControls !== null && typeof value.timeControls === 'object'
      ? (value.timeControls as Record<string, unknown>)
      : {};

  const timeControls = {} as Record<TimeControlCategory, TimeControlConfig>;
  for (const category of TIME_CONTROL_CATEGORIES) {
    const meta = CATEGORY_META[category];
    const fallback = clockVoiceDefaults.timeControls[category];
    const rawCategory =
      rawTimeControls[category] !== null && typeof rawTimeControls[category] === 'object'
        ? (rawTimeControls[category] as Record<string, unknown>)
        : {};
    timeControls[category] = {
      enabled: typeof rawCategory.enabled === 'boolean' ? rawCategory.enabled : fallback.enabled,
      threshold: clampInt(rawCategory.threshold, fallback.threshold, 1, meta.baseSeconds),
    };
  }

  const customPresets = Array.isArray(value.customPresets)
    ? value.customPresets
        .map(normalizePreset)
        .filter((preset): preset is CustomPreset => preset !== null)
        .slice(0, 20)
    : [];

  return {
    clockScope: normalizeScope(value.clockScope),
    incrementAware: typeof value.incrementAware === 'boolean' ? value.incrementAware : true,
    settleMs: clampInt(value.settleMs, clockVoiceDefaults.settleMs, 0, 2000),
    voiceURI: typeof value.voiceURI === 'string' ? value.voiceURI.slice(0, 500) : '',
    rate: clampNumber(value.rate, clockVoiceDefaults.rate, 0.5, 2),
    pitch: clampNumber(value.pitch, clockVoiceDefaults.pitch, 0, 2),
    volume: clampNumber(value.volume, clockVoiceDefaults.volume, 0, 1),
    lang:
      typeof value.lang === 'string' && value.lang.trim()
        ? value.lang.trim().slice(0, 35)
        : clockVoiceDefaults.lang,
    phrase:
      typeof value.phrase === 'string' && value.phrase.trim()
        ? value.phrase.slice(0, MAX_PHRASE_CHARS)
        : clockVoiceDefaults.phrase,
    cadence: normalizeCadence(value.cadence),
    milestones: normalizeMilestones(value.milestones),
    timeControls,
    customPresets,
  };
}

export function thresholdPath(category: TimeControlCategory): string {
  return `${CLOCK_VOICE_BASE}.timeControls.${category}.threshold`;
}

export function validateClockVoice(settings: AppSettings): SettingsError[] {
  const errors: SettingsError[] = [];
  const value = getClockVoiceSettings(settings);

  for (const category of TIME_CONTROL_CATEGORIES) {
    const meta = CATEGORY_META[category];
    const threshold = value.timeControls[category].threshold;
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > meta.baseSeconds) {
      errors.push({
        path: thresholdPath(category),
        code: 'errorThresholdRange',
        params: { min: 1, max: meta.baseSeconds },
      });
    }
  }

  if (value.rate < 0.5 || value.rate > 2) {
    errors.push({ path: `${CLOCK_VOICE_BASE}.rate`, code: 'errorRateRange' });
  }
  if (value.pitch < 0 || value.pitch > 2) {
    errors.push({ path: `${CLOCK_VOICE_BASE}.pitch`, code: 'errorPitchRange' });
  }
  if (value.volume < 0 || value.volume > 1) {
    errors.push({ path: `${CLOCK_VOICE_BASE}.volume`, code: 'errorVolumeRange' });
  }

  const phraseErrors = validatePhrase(value.phrase);
  for (const code of phraseErrors) {
    errors.push({ path: `${CLOCK_VOICE_BASE}.phrase`, code });
  }

  if (value.cadence === 'milestones') {
    const valid =
      value.milestones.length > 0 &&
      value.milestones.every((n) => Number.isInteger(n) && n >= 1 && n <= 3600);
    if (!valid) {
      errors.push({ path: `${CLOCK_VOICE_BASE}.milestones`, code: 'errorMilestones' });
    }
  }

  for (const preset of value.customPresets) {
    if (!preset.name.trim()) {
      errors.push({ path: `${CLOCK_VOICE_BASE}.customPresets`, code: 'errorPresetName' });
      break;
    }
    if (validatePhrase(preset.phrase).length > 0) {
      errors.push({ path: `${CLOCK_VOICE_BASE}.customPresets`, code: 'errorPresetPhrase' });
      break;
    }
  }

  return errors;
}

export function isTimeControlConfig(value: unknown): value is TimeControlConfig {
  return value !== null && typeof value === 'object' && 'threshold' in value && 'enabled' in value;
}

export function getTimeControlConfig(
  settings: ClockVoiceSettings,
  category: TimeControlCategory | null,
): TimeControlConfig {
  const resolved = category && isTimeControlCategory(category) ? category : 'blitz';
  return settings.timeControls[resolved];
}

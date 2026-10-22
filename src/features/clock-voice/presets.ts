import type { Cadence, CustomPreset } from './settings';

export interface BuiltInPreset {
  id: string;
  nameKey: string;
  descriptionKey: string;
  phrase: string;
  cadence: Cadence;
  milestones: number[];
  rate?: number;
}

export interface PresetView {
  id: string;
  name: string;
  description: string;
  phrase: string;
  cadence: Cadence;
  milestones: number[];
  rate?: number;
  builtIn: boolean;
  nameKey?: string;
  descriptionKey?: string;
}

export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    id: 'numbers-only',
    nameKey: 'presetNumbersName',
    descriptionKey: 'presetNumbersDesc',
    phrase: '{seconds}',
    cadence: 'every',
    milestones: [],
  },
  {
    id: 'seconds-left',
    nameKey: 'presetSecondsName',
    descriptionKey: 'presetSecondsDesc',
    phrase: '{seconds} seconds left',
    cadence: 'every',
    milestones: [],
  },
  {
    id: 'panic',
    nameKey: 'presetPanicName',
    descriptionKey: 'presetPanicDesc',
    phrase: '{seconds}',
    cadence: 'panic',
    milestones: [],
  },
  {
    id: 'minimal',
    nameKey: 'presetMinimalName',
    descriptionKey: 'presetMinimalDesc',
    phrase: '{seconds}',
    cadence: 'milestones',
    milestones: [10, 5, 3, 2, 1],
  },
  {
    id: 'coach',
    nameKey: 'presetCoachName',
    descriptionKey: 'presetCoachDesc',
    phrase: '{seconds} seconds left',
    cadence: 'every',
    milestones: [],
    rate: 0.85,
  },
];

export function customPresetView(preset: CustomPreset): PresetView {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    phrase: preset.phrase,
    cadence: preset.cadence,
    milestones: preset.milestones,
    rate: preset.rate,
    builtIn: false,
  };
}

export function createCustomPreset(
  name: string,
  phrase: string,
  cadence: Cadence,
  milestones: number[],
  rate: number,
): CustomPreset {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 60),
    description: '',
    phrase,
    cadence,
    milestones: [...milestones],
    rate,
    createdAt: Date.now(),
  };
}

export type Preset = BuiltInPreset | CustomPreset;

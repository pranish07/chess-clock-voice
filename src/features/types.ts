import type { ClockProvider } from '@/adapters/types';
import type { Logger } from '@/core/logger';
import type { SettingsSchema } from '@/core/settings/schema';
import type { AppSettings, SettingsError } from '@/core/settings/types';
import type { BuiltInPreset } from './clock-voice/presets';

export interface FeatureContext {
  url: string;
  provider: ClockProvider;
  getSettings: () => AppSettings;
  logger: Logger;
}

export interface FeatureHandle {
  dispose(): void;
  onSettingsChanged?(settings: AppSettings): void;
}

export interface FeatureDefinition {
  id: string;
  nameKey: string;
  matches(url: string): boolean;
  init(context: FeatureContext): FeatureHandle;
  settings: {
    schema: SettingsSchema;
    defaults: unknown;
    normalize(raw: unknown): unknown;
    validate(settings: AppSettings): SettingsError[];
  };
  builtInPresets?: BuiltInPreset[];
}

export type FeatureModule = FeatureDefinition;

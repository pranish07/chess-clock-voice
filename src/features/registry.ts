import { clockVoiceFeature } from './clock-voice';
import type { FeatureDefinition } from './types';

export const FEATURES: FeatureDefinition[] = [clockVoiceFeature];

export function featuresForUrl(url: string): FeatureDefinition[] {
  return FEATURES.filter((feature) => feature.matches(url));
}

export function getFeature(id: string): FeatureDefinition | undefined {
  return FEATURES.find((feature) => feature.id === id);
}

import type { FeatureDefinition } from '../types';
import { BUILT_IN_PRESETS } from './presets';
import { clockVoiceSchema } from './schema';
import {
  CLOCK_VOICE_ID,
  clockVoiceDefaults,
  getClockVoiceSettings,
  normalizeClockVoice,
  validateClockVoice,
} from './settings';
import { ClockVoiceController } from './controller';
import { WebSpeechEngine } from '@/engines/tts/webspeech';

export const clockVoiceFeature: FeatureDefinition = {
  id: CLOCK_VOICE_ID,
  nameKey: 'featureClockVoiceName',
  matches: () => true,
  settings: {
    schema: clockVoiceSchema,
    defaults: clockVoiceDefaults,
    normalize: (raw) => normalizeClockVoice(raw),
    validate: (settings) => validateClockVoice(settings),
  },
  builtInPresets: BUILT_IN_PRESETS,
  init(context) {
    const engine = new WebSpeechEngine(window);
    const controller = new ClockVoiceController({
      provider: context.provider,
      getSettings: context.getSettings,
      engine,
      logger: context.logger,
    });
    controller.start();
    context.logger.debug('Feature initialised', {
      scope: getClockVoiceSettings(context.getSettings()).clockScope,
    });
    return {
      dispose() {
        controller.stop();
        engine.cancel();
      },
      onSettingsChanged(next) {
        controller.onSettingsChanged(next);
      },
    };
  },
};

export { CLOCK_VOICE_ID } from './settings';

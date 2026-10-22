import { describe, expect, it } from 'vitest';
import { createDefaultSettings, validateAppSettings } from '@/app/settings';
import {
  getClockVoiceSettings,
  thresholdPath,
  type CustomPreset,
} from '@/features/clock-voice/settings';
import { CLOCK_VOICE_BASE } from '@/features/clock-voice/settings';

describe('settings validation', () => {
  it('accepts the defaults', () => {
    expect(validateAppSettings(createDefaultSettings())).toEqual([]);
  });

  it('rejects thresholds above the category cap', () => {
    const settings = createDefaultSettings();
    getClockVoiceSettings(settings).timeControls.bullet.threshold = 61;
    const errors = validateAppSettings(settings);
    expect(errors).toContainEqual({
      path: thresholdPath('bullet'),
      code: 'errorThresholdRange',
      params: { min: 1, max: 60 },
    });
  });

  it('rejects non-integer and out-of-range thresholds', () => {
    const settings = createDefaultSettings();
    getClockVoiceSettings(settings).timeControls.rapid.threshold = 0.5;
    expect(
      validateAppSettings(settings).some((error) => error.path === thresholdPath('rapid')),
    ).toBe(true);
  });

  it('validates phrase length, duration, and tokens', () => {
    const settings = createDefaultSettings();
    const clock = getClockVoiceSettings(settings);

    clock.phrase = 'x'.repeat(41);
    expect(validateAppSettings(settings)).toContainEqual({
      path: `${CLOCK_VOICE_BASE}.phrase`,
      code: 'errorPhraseLength',
    });

    clock.phrase = '{oops}';
    expect(validateAppSettings(settings)).toContainEqual({
      path: `${CLOCK_VOICE_BASE}.phrase`,
      code: 'errorPhraseToken',
    });

    clock.phrase = 'this phrase has far too many words to say quickly';
    expect(validateAppSettings(settings)).toContainEqual({
      path: `${CLOCK_VOICE_BASE}.phrase`,
      code: 'errorPhraseDuration',
    });
  });

  it('validates speech ranges', () => {
    const settings = createDefaultSettings();
    const clock = getClockVoiceSettings(settings);
    clock.rate = 3;
    clock.pitch = -1;
    clock.volume = 2;
    const codes = validateAppSettings(settings).map((error) => error.code);
    expect(codes).toEqual(
      expect.arrayContaining(['errorRateRange', 'errorPitchRange', 'errorVolumeRange']),
    );
  });

  it('requires milestones when the milestone cadence is selected', () => {
    const settings = createDefaultSettings();
    const clock = getClockVoiceSettings(settings);
    clock.cadence = 'milestones';
    clock.milestones = [];
    expect(validateAppSettings(settings)).toContainEqual({
      path: `${CLOCK_VOICE_BASE}.milestones`,
      code: 'errorMilestones',
    });
  });

  it('validates custom presets', () => {
    const settings = createDefaultSettings();
    const clock = getClockVoiceSettings(settings);
    const preset: CustomPreset = {
      id: 'bad',
      name: '',
      description: '',
      phrase: '{seconds}',
      cadence: 'every',
      milestones: [],
      createdAt: 1,
    };
    clock.customPresets.push(preset);
    expect(validateAppSettings(settings)).toContainEqual({
      path: `${CLOCK_VOICE_BASE}.customPresets`,
      code: 'errorPresetName',
    });
  });
});

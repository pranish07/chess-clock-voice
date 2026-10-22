import { CATEGORY_META, TIME_CONTROL_CATEGORIES } from '@/core/time-control';
import type { SettingsSchema, SettingsSection } from '@/core/settings/schema';
import { CLOCK_VOICE_BASE } from './settings';

const base = CLOCK_VOICE_BASE;

const quickSection: SettingsSection = {
  id: 'quick',
  titleKey: 'sectionQuick',
  surfaces: ['popup'],
  fields: [
    {
      kind: 'select',
      path: `${base}.clockScope`,
      labelKey: 'clockScopeLabel',
      options: [
        { value: 'mine', labelKey: 'scopeMine' },
        { value: 'opponent', labelKey: 'scopeOpponent' },
        { value: 'both', labelKey: 'scopeBoth' },
      ],
    },
    {
      kind: 'action',
      path: '',
      action: 'test-voice',
      labelKey: 'testVoice',
      variant: 'secondary',
      surfaces: ['popup', 'options'],
    },
    {
      kind: 'action',
      path: '',
      action: 'open-options',
      labelKey: 'openSettings',
      variant: 'ghost',
      surfaces: ['popup'],
    },
  ],
};

const generalSection: SettingsSection = {
  id: 'general',
  titleKey: 'sectionBehavior',
  descriptionKey: 'sectionBehaviorDesc',
  surfaces: ['options'],
  fields: [
    {
      kind: 'select',
      path: `${base}.clockScope`,
      labelKey: 'clockScopeLabel',
      helpKey: 'clockScopeHelp',
      options: [
        { value: 'mine', labelKey: 'scopeMine' },
        { value: 'opponent', labelKey: 'scopeOpponent' },
        { value: 'both', labelKey: 'scopeBoth' },
      ],
    },
    {
      kind: 'boolean',
      path: `${base}.incrementAware`,
      labelKey: 'incrementAwareLabel',
      helpKey: 'incrementAwareHelp',
    },
  ],
};

const announcementSection: SettingsSection = {
  id: 'announcement',
  titleKey: 'sectionAnnouncement',
  descriptionKey: 'sectionAnnouncementDesc',
  surfaces: ['options'],
  fields: [
    {
      kind: 'text',
      path: `${base}.phrase`,
      labelKey: 'phraseLabel',
      helpKey: 'phraseHelp',
      placeholderKey: 'phrasePlaceholder',
      maxLength: 40,
      tokens: ['{seconds}', '{increment}', '{timeControl}'],
      showSpeechMetrics: true,
    },
    {
      kind: 'select',
      path: `${base}.cadence`,
      labelKey: 'cadenceLabel',
      helpKey: 'cadenceHelp',
      options: [
        { value: 'every', labelKey: 'cadenceEvery' },
        { value: 'panic', labelKey: 'cadencePanic' },
        { value: 'milestones', labelKey: 'cadenceMilestones' },
      ],
    },
    {
      kind: 'numberList',
      path: `${base}.milestones`,
      labelKey: 'milestonesLabel',
      helpKey: 'milestonesHelp',
      min: 1,
      max: 3600,
      placeholder: '10, 5, 3, 2, 1',
    },
  ],
};

const speechSection: SettingsSection = {
  id: 'speech',
  titleKey: 'sectionSpeech',
  descriptionKey: 'sectionSpeechDesc',
  surfaces: ['options'],
  fields: [
    {
      kind: 'voice',
      path: `${base}.voiceURI`,
      langPath: `${base}.lang`,
      labelKey: 'voiceLabel',
      helpKey: 'voiceHelp',
    },
    {
      kind: 'slider',
      path: `${base}.rate`,
      labelKey: 'rateLabel',
      min: 0.5,
      max: 2,
      step: 0.05,
    },
    {
      kind: 'slider',
      path: `${base}.pitch`,
      labelKey: 'pitchLabel',
      min: 0,
      max: 2,
      step: 0.05,
    },
    {
      kind: 'slider',
      path: `${base}.volume`,
      labelKey: 'volumeLabel',
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      kind: 'action',
      path: '',
      action: 'test-voice',
      labelKey: 'testVoice',
      variant: 'secondary',
    },
  ],
};

const timeControlSections: SettingsSection[] = TIME_CONTROL_CATEGORIES.map((category) => {
  const meta = CATEGORY_META[category];
  return {
    id: `tc-${category}`,
    titleKey: meta.labelKey,
    descriptionKey: `tcHelp${category.charAt(0).toUpperCase()}${category.slice(1)}`,
    surfaces: ['options'],
    fields: [
      {
        kind: 'boolean',
        path: `${base}.timeControls.${category}.enabled`,
        labelKey: 'enabledLabel',
      },
      {
        kind: 'slider',
        path: `${base}.timeControls.${category}.threshold`,
        labelKey: 'thresholdLabel',
        helpKey: 'thresholdHelp',
        min: 1,
        max: meta.baseSeconds,
        step: 1,
        unitKey: 'unitSeconds',
        showInput: true,
      },
    ],
  };
});

const presetsSection: SettingsSection = {
  id: 'presets',
  titleKey: 'sectionPresets',
  descriptionKey: 'sectionPresetsDesc',
  surfaces: ['options'],
  fields: [
    {
      kind: 'preset-gallery',
      path: `${base}.customPresets`,
      labelKey: 'presetGalleryTitle',
    },
  ],
};

const aboutSection: SettingsSection = {
  id: 'about',
  titleKey: 'sectionAbout',
  surfaces: ['options'],
  fields: [
    { kind: 'info', path: '', labelKey: 'aboutFairPlayTitle', textKey: 'aboutFairPlayBody' },
    { kind: 'info', path: '', labelKey: 'aboutPrivacyTitle', textKey: 'aboutPrivacyBody' },
    {
      kind: 'action',
      path: '',
      action: 'reset-settings',
      labelKey: 'resetDefaults',
      variant: 'ghost',
    },
  ],
};

export const clockVoiceSchema: SettingsSchema = {
  sections: [
    quickSection,
    generalSection,
    announcementSection,
    speechSection,
    ...timeControlSections,
    presetsSection,
    aboutSection,
  ],
};

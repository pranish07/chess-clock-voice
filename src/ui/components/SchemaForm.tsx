import { t } from '@/core/i18n';
import {
  getPathValue,
  schemaSections,
  type SettingsSchema,
  type SettingsField,
} from '@/core/settings/schema';
import type { AppSettings, SettingsError, Surface } from '@/core/settings/types';
import type { TtsVoice } from '@/engines/tts/types';
import { getClockVoiceSettings, type CustomPreset } from '@/features/clock-voice/settings';
import { clockVoiceFeature } from '@/features/clock-voice';
import type { PresetView } from '@/features/clock-voice/presets';
import { Button } from './Button';
import { NumberListField } from './NumberListField';
import { PresetGallery } from './PresetGallery';
import { SelectField } from './SelectField';
import { SettingsSection } from './SettingsSection';
import { Slider } from './Slider';
import { TextField } from './TextField';
import { Toggle } from './Toggle';
import { VoicePicker } from './VoicePicker';
import { errorFor } from '@/ui/lib/errors';

interface SchemaFormProps {
  schema: SettingsSchema;
  surface: Surface;
  settings: AppSettings;
  errors: SettingsError[];
  voices: TtsVoice[];
  onChange: (path: string, value: unknown) => void;
  onTestVoice: () => void;
  onReset: () => void;
  onApplyPreset: (preset: PresetView) => void;
  onSavePreset: (name: string) => Promise<string | null>;
  onDeletePreset: (preset: PresetView) => void;
}

function sliderDisplay(path: string): 'number' | 'decimal' | 'percent' {
  if (path.endsWith('.volume')) return 'percent';
  if (path.endsWith('.rate') || path.endsWith('.pitch')) return 'decimal';
  return 'number';
}

export function SchemaForm(props: SchemaFormProps) {
  const { schema, surface, settings, errors, voices, onChange } = props;
  const sections = schemaSections(schema, surface);

  const renderField = (field: SettingsField) => {
    const value = getPathValue(settings, field.path);
    const error = errorFor(errors, field.path);
    const label = t(field.labelKey);
    const help = field.helpKey ? t(field.helpKey) : undefined;

    switch (field.kind) {
      case 'boolean':
        return (
          <Toggle
            key={field.path}
            label={label}
            help={help}
            checked={Boolean(value)}
            onChange={(next) => onChange(field.path, next)}
          />
        );
      case 'select': {
        const selected = typeof value === 'string' ? value : String(value ?? '');
        return (
          <SelectField
            key={field.path}
            label={label}
            help={help}
            value={selected}
            options={field.options}
            error={error}
            onChange={(next) => onChange(field.path, next)}
          />
        );
      }
      case 'slider':
        return (
          <Slider
            key={field.path}
            label={label}
            help={help}
            value={typeof value === 'number' ? value : Number(value ?? field.min)}
            min={field.min}
            max={field.max}
            step={field.step}
            unitKey={field.unitKey}
            display={sliderDisplay(field.path)}
            showInput={field.showInput}
            error={error}
            onChange={(next) => onChange(field.path, next)}
          />
        );
      case 'number':
        return (
          <div key={field.path}>
            <label className="ccv-label" htmlFor={field.path}>
              {label}
            </label>
            {help ? <p className="ccv-help mt-1">{help}</p> : null}
            <input
              id={field.path}
              type="number"
              className="ccv-input mt-2"
              min={field.min}
              max={field.max}
              step={field.step}
              value={typeof value === 'number' ? value : ''}
              onChange={(event) => onChange(field.path, Number(event.target.value))}
            />
          </div>
        );
      case 'text': {
        const text = typeof value === 'string' ? value : '';
        return (
          <TextField
            key={field.path}
            label={label}
            help={help}
            value={text}
            placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
            maxLength={field.maxLength}
            tokens={field.tokens}
            showSpeechMetrics={field.showSpeechMetrics}
            error={error}
            onChange={(next) => onChange(field.path, next)}
          />
        );
      }
      case 'numberList': {
        const list = Array.isArray(value) ? (value as number[]) : [];
        return (
          <NumberListField
            key={field.path}
            label={label}
            help={help}
            value={list}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            error={error}
            onChange={(next) => onChange(field.path, next)}
          />
        );
      }
      case 'voice': {
        const lang = getPathValue(settings, field.langPath);
        return (
          <VoicePicker
            key={field.path}
            label={label}
            help={help}
            voices={voices}
            voiceURI={typeof value === 'string' ? value : ''}
            lang={typeof lang === 'string' ? lang : 'en-US'}
            onChange={(voiceURI, nextLang) => {
              onChange(field.path, voiceURI);
              onChange(field.langPath, nextLang);
            }}
          />
        );
      }
      case 'action':
        return (
          <div key={`${field.action}-${field.labelKey}`}>
            <Button
              variant={field.variant ?? 'secondary'}
              onClick={() => {
                if (field.action === 'test-voice') props.onTestVoice();
                else if (field.action === 'open-options') chrome.runtime.openOptionsPage();
                else if (field.action === 'reset-settings' && window.confirm(t('resetConfirm'))) {
                  props.onReset();
                }
              }}
            >
              {label}
            </Button>
          </div>
        );
      case 'preset-gallery': {
        const clockVoice = getClockVoiceSettings(settings);
        const customPresets: CustomPreset[] = clockVoice.customPresets;
        return (
          <div key={field.path}>
            <p className="ccv-label">{label}</p>
            <div className="mt-3">
              <PresetGallery
                builtIns={clockVoiceFeature.builtInPresets ?? []}
                customPresets={customPresets}
                onApplyPreset={props.onApplyPreset}
                onSavePreset={props.onSavePreset}
                onDeletePreset={props.onDeletePreset}
              />
            </div>
          </div>
        );
      }
      case 'info':
        return (
          <div
            key={`${field.labelKey}-${field.textKey}`}
            className="rounded-xl border border-line bg-surface/60 p-3"
          >
            <h3 className="text-sm font-semibold">{label}</h3>
            <p className="ccv-help mt-1">{t(field.textKey)}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <SettingsSection
          key={section.id}
          titleKey={section.titleKey}
          descriptionKey={section.descriptionKey}
        >
          {section.fields.map(renderField)}
        </SettingsSection>
      ))}
    </div>
  );
}

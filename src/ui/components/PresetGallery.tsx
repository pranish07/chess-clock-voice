import { useState } from 'react';
import { t } from '@/core/i18n';
import {
  customPresetView,
  type BuiltInPreset,
  type PresetView,
} from '@/features/clock-voice/presets';
import type { CustomPreset } from '@/features/clock-voice/settings';
import { Button } from './Button';
import { PresetCard } from './PresetCard';

interface PresetGalleryProps {
  builtIns: BuiltInPreset[];
  customPresets: CustomPreset[];
  onApplyPreset: (preset: PresetView) => void;
  onSavePreset: (name: string) => Promise<string | null>;
  onDeletePreset: (preset: PresetView) => void;
}

export function PresetGallery({
  builtIns,
  customPresets,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
}: PresetGalleryProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError(t('presetNameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const failure = await onSavePreset(name.trim());
      if (failure) setError(t(failure));
      else setName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const views: PresetView[] = [
    ...builtIns.map((preset) => ({
      id: preset.id,
      name: '',
      description: '',
      phrase: preset.phrase,
      cadence: preset.cadence,
      milestones: preset.milestones,
      rate: preset.rate,
      builtIn: true,
      nameKey: preset.nameKey,
      descriptionKey: preset.descriptionKey,
    })),
    ...customPresets.map(customPresetView),
  ];

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {views.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onApply={onApplyPreset}
            onDelete={onDeletePreset}
          />
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-line p-3">
        <label htmlFor="preset-name" className="ccv-label">
          {t('saveCurrentPreset')}
        </label>
        <p className="ccv-help mt-1">{t('saveCurrentPresetHelp')}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="preset-name"
            className="ccv-input"
            value={name}
            maxLength={60}
            placeholder={t('presetNamePlaceholder')}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save();
            }}
          />
          <Button variant="secondary" onClick={() => void save()} disabled={busy}>
            {t('savePreset')}
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
      </div>
    </div>
  );
}

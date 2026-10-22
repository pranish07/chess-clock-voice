import { t } from '@/core/i18n';
import type { PresetView } from '@/features/clock-voice/presets';
import { Button } from './Button';

interface PresetCardProps {
  preset: PresetView;
  onApply: (preset: PresetView) => void;
  onDelete?: (preset: PresetView) => void;
}

function cadenceKey(preset: PresetView): string {
  if (preset.cadence === 'panic') return 'cadencePanic';
  if (preset.cadence === 'milestones') return 'cadenceMilestones';
  return 'cadenceEvery';
}

export function PresetCard({ preset, onApply, onDelete }: PresetCardProps) {
  const name = preset.nameKey ? t(preset.nameKey) : preset.name;
  const description = preset.descriptionKey ? t(preset.descriptionKey) : preset.description;

  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-surface/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{name}</h3>
        <span className="ccv-chip shrink-0">{t(cadenceKey(preset))}</span>
      </div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">{description}</p>
      <code className="mt-2 block truncate rounded-md bg-line/40 px-2 py-1 font-mono text-[11px]">
        {preset.phrase}
      </code>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => onApply(preset)}>
          {t('presetApply')}
        </Button>
        {onDelete && !preset.builtIn ? (
          <Button size="sm" variant="ghost" onClick={() => onDelete(preset)}>
            {t('deletePreset')}
          </Button>
        ) : null}
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted/70">
          {preset.builtIn ? t('builtInPreset') : t('customPreset')}
        </span>
      </div>
    </article>
  );
}

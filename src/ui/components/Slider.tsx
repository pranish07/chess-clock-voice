import { useId } from 'react';
import { t } from '@/core/i18n';
import { ErrorText } from './ErrorText';
import type { SettingsError } from '@/core/settings/types';

interface SliderProps {
  label: string;
  help?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unitKey?: string;
  display?: 'number' | 'decimal' | 'percent';
  showInput?: boolean;
  onChange: (value: number) => void;
  error?: SettingsError;
}

function formatValue(value: number, display: SliderProps['display']): string {
  if (display === 'percent') return `${Math.round(value * 100)}%`;
  if (display === 'decimal') return value.toFixed(2);
  return String(Math.round(value));
}

export function Slider({
  label,
  help,
  value,
  min,
  max,
  step,
  unitKey,
  display = 'number',
  showInput,
  onChange,
  error,
}: SliderProps) {
  const id = useId();
  const unit = unitKey ? t(unitKey) : '';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="ccv-label">
          {label}
        </label>
        {showInput ? (
          <span className="flex items-center gap-1.5">
            <input
              type="number"
              className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-right font-mono text-xs text-ink"
              min={min}
              max={max}
              step={step}
              value={Number.isFinite(value) ? value : ''}
              aria-label={label}
              onChange={(event) => {
                const parsed = event.target.valueAsNumber;
                onChange(Number.isFinite(parsed) ? parsed : 0);
              }}
            />
            {unit ? <span className="font-mono text-xs text-muted">{unit}</span> : null}
          </span>
        ) : (
          <span className="font-mono text-xs text-muted">
            {formatValue(value, display)}
            {unit ? ` ${unit}` : ''}
          </span>
        )}
      </div>
      {help ? <p className="ccv-help mt-1">{help}</p> : null}
      <input
        id={id}
        type="range"
        className="ccv-range mt-3"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted/70">
        <span>
          {min}
          {unit ? ` ${unit}` : ''}
        </span>
        <span>
          {max}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <ErrorText error={error} />
    </div>
  );
}

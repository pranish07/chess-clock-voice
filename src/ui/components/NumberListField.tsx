import { useEffect, useId, useState } from 'react';
import { t } from '@/core/i18n';
import type { SettingsError } from '@/core/settings/types';
import { ErrorText } from './ErrorText';

interface NumberListFieldProps {
  label: string;
  help?: string;
  value: number[];
  min: number;
  max: number;
  placeholder?: string;
  onChange: (value: number[]) => void;
  error?: SettingsError;
}

function serialize(values: number[]): string {
  return [...values].sort((a, b) => b - a).join(',');
}

function parse(text: string): number[] | null {
  const parts = text
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const values: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    values.push(Number(part));
  }
  return [...new Set(values)].sort((a, b) => b - a);
}

export function NumberListField({
  label,
  help,
  value,
  min,
  max,
  placeholder,
  onChange,
  error,
}: NumberListFieldProps) {
  const id = useId();
  const [text, setText] = useState(value.join(', '));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parse(text);
    if (!parsed || serialize(parsed) !== serialize(value)) setText(value.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (next: string) => {
    setText(next);
    const parsed = parse(next);
    if (!parsed) {
      setLocalError('errorMilestones');
      return;
    }
    if (parsed.some((item) => item < min || item > max)) {
      setLocalError('errorMilestones');
      return;
    }
    setLocalError(null);
    onChange(parsed);
  };

  return (
    <div>
      <label htmlFor={id} className="ccv-label">
        {label}
      </label>
      {help ? <p className="ccv-help mt-1">{help}</p> : null}
      <input
        id={id}
        type="text"
        className="ccv-input mt-2 font-mono"
        value={text}
        placeholder={placeholder}
        onChange={(event) => handleChange(event.target.value)}
        aria-invalid={Boolean(localError ?? error)}
      />
      {localError ? (
        <ErrorText error={{ path: '', code: localError }} />
      ) : (
        <ErrorText error={error} />
      )}
      {!localError && !error ? (
        <p className="mt-1 text-[11px] text-muted">
          {t('milestonesRange', [String(min), String(max)])}
        </p>
      ) : null}
    </div>
  );
}

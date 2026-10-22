import { useId } from 'react';
import type { SchemaOption } from '@/core/settings/schema';
import { t } from '@/core/i18n';
import { ErrorText } from './ErrorText';
import type { SettingsError } from '@/core/settings/types';

interface SelectFieldProps {
  label: string;
  help?: string;
  value: string;
  options: SchemaOption[];
  onChange: (value: string) => void;
  error?: SettingsError;
}

export function SelectField({ label, help, value, options, onChange, error }: SelectFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="ccv-label">
        {label}
      </label>
      {help ? <p className="ccv-help mt-1">{help}</p> : null}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ccv-input mt-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
      <ErrorText error={error} />
    </div>
  );
}

import { useId } from 'react';
import { t } from '@/core/i18n';
import { estimateSpeechSeconds, MAX_SPOKEN_SECONDS } from '@/features/clock-voice/phrase';
import { ErrorText } from './ErrorText';
import type { SettingsError } from '@/core/settings/types';

interface TextFieldProps {
  label: string;
  help?: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  tokens?: string[];
  showSpeechMetrics?: boolean;
  onChange: (value: string) => void;
  error?: SettingsError;
}

export function TextField({
  label,
  help,
  value,
  placeholder,
  maxLength,
  tokens,
  showSpeechMetrics,
  onChange,
  error,
}: TextFieldProps) {
  const id = useId();
  const estimate = showSpeechMetrics ? estimateSpeechSeconds(value) : 0;
  const tooSlow = estimate > MAX_SPOKEN_SECONDS;
  const percent = Math.min(100, Math.round((estimate / MAX_SPOKEN_SECONDS) * 100));

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
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        spellCheck={false}
      />
      {tokens && tokens.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted">{t('tokensLabel')}</span>
          {tokens.map((token) => (
            <button
              key={token}
              type="button"
              className="ccv-chip font-mono transition hover:border-brand hover:text-brand"
              onClick={() =>
                onChange(`${value}${value.endsWith(' ') || !value ? '' : ' '}${token}`)
              }
            >
              {token}
            </button>
          ))}
        </div>
      ) : null}
      {showSpeechMetrics ? (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span
              className={
                value.length > (maxLength ?? 40) ? 'font-semibold text-danger' : 'text-muted'
              }
            >
              {t('charCount', [String(value.length), String(maxLength ?? 40)])}
            </span>
            <span className={tooSlow ? 'font-semibold text-danger' : 'text-muted'}>
              {t('durationEstimate', [estimate.toFixed(1)])}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full transition-all ${tooSlow ? 'bg-danger' : 'bg-brand'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : null}
      <ErrorText error={error} />
    </div>
  );
}

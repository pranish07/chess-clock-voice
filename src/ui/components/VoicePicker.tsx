import { useId } from 'react';
import { t } from '@/core/i18n';
import type { TtsVoice } from '@/engines/tts/types';

interface VoicePickerProps {
  label: string;
  help?: string;
  voices: TtsVoice[];
  voiceURI: string;
  lang: string;
  onChange: (voiceURI: string, lang: string) => void;
}

const COMMON_LANGS = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'pt-BR', 'it-IT', 'hi-IN'];

export function VoicePicker({ label, help, voices, voiceURI, lang, onChange }: VoicePickerProps) {
  const voiceId = useId();
  const langId = useId();
  const languages = [
    ...new Set([...voices.map((voice) => voice.lang), ...COMMON_LANGS, lang]),
  ].sort();

  return (
    <div>
      <label htmlFor={voiceId} className="ccv-label">
        {label}
      </label>
      {help ? <p className="ccv-help mt-1">{help}</p> : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <select
          id={voiceId}
          className="ccv-input"
          value={voiceURI}
          onChange={(event) => {
            const next = voices.find((voice) => voice.voiceURI === event.target.value);
            onChange(event.target.value, next?.lang ?? lang);
          }}
        >
          <option value="">{t('voiceAutomatic')}</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang}){voice.localService ? '' : ' · online'}
            </option>
          ))}
        </select>
        <select
          id={langId}
          className="ccv-input"
          aria-label={t('languageLabel')}
          value={lang}
          onChange={(event) => onChange('', event.target.value)}
        >
          {languages.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </div>
      {voices.length === 0 ? (
        <p className="mt-2 rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-muted">
          {t('voiceUnavailable')}
        </p>
      ) : null}
    </div>
  );
}

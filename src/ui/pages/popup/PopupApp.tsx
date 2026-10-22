import { useEffect, useRef, useState } from 'react';
import { getFullSchema, validateAppSettings } from '@/app/settings';
import { t } from '@/core/i18n';
import { setPathValue } from '@/core/settings/schema';
import type { AppSettings } from '@/core/settings/types';
import { WebSpeechEngine } from '@/engines/tts/webspeech';
import { renderPhrase } from '@/features/clock-voice/phrase';
import { getClockVoiceSettings } from '@/features/clock-voice/settings';
import { BrandMark } from '@/ui/components/Brand';
import { SchemaForm } from '@/ui/components/SchemaForm';
import { useSettings } from '@/ui/lib/useSettings';
import { useVoices } from '@/ui/lib/useVoices';

const SCHEMA = getFullSchema();

export function PopupApp() {
  const { settings, loading, error, replace } = useSettings();
  const voices = useVoices();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const engineRef = useRef<WebSpeechEngine | null>(null);

  if (!engineRef.current) engineRef.current = new WebSpeechEngine(window);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const errors = validateAppSettings(settings);

  const update = async (path: string, value: unknown) => {
    setBusy(true);
    setNotice(null);
    try {
      const next = setPathValue<AppSettings>(settings, path, value);
      await replace(next);
      setNotice(t('saved'));
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : t('saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const testVoice = () => {
    const clock = getClockVoiceSettings(settings);
    const engine = engineRef.current;
    if (!engine?.isSupported()) {
      setNotice(t('testVoiceUnavailable'));
      return;
    }
    const text = renderPhrase(clock.phrase || '{seconds}', {
      seconds: 10,
      increment: 0,
      timeControl: t('categoryBlitz'),
    });
    engine.speak(text, {
      voiceURI: clock.voiceURI,
      lang: clock.lang,
      rate: clock.rate,
      pitch: clock.pitch,
      volume: clock.volume,
    });
  };

  return (
    <div className="w-[380px]">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-9 w-9" />
          <div>
            <h1 className="text-sm font-semibold leading-tight">{t('extName')}</h1>
            <p className="mt-0.5 text-[11px] text-muted">{t('popupSubtitle')}</p>
          </div>
        </div>
        <span
          className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            settings.masterEnabled
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-line bg-line/30 text-muted'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              settings.masterEnabled ? 'bg-success ccv-live-dot' : 'bg-muted'
            }`}
          />
          {settings.masterEnabled ? t('statusOn') : t('statusOff')}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {t('loadFailed', [error])}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            <div className="ccv-card h-24 animate-pulse bg-elevated/60" />
            <div className="ccv-card h-32 animate-pulse bg-elevated/60" />
          </div>
        ) : (
          <SchemaForm
            schema={SCHEMA}
            surface="popup"
            settings={settings}
            errors={errors}
            voices={voices}
            onChange={(path, value) => void update(path, value)}
            onTestVoice={testVoice}
            onReset={() => undefined}
            onApplyPreset={() => undefined}
            onSavePreset={async () => null}
            onDeletePreset={() => undefined}
          />
        )}

        {!settings.masterEnabled ? (
          <p className="rounded-xl border border-line bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted">
            {t('enableMasterHint')}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-line pt-3 text-[10px] text-muted">
          <span>{t('noDataBadge')}</span>
          <span className="font-mono">{busy ? t('saving') : (notice ?? t('ready'))}</span>
        </div>
      </div>
    </div>
  );
}

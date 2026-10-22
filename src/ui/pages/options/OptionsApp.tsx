import { useEffect, useMemo, useRef, useState } from 'react';
import { getFullSchema, validateAppSettings } from '@/app/settings';
import { t } from '@/core/i18n';
import { ApiError } from '@/core/messages';
import { setPathValue } from '@/core/settings/schema';
import type { AppSettings } from '@/core/settings/types';
import { WebSpeechEngine } from '@/engines/tts/webspeech';
import { createCustomPreset, type PresetView } from '@/features/clock-voice/presets';
import { renderPhrase, validatePhrase } from '@/features/clock-voice/phrase';
import { CLOCK_VOICE_BASE, getClockVoiceSettings } from '@/features/clock-voice/settings';
import { BrandMark } from '@/ui/components/Brand';
import { Button } from '@/ui/components/Button';
import { SchemaForm } from '@/ui/components/SchemaForm';
import { errorText } from '@/ui/lib/errors';
import { useSettings } from '@/ui/lib/useSettings';
import { useVoices } from '@/ui/lib/useVoices';

const SCHEMA = getFullSchema();

type Notice = { kind: 'ok' | 'error'; text: string };

function describeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.errors.length > 0) return errorText(cause.errors[0]!);
    return cause.message;
  }
  if (cause instanceof Error) return cause.message;
  return t('saveFailed');
}

export function OptionsApp() {
  const { settings, loading, error, replace, reset } = useSettings();
  const voices = useVoices();
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const dirtyRef = useRef(false);
  const engineRef = useRef<WebSpeechEngine | null>(null);

  if (!engineRef.current) engineRef.current = new WebSpeechEngine(window);

  useEffect(() => {
    if (!dirtyRef.current) setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const errors = useMemo(() => (draft ? validateAppSettings(draft) : []), [draft]);

  const markDirty = () => {
    dirtyRef.current = true;
    setDirty(true);
  };

  const clearDirty = () => {
    dirtyRef.current = false;
    setDirty(false);
  };

  const handleChange = (path: string, value: unknown) => {
    setDraft((current) => (current ? setPathValue(current, path, value) : current));
    markDirty();
    setNotice(null);
  };

  const handleSave = async () => {
    if (!draft || errors.length > 0) return;
    setSaving(true);
    setNotice(null);
    try {
      const saved = await replace(draft);
      setDraft(saved);
      clearDirty();
      setNotice({ kind: 'ok', text: t('settingsSaved') });
    } catch (cause) {
      setNotice({ kind: 'error', text: describeError(cause) });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const saved = await reset();
      setDraft(saved);
      clearDirty();
      setNotice({ kind: 'ok', text: t('resetDone') });
    } catch (cause) {
      setNotice({ kind: 'error', text: describeError(cause) });
    } finally {
      setSaving(false);
    }
  };

  const preview = (source: AppSettings) => {
    const clock = getClockVoiceSettings(source);
    const engine = engineRef.current;
    if (!engine?.isSupported()) {
      setNotice({ kind: 'error', text: t('testVoiceUnavailable') });
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

  const handleTestVoice = () => {
    if (draft) preview(draft);
    else preview(settings);
  };

  const handleApplyPreset = (preset: PresetView) => {
    if (!draft) return;
    let next = setPathValue(draft, `${CLOCK_VOICE_BASE}.phrase`, preset.phrase);
    next = setPathValue(next, `${CLOCK_VOICE_BASE}.cadence`, preset.cadence);
    next = setPathValue(next, `${CLOCK_VOICE_BASE}.milestones`, preset.milestones);
    if (typeof preset.rate === 'number') {
      next = setPathValue(next, `${CLOCK_VOICE_BASE}.rate`, preset.rate);
    }
    setDraft(next);
    markDirty();
    setNotice({ kind: 'ok', text: t('presetApplied') });
  };

  const handleSavePreset = async (name: string): Promise<string | null> => {
    if (!draft) return 'errorPresetName';
    if (!name.trim()) return 'errorPresetName';
    const clock = getClockVoiceSettings(draft);
    const phraseErrors = validatePhrase(clock.phrase);
    if (phraseErrors.length > 0) return phraseErrors[0] ?? 'errorPhraseEmpty';

    const preset = createCustomPreset(
      name,
      clock.phrase,
      clock.cadence,
      clock.milestones,
      clock.rate,
    );
    const next = setPathValue(draft, `${CLOCK_VOICE_BASE}.customPresets`, [
      ...clock.customPresets,
      preset,
    ]);
    try {
      const saved = await replace(next);
      setDraft(saved);
      clearDirty();
      setNotice({ kind: 'ok', text: t('presetSaved') });
      return null;
    } catch (cause) {
      return describeError(cause);
    }
  };

  const handleDeletePreset = (preset: PresetView) => {
    if (!draft) return;
    const clock = getClockVoiceSettings(draft);
    const next = setPathValue(
      draft,
      `${CLOCK_VOICE_BASE}.customPresets`,
      clock.customPresets.filter((item) => item.id !== preset.id),
    );
    setDraft(next);
    markDirty();
  };

  const version = (() => {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return '1.0.0';
    }
  })();

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto w-full max-w-4xl px-5 pb-10 pt-8 md:px-8 md:pt-12">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <BrandMark className="h-12 w-12 shrink-0" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {t('optionsTitle')}
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                {t('optionsSubtitle')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                draft?.masterEnabled
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-line bg-line/30 text-muted'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  draft?.masterEnabled ? 'bg-success ccv-live-dot' : 'bg-muted'
                }`}
              />
              {draft?.masterEnabled ? t('statusOn') : t('statusOff')}
            </span>
            <span className="ccv-chip">{t('noDataBadge')}</span>
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {t('loadFailed', [error])}
          </div>
        ) : null}

        <div className="mt-8">
          {loading && !draft ? (
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="ccv-card h-40 animate-pulse bg-elevated/60" />
              ))}
            </div>
          ) : draft ? (
            <SchemaForm
              schema={SCHEMA}
              surface="options"
              settings={draft}
              errors={errors}
              voices={voices}
              onChange={handleChange}
              onTestVoice={handleTestVoice}
              onReset={() => void handleReset()}
              onApplyPreset={handleApplyPreset}
              onSavePreset={handleSavePreset}
              onDeletePreset={handleDeletePreset}
            />
          ) : null}
        </div>

        <footer className="mt-8 flex flex-col gap-1 border-t border-line pt-4 text-[11px] text-muted">
          <p>{t('optionsFooterNote')}</p>
          <p>
            {t('versionLabel')} {version}
          </p>
        </footer>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-line bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
          <div className="text-xs">
            {errors.length > 0 ? (
              <span className="font-semibold text-danger">
                {t('validationErrors', [String(errors.length)])}
              </span>
            ) : dirty ? (
              <span className="font-medium text-muted">{t('unsavedChanges')}</span>
            ) : (
              <span className="font-medium text-success">{t('saved')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleTestVoice} disabled={saving}>
              {t('testVoice')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !dirty || errors.length > 0 || !draft}
            >
              {saving ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border px-4 py-2 text-sm font-medium shadow-card ${
            notice.kind === 'ok'
              ? 'border-success/30 bg-elevated text-success'
              : 'border-danger/30 bg-elevated text-danger'
          }`}
        >
          {notice.text}
        </div>
      ) : null}
    </div>
  );
}

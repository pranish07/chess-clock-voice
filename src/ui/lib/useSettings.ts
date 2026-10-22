import { useCallback, useEffect, useState } from 'react';
import { createDefaultSettings } from '@/app/settings';
import { isSettingsChanged, sendRequest, type RequestMessage } from '@/core/messages';
import type { AppSettings, DeepPartial } from '@/core/settings/types';

export interface SettingsApi {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  patch: (patch: DeepPartial<AppSettings>) => Promise<AppSettings>;
  replace: (settings: AppSettings) => Promise<AppSettings>;
  reset: () => Promise<AppSettings>;
  refresh: () => Promise<void>;
}

export function useSettings(): SettingsApi {
  const [settings, setSettings] = useState<AppSettings>(() => createDefaultSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const loaded = await sendRequest<AppSettings>({ type: 'settings:get' });
      setSettings(loaded);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = (message: unknown) => {
      if (!isSettingsChanged(message)) return;
      setSettings(message.settings);
      setLoading(false);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  const patch = useCallback(async (next: DeepPartial<AppSettings>) => {
    const saved = await sendRequest<AppSettings>({
      type: 'settings:patch',
      patch: next,
    } satisfies RequestMessage);
    setSettings(saved);
    setError(null);
    return saved;
  }, []);

  const replace = useCallback(async (next: AppSettings) => {
    const saved = await sendRequest<AppSettings>({
      type: 'settings:replace',
      settings: next,
    } satisfies RequestMessage);
    setSettings(saved);
    setError(null);
    return saved;
  }, []);

  const reset = useCallback(async () => {
    const saved = await sendRequest<AppSettings>({ type: 'settings:reset' });
    setSettings(saved);
    setError(null);
    return saved;
  }, []);

  return { settings, loading, error, patch, replace, reset, refresh };
}

import { createClockProviderFor } from '@/adapters/registry';
import type { ClockProvider } from '@/adapters/types';
import { normalizeAppSettings } from '@/app/settings';
import { createLogger } from '@/core/logger';
import { isSettingsChanged, sendRequest, type RequestMessage } from '@/core/messages';
import type { AppSettings } from '@/core/settings/types';
import { featuresForUrl } from '@/features/registry';
import type { FeatureHandle } from '@/features/types';

declare global {
  interface Window {
    __chessClockVoiceMounted?: boolean;
  }
}

if (!window.__chessClockVoiceMounted) {
  window.__chessClockVoiceMounted = true;
  boot();
}

function pageKey(): string {
  return `${location.pathname}${location.search}`;
}

function boot(): void {
  const logger = createLogger('content');
  let settings: AppSettings = normalizeAppSettings(null);
  let provider: ClockProvider | null = null;
  let handles: FeatureHandle[] = [];
  let mountedKey = '';

  const teardown = () => {
    for (const handle of handles) {
      try {
        handle.dispose();
      } catch (error) {
        logger.warn('Feature dispose failed', error);
      }
    }
    handles = [];
    provider?.destroy();
    provider = null;
  };

  const mount = () => {
    const url = location.href;
    const key = pageKey();
    if (key === mountedKey) return;
    mountedKey = key;
    teardown();

    if (!featuresForUrl(url).length) return;
    const created = createClockProviderFor(url);
    if (!created) {
      logger.debug('No clock provider for this page');
      return;
    }

    provider = created;
    const context = {
      url,
      provider: created,
      getSettings: () => settings,
      logger,
    };

    try {
      handles = featuresForUrl(url)
        .map((feature) => feature.init(context))
        .filter((handle): handle is FeatureHandle => handle !== null);
    } catch (error) {
      logger.error('Feature initialisation failed', error);
      teardown();
    }
  };

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!isSettingsChanged(message)) return false;
    settings = normalizeAppSettings(message.settings);
    for (const handle of handles) {
      try {
        handle.onSettingsChanged?.(settings);
      } catch (error) {
        logger.warn('Settings update failed', error);
      }
    }
    return false;
  });

  const load = async () => {
    try {
      settings = normalizeAppSettings(
        await sendRequest<AppSettings>({ type: 'settings:get' } satisfies RequestMessage),
      );
    } catch (error) {
      logger.warn('Could not load settings, using defaults', error);
    }
    mount();
  };

  void load();

  setInterval(() => {
    if (pageKey() !== mountedKey) {
      if (!featuresForUrl(location.href).length) {
        mountedKey = pageKey();
        teardown();
      } else {
        mount();
      }
    }
  }, 750);

  window.addEventListener('pagehide', teardown);
}

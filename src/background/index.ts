import { createLogger } from '@/core/logger';
import {
  fail,
  ok,
  type ApiErrorBody,
  type RequestMessage,
  type SettingsChangedMessage,
} from '@/core/messages';
import { chromeSyncArea, deepMerge, SettingsStore } from '@/core/settings/storage';
import type { AppSettings } from '@/core/settings/types';
import {
  APP_SETTINGS_VERSION,
  createDefaultSettings,
  migrateAppSettings,
  normalizeAppSettings,
  validateAppSettings,
} from '@/app/settings';

const logger = createLogger('background');

const store = new SettingsStore<AppSettings>({
  area: chromeSyncArea(),
  defaults: createDefaultSettings(),
  version: APP_SETTINGS_VERSION,
  migrate: migrateAppSettings,
  normalize: normalizeAppSettings,
});

async function broadcast(settings: AppSettings): Promise<void> {
  const message: SettingsChangedMessage = { type: 'settings:changed', settings };

  await new Promise<void>((resolve) => {
    try {
      chrome.runtime.sendMessage(message, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });

  try {
    const tabs = await chrome.tabs.query({ url: 'https://*.chess.com/*' });
    await Promise.all(
      tabs.map(
        (tab) =>
          new Promise<void>((resolve) => {
            if (tab.id === undefined) return resolve();
            chrome.tabs.sendMessage(tab.id, message, () => {
              void chrome.runtime.lastError;
              resolve();
            });
          }),
      ),
    );
  } catch (error) {
    logger.debug('Tab broadcast skipped', error);
  }
}

function validationError(settings: AppSettings): ApiErrorBody | null {
  const errors = validateAppSettings(settings);
  if (errors.length === 0) return null;
  return {
    code: 'validation_error',
    message: 'Some settings are invalid.',
    errors,
  };
}

async function handle(
  message: RequestMessage,
): Promise<ReturnType<typeof ok> | ReturnType<typeof fail>> {
  if (message.type === 'settings:get') {
    return ok(await store.get());
  }

  if (message.type === 'settings:replace') {
    const candidate = normalizeAppSettings(message.settings);
    const error = validationError(candidate);
    if (error) return fail(error);
    const saved = await store.replace(candidate);
    await broadcast(saved);
    return ok(saved);
  }

  if (message.type === 'settings:patch') {
    const current = await store.get();
    const candidate = normalizeAppSettings(deepMerge(current, message.patch));
    const error = validationError(candidate);
    if (error) return fail(error);
    const saved = await store.replace(candidate);
    await broadcast(saved);
    return ok(saved);
  }

  if (message.type === 'settings:reset') {
    const saved = await store.reset();
    await broadcast(saved);
    return ok(saved);
  }

  return fail({ code: 'unknown_request', message: 'Unknown request type.' });
}

chrome.runtime.onInstalled.addListener(() => {
  void store.get().catch((error) => logger.error('Failed to initialise settings', error));
});

chrome.runtime.onStartup.addListener(() => {
  void store.get().catch((error) => logger.error('Failed to load settings', error));
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || !('type' in message)) return false;
  const type = (message as { type: string }).type;
  if (
    type !== 'settings:get' &&
    type !== 'settings:patch' &&
    type !== 'settings:replace' &&
    type !== 'settings:reset'
  ) {
    return false;
  }

  void handle(message as RequestMessage)
    .then(sendResponse)
    .catch((error: unknown) => {
      logger.error('Settings request failed', error);
      sendResponse(
        fail({
          code: 'internal_error',
          message: error instanceof Error ? error.message : 'Unexpected error.',
        }),
      );
    });
  return true;
});

void store.get().catch((error) => logger.error('Failed to warm settings cache', error));

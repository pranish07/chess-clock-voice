import type { AppSettings, DeepPartial, SettingsError } from './settings/types';

export type RequestMessage =
  | { type: 'settings:get' }
  | { type: 'settings:patch'; patch: DeepPartial<AppSettings> }
  | { type: 'settings:replace'; settings: AppSettings }
  | { type: 'settings:reset' };

export interface SettingsChangedMessage {
  type: 'settings:changed';
  settings: AppSettings;
}

export type RuntimeMessage = RequestMessage | SettingsChangedMessage;

export interface ApiErrorBody {
  code: string;
  message: string;
  errors?: SettingsError[];
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody };

export class ApiError extends Error {
  readonly code: string;
  readonly errors: SettingsError[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.errors = body.errors ?? [];
  }
}

export function isSettingsChanged(message: unknown): message is SettingsChangedMessage {
  return (
    message !== null &&
    typeof message === 'object' &&
    (message as { type?: unknown }).type === 'settings:changed' &&
    'settings' in message
  );
}

export async function sendRequest<T>(message: RequestMessage): Promise<T> {
  const response = await new Promise<ApiResponse<T> | undefined>((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (result: ApiResponse<T>) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(result);
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });

  if (!response)
    throw new ApiError({ code: 'no_response', message: 'No response from extension.' });
  if (!response.ok) throw new ApiError(response.error);
  return response.data;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function fail(error: ApiErrorBody): ApiResponse<never> {
  return { ok: false, error };
}

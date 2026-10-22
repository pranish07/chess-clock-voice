import { t } from '@/core/i18n';
import type { SettingsError } from '@/core/settings/types';

export function errorText(error: SettingsError): string {
  return t(error.code, Object.values(error.params ?? {}).map(String));
}

export function errorFor(errors: SettingsError[], path: string): SettingsError | undefined {
  return errors.find((error) => error.path === path);
}

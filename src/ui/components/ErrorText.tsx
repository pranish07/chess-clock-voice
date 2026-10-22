import { errorText } from '@/ui/lib/errors';
import type { SettingsError } from '@/core/settings/types';

export function ErrorText({ error }: { error?: SettingsError }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
      {errorText(error)}
    </p>
  );
}

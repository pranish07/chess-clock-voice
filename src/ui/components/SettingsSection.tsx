import type { ReactNode } from 'react';
import { t } from '@/core/i18n';

interface SettingsSectionProps {
  titleKey: string;
  descriptionKey?: string;
  children: ReactNode;
}

export function SettingsSection({ titleKey, descriptionKey, children }: SettingsSectionProps) {
  return (
    <section className="ccv-card p-5" aria-labelledby={`section-${titleKey}`}>
      <header>
        <h2 id={`section-${titleKey}`} className="text-base font-semibold tracking-tight">
          {t(titleKey)}
        </h2>
        {descriptionKey ? <p className="ccv-help mt-1">{t(descriptionKey)}</p> : null}
      </header>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

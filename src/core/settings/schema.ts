import type { Surface } from './types';

export interface SchemaOption {
  value: string;
  labelKey: string;
}

interface BaseField {
  path: string;
  labelKey: string;
  helpKey?: string;
  surfaces?: Surface[];
}

export type SettingsField =
  | (BaseField & { kind: 'boolean' })
  | (BaseField & { kind: 'select'; options: SchemaOption[]; inline?: boolean })
  | (BaseField & {
      kind: 'slider';
      min: number;
      max: number;
      step: number;
      unitKey?: string;
      showInput?: boolean;
    })
  | (BaseField & { kind: 'number'; min: number; max: number; step: number; unitKey?: string })
  | (BaseField & {
      kind: 'text';
      maxLength?: number;
      placeholderKey?: string;
      tokens?: string[];
      showSpeechMetrics?: boolean;
    })
  | (BaseField & { kind: 'numberList'; min: number; max: number; placeholder?: string })
  | (BaseField & { kind: 'voice'; langPath: string })
  | (BaseField & {
      kind: 'action';
      action: 'test-voice' | 'open-options' | 'reset-settings';
      variant?: 'primary' | 'secondary' | 'ghost';
    })
  | (BaseField & { kind: 'preset-gallery' })
  | (BaseField & { kind: 'info'; textKey: string });

export interface SettingsSection {
  id: string;
  titleKey: string;
  descriptionKey?: string;
  fields: SettingsField[];
  surfaces?: Surface[];
}

export interface SettingsSchema {
  sections: SettingsSection[];
}

export function getPathValue(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function setPathValue<T>(source: T, path: string, value: unknown): T {
  const parts = path.split('.');
  const root: Record<string, unknown> = Array.isArray(source)
    ? ([...source] as unknown as Record<string, unknown>)
    : { ...(source as Record<string, unknown>) };
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]!;
    const existing = cursor[part];
    const next = Array.isArray(existing)
      ? [...existing]
      : existing !== null && typeof existing === 'object'
        ? { ...(existing as Record<string, unknown>) }
        : {};
    cursor[part] = next;
    cursor = next as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
  return root as T;
}

export function schemaSections(schema: SettingsSchema, surface: Surface): SettingsSection[] {
  return schema.sections
    .filter((section) => !section.surfaces || section.surfaces.includes(surface))
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => !field.surfaces || field.surfaces.includes(surface)),
    }))
    .filter((section) => section.fields.length > 0);
}

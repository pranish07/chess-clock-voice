export interface AppSettings {
  version: number;
  masterEnabled: boolean;
  features: Record<string, unknown>;
}

export type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export interface SettingsError {
  path: string;
  code: string;
  params?: Record<string, string | number>;
}

export interface ValidationResult {
  valid: boolean;
  errors: SettingsError[];
}

export type Surface = 'popup' | 'options';

export const TIME_CONTROL_CATEGORIES = ['bullet', 'blitz', 'rapid', 'daily'] as const;
export type TimeControlCategory = (typeof TIME_CONTROL_CATEGORIES)[number];

export interface CategoryMeta {
  baseSeconds: number;
  defaultThreshold: number;
  labelKey: string;
}

/**
 * `baseSeconds` doubles as the maximum allowed announcement threshold for the
 * category, per the product spec (bullet threshold can never exceed 60s).
 */
export const CATEGORY_META: Record<TimeControlCategory, CategoryMeta> = {
  bullet: { baseSeconds: 60, defaultThreshold: 50, labelKey: 'categoryBullet' },
  blitz: { baseSeconds: 300, defaultThreshold: 20, labelKey: 'categoryBlitz' },
  rapid: { baseSeconds: 900, defaultThreshold: 20, labelKey: 'categoryRapid' },
  daily: { baseSeconds: 3600, defaultThreshold: 20, labelKey: 'categoryDaily' },
};

export type IncrementSource = 'time-control' | 'observed' | 'none';

export interface TimeControlInfo {
  raw: string | null;
  category: TimeControlCategory | null;
  baseSeconds: number | null;
  incrementSeconds: number;
  incrementSource: IncrementSource;
}

export interface ParsedTimeControl {
  baseSeconds: number;
  incrementSeconds: number;
  raw: string;
}

export function isTimeControlCategory(value: unknown): value is TimeControlCategory {
  return (
    typeof value === 'string' && (TIME_CONTROL_CATEGORIES as readonly string[]).includes(value)
  );
}

export function classifyTimeControl(
  baseSeconds: number,
  incrementSeconds = 0,
): TimeControlCategory {
  if (baseSeconds <= 180 && incrementSeconds <= 1) return 'bullet';
  if (baseSeconds <= 300) return 'blitz';
  if (baseSeconds <= 3600) return 'rapid';
  return 'daily';
}

/**
 * Understands chess.com time control labels such as `3|2`, `10+5`,
 * `3 min`, `30 sec`, `1 day`, and `10 min (5 sec increment)`.
 */
export function parseTimeControlText(raw: string | null | undefined): ParsedTimeControl | null {
  if (!raw) return null;
  const text = raw
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase();
  if (!text) return null;

  if (/\bdaily\b|\bday\b|\bweek\b/.test(text)) {
    return { baseSeconds: 86400, incrementSeconds: 0, raw: raw.trim() };
  }

  const paired = text.match(/(\d+(?:\.\d+)?)\s*(?:\||\+)\s*(\d+(?:\.\d+)?)/);
  if (paired?.[1] && paired[2]) {
    const base = Number(paired[1]);
    const increment = Number(paired[2]);
    if (Number.isFinite(base) && Number.isFinite(increment)) {
      const minutes = /min|minute/.test(text) || base <= 60;
      return {
        baseSeconds: minutes ? base * 60 : base,
        incrementSeconds: increment,
        raw: raw.trim(),
      };
    }
  }

  const minutes = text.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)\b/);
  if (minutes?.[1]) {
    const inc = text.match(/(\d+(?:\.\d+)?)\s*(?:sec|secs|second|seconds)\s*(?:increment|inc)?/);
    return {
      baseSeconds: Number(minutes[1]) * 60,
      incrementSeconds: inc?.[1] ? Number(inc[1]) : 0,
      raw: raw.trim(),
    };
  }

  const seconds = text.match(/(\d+(?:\.\d+)?)\s*(?:sec|secs|second|seconds)\b/);
  if (seconds?.[1]) {
    return { baseSeconds: Number(seconds[1]), incrementSeconds: 0, raw: raw.trim() };
  }

  const plain = text.match(/^(\d+(?:\.\d+)?)$/);
  if (plain?.[1]) {
    return { baseSeconds: Number(plain[1]), incrementSeconds: 0, raw: raw.trim() };
  }

  return null;
}

export function timeControlInfoFromParsed(parsed: ParsedTimeControl): TimeControlInfo {
  return {
    raw: parsed.raw,
    category: classifyTimeControl(parsed.baseSeconds, parsed.incrementSeconds),
    baseSeconds: parsed.baseSeconds,
    incrementSeconds: parsed.incrementSeconds,
    incrementSource: parsed.incrementSeconds > 0 ? 'time-control' : 'none',
  };
}

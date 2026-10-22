const WHITESPACE = /[\s\u00a0\u202f]/g;

/**
 * Parses chess.com clock text. Supported forms:
 *   `1:23`, `0:09.3`, `09.3`, `23`, `1:02:03`, `-0:03`.
 * Returns seconds (clamped at 0) or null when the text is not a clock.
 */
export function parseClockText(input: string | null | undefined): number | null {
  if (input == null) return null;
  let text = input.replace(WHITESPACE, '');
  if (!text) return null;

  let negative = false;
  if (text.startsWith('-') || text.startsWith('\u2212')) {
    negative = true;
    text = text.slice(1);
  }

  if (!/^\d{1,3}(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(text)) return null;

  const parts = text.split(':');
  if (parts.length > 3) return null;

  const last = Number(parts[parts.length - 1]);
  if (!Number.isFinite(last)) return null;

  let seconds = 0;
  if (parts.length === 1) {
    seconds = last;
  } else if (parts.length === 2) {
    const minutes = Number(parts[0]);
    if (!Number.isFinite(minutes) || last >= 60) return null;
    seconds = minutes * 60 + last;
  } else {
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes >= 60 || last >= 60) {
      return null;
    }
    seconds = hours * 3600 + minutes * 60 + last;
  }

  if (!Number.isFinite(seconds)) return null;
  return negative ? 0 : Math.round(seconds * 1000) / 1000;
}

export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, seconds);
  if (safe < 10) return safe.toFixed(1);
  const whole = Math.ceil(safe);
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

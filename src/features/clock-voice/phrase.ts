export const ALLOWED_TOKENS = ['seconds', 'increment', 'timeControl'] as const;
export type PhraseToken = (typeof ALLOWED_TOKENS)[number];

export const MAX_PHRASE_CHARS = 40;
export const MAX_SPOKEN_SECONDS = 1.4;

const TOKEN_PATTERN = /\{([a-zA-Z]+)\}/g;

export interface PhraseValues {
  seconds: number;
  increment: number;
  timeControl: string;
}

export function phraseTokens(phrase: string): string[] {
  return [...phrase.matchAll(TOKEN_PATTERN)].map((match) => match[1] ?? '');
}

export function unknownTokens(phrase: string): string[] {
  return [...new Set(phraseTokens(phrase).filter((token) => !isAllowedToken(token)))];
}

export function isAllowedToken(token: string): token is PhraseToken {
  return (ALLOWED_TOKENS as readonly string[]).includes(token);
}

export function renderPhrase(phrase: string, values: PhraseValues): string {
  return phrase.replace(TOKEN_PATTERN, (match, token: string) => {
    if (token === 'seconds') return String(Math.max(0, Math.round(values.seconds)));
    if (token === 'increment') return String(Math.max(0, values.increment));
    if (token === 'timeControl') return values.timeControl;
    return match;
  });
}

export function phraseSample(phrase: string): string {
  return renderPhrase(phrase, { seconds: 20, increment: 2, timeControl: 'blitz' }).trim();
}

/**
 * Cheap, deterministic estimate used for the live UI meter and validation.
 * Average English speech is roughly 3.2 words/second.
 */
export function estimateSpeechSeconds(phrase: string): number {
  const sample = phraseSample(phrase);
  const words = sample.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) return 0;
  const wordDuration = wordCount / 3.2;
  const numberPenalty = /\d/.test(sample) ? 0.2 : 0;
  return Math.round((0.25 + wordDuration + numberPenalty) * 100) / 100;
}

export function validatePhrase(phrase: string): string[] {
  const errors: string[] = [];
  if (!phrase.trim()) errors.push('errorPhraseEmpty');
  if (phrase.length > MAX_PHRASE_CHARS) errors.push('errorPhraseLength');
  if (unknownTokens(phrase).length > 0) errors.push('errorPhraseToken');
  if (estimateSpeechSeconds(phrase) > MAX_SPOKEN_SECONDS) errors.push('errorPhraseDuration');
  return errors;
}

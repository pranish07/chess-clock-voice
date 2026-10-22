import { describe, expect, it } from 'vitest';
import {
  estimateSpeechSeconds,
  renderPhrase,
  unknownTokens,
  validatePhrase,
} from '@/features/clock-voice/phrase';

describe('phrase rendering', () => {
  it('renders every token', () => {
    expect(
      renderPhrase('{seconds}s, +{increment} in {timeControl}', {
        seconds: 9.3,
        increment: 2,
        timeControl: 'blitz',
      }),
    ).toBe('9s, +2 in blitz');
  });

  it('finds unknown tokens', () => {
    expect(unknownTokens('{seconds} {oops}')).toEqual(['oops']);
  });

  it('validates empty, long, unknown, and slow phrases', () => {
    expect(validatePhrase('')).toContain('errorPhraseEmpty');
    expect(validatePhrase('x'.repeat(41))).toContain('errorPhraseLength');
    expect(validatePhrase('{unknown}')).toContain('errorPhraseToken');
    expect(validatePhrase('this phrase has far too many words to say quickly')).toContain(
      'errorPhraseDuration',
    );
    expect(validatePhrase('{seconds} seconds left')).toEqual([]);
  });

  it('estimates speech duration', () => {
    expect(estimateSpeechSeconds('{seconds}')).toBeLessThan(0.8);
    expect(estimateSpeechSeconds('{seconds} seconds left')).toBeLessThan(1.4);
  });
});

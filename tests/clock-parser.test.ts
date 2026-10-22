import { describe, expect, it } from 'vitest';
import { formatSeconds, parseClockText } from '@/adapters/chesscom/clock-parser';

describe('parseClockText', () => {
  it('parses m:ss', () => {
    expect(parseClockText('1:23')).toBe(83);
    expect(parseClockText('10:00')).toBe(600);
    expect(parseClockText('0:05')).toBe(5);
  });

  it('parses whole seconds', () => {
    expect(parseClockText('23')).toBe(23);
    expect(parseClockText('9')).toBe(9);
    expect(parseClockText('0')).toBe(0);
  });

  it('parses tenths below ten seconds', () => {
    expect(parseClockText('0:09.3')).toBe(9.3);
    expect(parseClockText('09.3')).toBe(9.3);
    expect(parseClockText('1:02.05')).toBe(62.05);
  });

  it('parses hours and non-breaking spaces', () => {
    expect(parseClockText('1:02:03')).toBe(3723);
    expect(parseClockText(' 0:09.3\u00a0')).toBe(9.3);
  });

  it('clamps flagged negative clocks to zero', () => {
    expect(parseClockText('-0:03')).toBe(0);
    expect(parseClockText('\u22120:01.2')).toBe(0);
  });

  it('rejects non-clock text', () => {
    expect(parseClockText('1 day')).toBeNull();
    expect(parseClockText('abc')).toBeNull();
    expect(parseClockText('1:99')).toBeNull();
    expect(parseClockText('1:2:3:4')).toBeNull();
    expect(parseClockText('')).toBeNull();
    expect(parseClockText(null)).toBeNull();
  });
});

describe('formatSeconds', () => {
  it('formats for debug output', () => {
    expect(formatSeconds(9.3)).toBe('9.3');
    expect(formatSeconds(83)).toBe('1:23');
  });
});

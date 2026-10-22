import { describe, expect, it } from 'vitest';
import { classifyTimeControl, parseTimeControlText } from '@/core/time-control';

describe('parseTimeControlText', () => {
  it('parses pipe and plus notations', () => {
    expect(parseTimeControlText('3|2')).toMatchObject({
      baseSeconds: 180,
      incrementSeconds: 2,
    });
    expect(parseTimeControlText('10+5')).toMatchObject({
      baseSeconds: 600,
      incrementSeconds: 5,
    });
    expect(parseTimeControlText('1|0')).toMatchObject({
      baseSeconds: 60,
      incrementSeconds: 0,
    });
  });

  it('parses verbose chess.com labels', () => {
    expect(parseTimeControlText('10 min (5 sec increment)')).toMatchObject({
      baseSeconds: 600,
      incrementSeconds: 5,
    });
    expect(parseTimeControlText('30 sec')).toMatchObject({ baseSeconds: 30 });
    expect(parseTimeControlText('1 day')).toMatchObject({ baseSeconds: 86400 });
  });

  it('rejects unrelated text', () => {
    expect(parseTimeControlText('rated blitz')).toBeNull();
    expect(parseTimeControlText(null)).toBeNull();
  });
});

describe('classifyTimeControl', () => {
  it('classifies by base time and increment', () => {
    expect(classifyTimeControl(60)).toBe('bullet');
    expect(classifyTimeControl(180, 0)).toBe('bullet');
    expect(classifyTimeControl(180, 2)).toBe('blitz');
    expect(classifyTimeControl(300)).toBe('blitz');
    expect(classifyTimeControl(600)).toBe('rapid');
    expect(classifyTimeControl(900)).toBe('rapid');
    expect(classifyTimeControl(86400)).toBe('daily');
  });
});

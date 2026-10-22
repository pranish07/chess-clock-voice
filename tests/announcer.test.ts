import { describe, expect, it } from 'vitest';
import { ClockAnnouncer, effectiveThreshold } from '@/features/clock-voice/announcer';
import type { Cadence } from '@/features/clock-voice/settings';

interface TickOptions {
  seconds: number;
  now: number;
  threshold?: number;
  incrementSeconds?: number;
  incrementAware?: boolean;
  cadence?: Cadence;
  milestones?: number[];
  settleMs?: number;
}

function tick(announcer: ClockAnnouncer, key: string, options: TickOptions) {
  return announcer.tick(key, {
    seconds: options.seconds,
    now: options.now,
    threshold: options.threshold ?? 20,
    incrementSeconds: options.incrementSeconds ?? 0,
    incrementAware: options.incrementAware ?? true,
    cadence: options.cadence ?? 'every',
    milestones: options.milestones ?? [10, 5, 3, 2, 1],
    settleMs: options.settleMs ?? 0,
  });
}

describe('effectiveThreshold', () => {
  it('subtracts increment with a floor of five', () => {
    expect(effectiveThreshold(20, 2, true)).toBe(18);
    expect(effectiveThreshold(6, 10, true)).toBe(5);
    expect(effectiveThreshold(20, 2, false)).toBe(20);
  });
});

describe('ClockAnnouncer', () => {
  it('announces each whole second once', () => {
    const announcer = new ClockAnnouncer();
    expect(tick(announcer, 'bottom', { seconds: 20.2, now: 1000 }).announce).toBe(false);
    const first = tick(announcer, 'bottom', { seconds: 19.9, now: 1100 });
    expect(first).toMatchObject({ announce: true, second: 20 });
    expect(tick(announcer, 'bottom', { seconds: 19.8, now: 1200 }).announce).toBe(false);
    expect(tick(announcer, 'bottom', { seconds: 19.0, now: 1300 })).toMatchObject({
      announce: true,
      second: 19,
    });
    expect(tick(announcer, 'bottom', { seconds: 18.9, now: 1400 }).announce).toBe(false);
  });

  it('waits until the threshold is crossed', () => {
    const announcer = new ClockAnnouncer();
    tick(announcer, 'top', { seconds: 25, now: 0 });
    expect(tick(announcer, 'top', { seconds: 21, now: 100 }).announce).toBe(false);
    expect(tick(announcer, 'top', { seconds: 20.0, now: 200 }).announce).toBe(true);
  });

  it('never announces the same whole second twice across tenths', () => {
    const announcer = new ClockAnnouncer();
    tick(announcer, 'bottom', { seconds: 10.1, now: 0 });
    expect(tick(announcer, 'bottom', { seconds: 9.9, now: 100 })).toMatchObject({
      announce: true,
      second: 10,
    });
    expect(tick(announcer, 'bottom', { seconds: 9.8, now: 200 }).announce).toBe(false);
    expect(tick(announcer, 'bottom', { seconds: 9.3, now: 300 }).announce).toBe(false);
    expect(tick(announcer, 'bottom', { seconds: 8.9, now: 400 })).toMatchObject({
      announce: true,
      second: 9,
    });
  });

  it('resets after an increment jump and observes the settle window', () => {
    const announcer = new ClockAnnouncer();
    tick(announcer, 'bottom', { seconds: 15.2, now: 0 });
    expect(tick(announcer, 'bottom', { seconds: 14.9, now: 100 }).announce).toBe(true);
    const jump = tick(announcer, 'bottom', { seconds: 17.2, now: 200, settleMs: 300 });
    expect(jump).toMatchObject({ announce: false, reset: true, incrementDetected: 2 });
    expect(tick(announcer, 'bottom', { seconds: 17.1, now: 300 }).announce).toBe(false);
    const afterSettle = tick(announcer, 'bottom', { seconds: 16.9, now: 600 });
    expect(afterSettle).toMatchObject({ announce: true, second: 17 });
  });

  it('does not treat a new-game reset as a giant increment', () => {
    const announcer = new ClockAnnouncer();
    tick(announcer, 'bottom', { seconds: 20.2, now: 0, settleMs: 300 });
    const reset = tick(announcer, 'bottom', { seconds: 60, now: 100, settleMs: 300 });
    expect(reset).toMatchObject({ announce: false, reset: true, incrementDetected: 0 });
    const afterSettle = tick(announcer, 'bottom', { seconds: 20, now: 900 });
    expect(afterSettle).toMatchObject({ announce: true, second: 20, effectiveThreshold: 20 });
  });

  it('uses the increment-adjusted threshold', () => {
    const aware = new ClockAnnouncer();
    tick(aware, 'bottom', { seconds: 18.2, now: 0, incrementSeconds: 3 });
    expect(tick(aware, 'bottom', { seconds: 17.9, now: 100, incrementSeconds: 3 }).announce).toBe(
      false,
    );
    expect(tick(aware, 'bottom', { seconds: 17.0, now: 200, incrementSeconds: 3 })).toMatchObject({
      announce: true,
      second: 17,
    });

    const plain = new ClockAnnouncer();
    tick(plain, 'bottom', { seconds: 18.2, now: 0, incrementSeconds: 3, incrementAware: false });
    expect(
      tick(plain, 'bottom', {
        seconds: 17.9,
        now: 100,
        incrementSeconds: 3,
        incrementAware: false,
      }).announce,
    ).toBe(true);
  });

  it('floors the effective threshold at five seconds', () => {
    const announcer = new ClockAnnouncer();
    tick(announcer, 'bottom', {
      seconds: 5.2,
      now: 0,
      threshold: 6,
      incrementSeconds: 10,
    });
    expect(
      tick(announcer, 'bottom', {
        seconds: 5.1,
        now: 100,
        threshold: 6,
        incrementSeconds: 10,
      }).announce,
    ).toBe(false);
    expect(
      tick(announcer, 'bottom', {
        seconds: 4.9,
        now: 200,
        threshold: 6,
        incrementSeconds: 10,
      }),
    ).toMatchObject({ announce: true, second: 5 });
  });

  it('supports panic cadence', () => {
    const announcer = new ClockAnnouncer();
    tick(announcer, 'bottom', { seconds: 20.2, now: 0, cadence: 'panic' });
    expect(tick(announcer, 'bottom', { seconds: 20, now: 100, cadence: 'panic' }).announce).toBe(
      true,
    );
    expect(tick(announcer, 'bottom', { seconds: 19, now: 200, cadence: 'panic' }).announce).toBe(
      false,
    );
    expect(tick(announcer, 'bottom', { seconds: 15, now: 300, cadence: 'panic' }).announce).toBe(
      true,
    );
    expect(tick(announcer, 'bottom', { seconds: 14, now: 400, cadence: 'panic' }).announce).toBe(
      false,
    );
    expect(tick(announcer, 'bottom', { seconds: 10, now: 500, cadence: 'panic' }).announce).toBe(
      true,
    );
    expect(tick(announcer, 'bottom', { seconds: 9, now: 600, cadence: 'panic' }).announce).toBe(
      true,
    );
  });

  it('supports milestone cadence only', () => {
    const announcer = new ClockAnnouncer();
    const options = { cadence: 'milestones' as const, milestones: [10, 5, 3, 2, 1] };
    tick(announcer, 'bottom', { seconds: 11.2, now: 0, ...options });
    expect(tick(announcer, 'bottom', { seconds: 11, now: 100, ...options }).announce).toBe(false);
    expect(tick(announcer, 'bottom', { seconds: 10, now: 200, ...options }).announce).toBe(true);
    expect(tick(announcer, 'bottom', { seconds: 9, now: 300, ...options }).announce).toBe(false);
    expect(tick(announcer, 'bottom', { seconds: 5, now: 400, ...options }).announce).toBe(true);
    expect(tick(announcer, 'bottom', { seconds: 1, now: 500, ...options }).announce).toBe(true);
  });
});

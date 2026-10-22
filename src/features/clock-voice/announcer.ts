import type { Cadence } from './settings';

export interface AnnouncerTick {
  seconds: number;
  now: number;
  threshold: number;
  incrementSeconds: number;
  incrementAware: boolean;
  cadence: Cadence;
  milestones: number[];
  settleMs: number;
}

export interface AnnouncementDecision {
  announce: boolean;
  second?: number;
  effectiveThreshold: number;
  reset: boolean;
  incrementDetected: number;
}

export interface AnnouncerState {
  announced: Set<number>;
  lastSeconds: number | null;
  settleUntil: number;
  detectedIncrement: number;
}

export function effectiveThreshold(
  threshold: number,
  incrementSeconds: number,
  aware: boolean,
): number {
  if (!aware || incrementSeconds <= 0) return threshold;
  return Math.max(5, threshold - incrementSeconds);
}

export function shouldAnnounceAtSecond(
  second: number,
  cadence: Cadence,
  milestones: number[],
): boolean {
  if (cadence === 'every') return true;
  if (cadence === 'panic') return second <= 10 || second % 5 === 0;
  return milestones.includes(second);
}

/**
 * Pure per-clock announcement state machine.
 *
 * - Announces at most once per whole second.
 * - Treats an upward clock jump > 0.75s as an increment and resets state.
 * - Suppresses audio for `settleMs` after a jump/reset while the clock settles.
 * - Uses ceil(seconds) so 19.9 reads as 20 and 9.3 reads as 10.
 */
export class ClockAnnouncer {
  private readonly states = new Map<string, AnnouncerState>();

  private stateFor(key: string): AnnouncerState {
    let state = this.states.get(key);
    if (!state) {
      state = {
        announced: new Set(),
        lastSeconds: null,
        settleUntil: 0,
        detectedIncrement: 0,
      };
      this.states.set(key, state);
    }
    return state;
  }

  reset(key?: string): void {
    if (key) this.states.delete(key);
    else this.states.clear();
  }

  getState(key: string): Readonly<AnnouncerState> | undefined {
    return this.states.get(key);
  }

  tick(key: string, tick: AnnouncerTick): AnnouncementDecision {
    const state = this.stateFor(key);
    const threshold = effectiveThreshold(
      tick.threshold,
      Math.max(tick.incrementSeconds, state.detectedIncrement),
      tick.incrementAware,
    );

    if (!Number.isFinite(tick.seconds) || tick.seconds < 0) {
      return { announce: false, effectiveThreshold: threshold, reset: false, incrementDetected: 0 };
    }

    const previous = state.lastSeconds;
    state.lastSeconds = tick.seconds;

    if (previous === null) {
      return { announce: false, effectiveThreshold: threshold, reset: false, incrementDetected: 0 };
    }

    const delta = tick.seconds - previous;
    if (delta > 0.75) {
      state.announced.clear();
      const candidate = Math.round(delta);
      state.detectedIncrement = candidate >= 1 && candidate <= 15 ? candidate : 0;
      state.settleUntil = tick.now + Math.max(0, tick.settleMs);
      return {
        announce: false,
        effectiveThreshold: threshold,
        reset: true,
        incrementDetected: state.detectedIncrement,
      };
    }

    if (delta > 0.1) {
      state.settleUntil = Math.max(state.settleUntil, tick.now + Math.max(0, tick.settleMs));
      return { announce: false, effectiveThreshold: threshold, reset: false, incrementDetected: 0 };
    }

    if (tick.now < state.settleUntil) {
      return { announce: false, effectiveThreshold: threshold, reset: false, incrementDetected: 0 };
    }

    const second = Math.ceil(tick.seconds - 1e-6);

    if (second > threshold) {
      if (second > tick.threshold + 2) state.announced.clear();
      return { announce: false, effectiveThreshold: threshold, reset: false, incrementDetected: 0 };
    }

    if (second < 0 || state.announced.has(second)) {
      return { announce: false, effectiveThreshold: threshold, reset: false, incrementDetected: 0 };
    }

    if (!shouldAnnounceAtSecond(second, tick.cadence, tick.milestones)) {
      return { announce: false, effectiveThreshold: threshold, reset: false, incrementDetected: 0 };
    }

    state.announced.add(second);
    return {
      announce: true,
      second,
      effectiveThreshold: threshold,
      reset: false,
      incrementDetected: 0,
    };
  }
}

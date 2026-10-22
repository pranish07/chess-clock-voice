import { TypedEventBus } from '@/core/bus';
import type { TimeControlInfo } from '@/core/time-control';
import {
  classifyTimeControl,
  parseTimeControlText,
  timeControlInfoFromParsed,
} from '@/core/time-control';
import type {
  ClockProvider,
  ClockProviderFactory,
  ClockReading,
  ClockSide,
  ClockSnapshot,
} from '../types';
import { parseClockText } from './clock-parser';
import { CHESSCOM_SELECTORS, matchesLiveGame } from './selectors';

const TURN_CLASS_HINTS = ['clock-player-turn', 'clock-running', 'running'];

function firstMatch(root: ParentNode, selectors: readonly string[]): Element | null {
  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found;
  }
  return null;
}

function queryAllUnique(root: ParentNode, selectors: readonly string[]): Element[] {
  const seen = new Set<Element>();
  const result: Element[] = [];
  for (const selector of selectors) {
    for (const element of root.querySelectorAll(selector)) {
      if (!seen.has(element)) {
        seen.add(element);
        result.push(element);
      }
    }
  }
  return result;
}

function parseTimeControlCandidate(text: string | null): ReturnType<typeof parseTimeControlText> {
  if (!text) return null;
  const compact = text.replace(/\s+/g, ' ').trim();
  const paired = compact.match(/\d+(?:\.\d+)?\s*(?:\||\+)\s*\d+(?:\.\d+)?/);
  if (paired) return parseTimeControlText(paired[0]);
  if (/\d+\s*(?:min|minute|sec|second|day|week)/i.test(compact))
    return parseTimeControlText(compact);
  return null;
}

/**
 * chess.com live-game adapter.
 *
 * Assumptions (documented in README):
 *  - The bottom clock is the player's clock unless the board is flipped.
 *  - `3|2` / `3+2` mean 3 minutes with a 2 second increment.
 *  - A clock jump of 0.8s-15s shortly after a move is an increment. Bigger
 *    jumps are treated as a new game / reset and ignored for increment learning.
 */
export class ChessComClockProvider implements ClockProvider {
  readonly id = 'chesscom';

  private readonly doc: Document;
  private readonly win: Window | null;
  private readonly bus = new TypedEventBus<{ tick: ClockSnapshot }>();
  private listenerCount = 0;
  private observer: MutationObserver | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private emitTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSignature = '';
  private destroyed = false;

  private readonly lastSecondsBySide: Partial<Record<ClockSide, number>> = {};
  private observedIncrement = 0;
  private maxClockSeconds = 0;
  private cachedTimeControl: TimeControlInfo | null = null;

  constructor(doc: Document = document, win: Window | null = doc.defaultView) {
    this.doc = doc;
    this.win = win;
  }

  matches(url: string): boolean {
    return matchesLiveGame(url);
  }

  getClocks(): ClockSnapshot | null {
    const clocks = this.readClocks();
    if (!clocks) return null;

    return {
      top: clocks.top,
      bottom: clocks.bottom,
      timeControl: this.getTimeControl(),
      playerSide: this.getPlayerSide(),
      url: this.win?.location?.href ?? this.doc.location?.href ?? '',
    };
  }

  getTimeControl(): TimeControlInfo {
    if (!this.cachedTimeControl) this.cachedTimeControl = this.extractTimeControl();

    const parsed = this.cachedTimeControl;
    const detected = this.observedIncrement;
    const increment =
      parsed.incrementSeconds > 0 ? parsed.incrementSeconds : detected > 0 ? detected : 0;

    const category =
      parsed.raw === null && parsed.baseSeconds
        ? classifyTimeControl(parsed.baseSeconds, increment)
        : parsed.category;

    return {
      ...parsed,
      category,
      incrementSeconds: increment,
      incrementSource:
        parsed.incrementSeconds > 0 ? 'time-control' : detected > 0 ? 'observed' : 'none',
    };
  }

  getPlayerSide(): ClockSide {
    // chess.com renders the signed-in player's clock at the bottom of a live
    // board. Board orientation reflects the player's color and does not move
    // the clock panels, so it must not be used to swap sides here.
    return 'bottom';
  }

  onTick(listener: (snapshot: ClockSnapshot) => void): () => void {
    if (this.destroyed) return () => undefined;
    const off = this.bus.on('tick', listener);
    this.listenerCount += 1;
    this.start();
    const snapshot = this.getClocks();
    if (snapshot) listener(snapshot);
    return () => {
      off();
      this.listenerCount = Math.max(0, this.listenerCount - 1);
      if (this.listenerCount === 0) this.stop();
    };
  }

  destroy(): void {
    this.destroyed = true;
    this.listenerCount = 0;
    this.bus.clear();
    this.stop();
  }

  private start(): void {
    if (this.intervalId !== null) return;
    const target = this.doc.documentElement ?? this.doc.body;
    if (target && typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(() => this.scheduleEmit());
      this.observer.observe(target, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    }
    this.intervalId = setInterval(() => this.scheduleEmit(), 100);
  }

  private stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.intervalId !== null) clearInterval(this.intervalId);
    this.intervalId = null;
    if (this.emitTimer !== null) clearTimeout(this.emitTimer);
    this.emitTimer = null;
  }

  private scheduleEmit(): void {
    if (this.emitTimer !== null || this.listenerCount === 0) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      const snapshot = this.getClocks();
      if (!snapshot) return;
      const signature = [
        snapshot.top.text,
        snapshot.top.isTurn,
        snapshot.bottom.text,
        snapshot.bottom.isTurn,
        snapshot.timeControl.raw,
        snapshot.timeControl.category,
        snapshot.timeControl.incrementSeconds,
        snapshot.playerSide,
        snapshot.url,
      ].join('|');
      if (signature === this.lastSignature) return;
      this.lastSignature = signature;
      this.bus.emit('tick', snapshot);
    }, 30);
  }

  private readClocks(): { top: ClockReading; bottom: ClockReading } | null {
    const containers = this.findClockContainers();
    if (!containers) return null;

    const readings: ClockReading[] = containers.map((element, index) => {
      const explicit = this.explicitSide(element);
      const side: ClockSide = explicit ?? (index === 0 ? 'top' : 'bottom');
      const textElement = firstMatch(element, CHESSCOM_SELECTORS.clockText);
      const text = (textElement?.textContent ?? element.textContent ?? '').trim();
      return {
        side,
        seconds: parseClockText(text),
        text,
        isTurn: this.isClockTurn(element),
        element,
      };
    });

    if (readings.length < 2) return null;

    const top = readings.find((reading) => reading.side === 'top') ?? readings[0];
    const bottom = readings.find((reading) => reading.side === 'bottom') ?? readings[1];
    if (!top || !bottom || top === bottom) return null;

    for (const reading of [top, bottom]) {
      if (reading.seconds == null) continue;
      this.maxClockSeconds = Math.max(this.maxClockSeconds, reading.seconds);
      this.learnIncrement(reading);
    }

    return { top, bottom };
  }

  private findClockContainers(): Element[] | null {
    for (const selector of CHESSCOM_SELECTORS.clockContainers) {
      const found = [...this.doc.querySelectorAll(selector)].filter(
        (element) => !this.isNestedDuplicate(element, selector),
      );
      if (found.length >= 2) return found.slice(0, 2);
    }

    const textNodes = queryAllUnique(this.doc, CHESSCOM_SELECTORS.clockText);
    if (textNodes.length >= 2) {
      const parents = textNodes.slice(0, 2).map((node) => node.parentElement ?? node);
      return parents[0] === parents[1] ? null : parents;
    }
    return null;
  }

  private isNestedDuplicate(element: Element, selector: string): boolean {
    const parent = element.parentElement?.closest(selector);
    return parent !== null && parent !== element;
  }

  private explicitSide(element: Element): ClockSide | null {
    for (const selector of CHESSCOM_SELECTORS.bottomClock) {
      if (element.matches(selector) || element.closest(selector)) return 'bottom';
    }
    for (const selector of CHESSCOM_SELECTORS.topClock) {
      if (element.matches(selector) || element.closest(selector)) return 'top';
    }
    const className = typeof element.className === 'string' ? element.className : '';
    if (/\b(?:clock-)?bottom\b/.test(className)) return 'bottom';
    if (/\b(?:clock-)?top\b/.test(className)) return 'top';
    return null;
  }

  private isClockTurn(element: Element): boolean {
    if (TURN_CLASS_HINTS.some((hint) => element.classList.contains(hint))) return true;
    for (const selector of CHESSCOM_SELECTORS.turnClock) {
      if (element.matches(selector) || element.querySelector(selector)) return true;
    }
    return false;
  }

  private learnIncrement(reading: ClockReading): void {
    if (reading.seconds == null) return;
    const previous = this.lastSecondsBySide[reading.side];
    this.lastSecondsBySide[reading.side] = reading.seconds;

    if (previous == null || previous <= 0 || reading.seconds <= previous) return;
    const delta = reading.seconds - previous;
    if (delta < 0.8 || delta > 15) return;
    const rounded = Math.round(delta * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 0.25) {
      this.observedIncrement = Math.round(rounded);
    }
  }

  private extractTimeControl(): TimeControlInfo {
    for (const element of queryAllUnique(this.doc, CHESSCOM_SELECTORS.timeControl)) {
      const parsed = parseTimeControlCandidate(element.textContent);
      if (parsed) {
        const info = timeControlInfoFromParsed(parsed);
        if (info.baseSeconds) {
          this.maxClockSeconds = Math.max(this.maxClockSeconds, info.baseSeconds);
        }
        return info;
      }
    }

    const attrValue = this.doc
      .querySelector('[data-time-control]')
      ?.getAttribute('data-time-control');
    const attrParsed = parseTimeControlCandidate(attrValue ?? null);
    if (attrParsed) return timeControlInfoFromParsed(attrParsed);

    if (this.maxClockSeconds > 0) {
      const category = classifyTimeControl(this.maxClockSeconds, this.observedIncrement);
      return {
        raw: null,
        category,
        baseSeconds: this.maxClockSeconds,
        incrementSeconds: this.observedIncrement,
        incrementSource: this.observedIncrement > 0 ? 'observed' : 'none',
      };
    }

    return {
      raw: null,
      category: null,
      baseSeconds: null,
      incrementSeconds: this.observedIncrement,
      incrementSource: this.observedIncrement > 0 ? 'observed' : 'none',
    };
  }
}

export const CHESSCOM_FACTORY: ClockProviderFactory = {
  id: 'chesscom',
  matches: matchesLiveGame,
  create: (doc, win) => new ChessComClockProvider(doc, win ?? undefined),
};

import type { TimeControlInfo } from '@/core/time-control';

export type ClockSide = 'top' | 'bottom';

export interface ClockReading {
  side: ClockSide;
  seconds: number | null;
  text: string;
  isTurn: boolean;
  element: Element | null;
}

export interface ClockSnapshot {
  top: ClockReading;
  bottom: ClockReading;
  timeControl: TimeControlInfo;
  playerSide: ClockSide;
  url: string;
}

/**
 * Adapters are the only layer that knows about a site's DOM. Features consume
 * this interface, so adding lichess means adding a new adapter implementation.
 */
export interface ClockProvider {
  readonly id: string;
  matches(url: string): boolean;
  getClocks(): ClockSnapshot | null;
  getTimeControl(): TimeControlInfo;
  getPlayerSide(): ClockSide;
  onTick(listener: (snapshot: ClockSnapshot) => void): () => void;
  destroy(): void;
}

export interface ClockProviderFactory {
  id: string;
  matches(url: string): boolean;
  create(doc?: Document, win?: Window): ClockProvider;
}

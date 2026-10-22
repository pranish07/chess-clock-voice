import { ChessComClockProvider, CHESSCOM_FACTORY } from './chesscom/provider';
import type { ClockProvider, ClockProviderFactory } from './types';

const FACTORIES: ClockProviderFactory[] = [CHESSCOM_FACTORY];

export function registerClockProvider(factory: ClockProviderFactory): void {
  FACTORIES.push(factory);
}

export function createClockProviderFor(
  url: string,
  doc?: Document,
  win?: Window,
): ClockProvider | null {
  const factory = FACTORIES.find((candidate) => candidate.matches(url));
  return factory ? factory.create(doc, win) : null;
}

export { ChessComClockProvider };

/**
 * Every chess.com selector lives here. Selector lists are ordered fallbacks;
 * add new variants at the end. Keeping them in one file means a chess.com DOM
 * change is a one-file patch and never leaks into core or features.
 */
export const CHESSCOM_SELECTORS = {
  clockContainers: ['.clock-component', '[data-test-element="clock"]', '.clock', '.clock-node'],
  clockText: ['.clock-time-monospace', '.clock-time', '[data-test-element="clock-time"]', '.time'],
  bottomClock: ['.clock-bottom', '[data-test-element="clock-bottom"]', '.clock-node-bottom'],
  topClock: ['.clock-top', '[data-test-element="clock-top"]', '.clock-node-top'],
  turnClock: ['.clock-player-turn', '[data-test-element="clock-player-turn"]', '.clock-running'],
  timeControl: [
    '.time-control',
    '.game-info-time-control',
    '[data-test-element="time-control"]',
    '.game-info',
    '.sidebar-game-info',
    '[class*="time-control"]',
  ],
  board: ['chess-board', '.board', '[data-board-orientation]', '.board-layout-main'],
  playerTop: [
    '.player-top',
    '[data-test-element="player-top"]',
    '.clock-top .user-username',
    '.clock-top [data-test-element="user-tag"]',
  ],
  playerBottom: [
    '.player-bottom',
    '[data-test-element="player-bottom"]',
    '.clock-bottom .user-username',
    '.clock-bottom [data-test-element="user-tag"]',
  ],
} as const;

export const LIVE_GAME_PATH = /^\/(?:game|play|live)(?:\/|$)/i;

export function matchesLiveGame(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)chess\.com$/i.test(parsed.hostname)) return false;
    return LIVE_GAME_PATH.test(parsed.pathname);
  } catch {
    return false;
  }
}

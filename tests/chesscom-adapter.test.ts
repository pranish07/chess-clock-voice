import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChessComClockProvider } from '@/adapters/chesscom/provider';

const fixture = readFileSync(join(process.cwd(), 'tests/fixtures/chesscom-live.html'), 'utf8');

function mount(html = fixture): void {
  document.body.innerHTML = html;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('ChessComClockProvider', () => {
  it('matches chess.com live pages only', () => {
    const provider = new ChessComClockProvider(document, window);
    expect(provider.matches('https://www.chess.com/game/live/123')).toBe(true);
    expect(provider.matches('https://www.chess.com/play/online')).toBe(true);
    expect(provider.matches('https://www.chess.com/live')).toBe(true);
    expect(provider.matches('https://www.chess.com/analysis')).toBe(false);
    expect(provider.matches('https://example.com/game/1')).toBe(false);
  });

  it('reads both clocks, the turn, side, and time control', () => {
    mount();
    const provider = new ChessComClockProvider(document, window);
    const snapshot = provider.getClocks();

    expect(snapshot).not.toBeNull();
    expect(snapshot?.top.seconds).toBe(19.4);
    expect(snapshot?.bottom.seconds).toBe(180);
    expect(snapshot?.top.isTurn).toBe(true);
    expect(snapshot?.bottom.isTurn).toBe(false);
    expect(snapshot?.playerSide).toBe('bottom');
    expect(snapshot?.timeControl).toMatchObject({
      raw: '3|2',
      category: 'blitz',
      baseSeconds: 180,
      incrementSeconds: 2,
      incrementSource: 'time-control',
    });
  });

  it('keeps the player clock at the bottom when the board is flipped for black', () => {
    mount();
    document.querySelector('.board')?.setAttribute('data-board-orientation', 'black');
    const provider = new ChessComClockProvider(document, window);
    expect(provider.getPlayerSide()).toBe('bottom');
  });

  it('falls back to order and still parses the clocks', () => {
    mount(`
      <div class="clock-holder"><div class="clock-time">5:00</div></div>
      <div class="clock-holder"><div class="clock-time">4:59.2</div></div>
      <div data-test-element="time-control">5+3</div>
    `);
    const provider = new ChessComClockProvider(document, window);
    const snapshot = provider.getClocks();
    expect(snapshot?.top.seconds).toBe(300);
    expect(snapshot?.bottom.seconds).toBe(299.2);
    expect(snapshot?.timeControl.category).toBe('blitz');
    expect(snapshot?.timeControl.incrementSeconds).toBe(3);
  });

  it('learns increment from an upward clock jump when no label exists', () => {
    mount(`
      <div class="clock-component clock-top"><div class="clock-time-monospace">3:00</div></div>
      <div class="clock-component clock-bottom"><div class="clock-time-monospace">3:00</div></div>
    `);
    const provider = new ChessComClockProvider(document, window);
    provider.getClocks();
    const bottom = document.querySelectorAll('.clock-time-monospace')[1]!;
    bottom.textContent = '3:02';
    const snapshot = provider.getClocks();
    expect(snapshot?.timeControl.incrementSeconds).toBe(2);
    expect(snapshot?.timeControl.incrementSource).toBe('observed');
  });

  it('emits on change and stops after destroy', async () => {
    mount();
    vi.useFakeTimers();
    const provider = new ChessComClockProvider(document, window);
    const listener = vi.fn();
    const unsubscribe = provider.onTick(listener);
    expect(listener).toHaveBeenCalledTimes(1);

    const top = document.querySelectorAll('.clock-time-monospace')[0]!;
    top.textContent = '0:19.3';
    await vi.advanceTimersByTimeAsync(200);
    expect(listener.mock.calls.length).toBeGreaterThan(1);
    const last = listener.mock.calls.at(-1)?.[0];
    expect(last?.top.seconds).toBe(19.3);

    unsubscribe();
    provider.destroy();
    const count = listener.mock.calls.length;
    await vi.advanceTimersByTimeAsync(500);
    expect(listener).toHaveBeenCalledTimes(count);
  });
});

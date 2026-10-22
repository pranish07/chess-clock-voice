# chess.com Selectors

All site selectors live in [`src/adapters/chesscom/selectors.ts`](../src/adapters/chesscom/selectors.ts). Selector arrays are ordered fallbacks: the first match wins. Provider logic must not contain selectors.

> **Verification status:** these selectors have **not been live-verified** against a signed-in chess.com game. They are exercised by the jsdom fixture [`tests/fixtures/chesscom-live.html`](../tests/fixtures/chesscom-live.html) and must be checked against the live DOM before a public release. The “last verified” column therefore says “fixture only”. Do not change it to a live date until you have actually verified it.

## Selector inventory

| Key               | Purpose                                                  | Primary                 | Fallbacks                                                                                                                      | Last verified             |
| ----------------- | -------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| `clockContainers` | Find the two clock panels                                | `.clock-component`      | `[data-test-element="clock"]`, `.clock`, `.clock-node`                                                                         | Fixture only (2026-10-22) |
| `clockText`       | Read the time text inside a clock                        | `.clock-time-monospace` | `.clock-time`, `[data-test-element="clock-time"]`, `.time`                                                                     | Fixture only (2026-10-22) |
| `bottomClock`     | Mark the bottom clock as the player's side               | `.clock-bottom`         | `[data-test-element="clock-bottom"]`, `.clock-node-bottom`                                                                     | Fixture only (2026-10-22) |
| `topClock`        | Mark the top clock as the opponent's side                | `.clock-top`            | `[data-test-element="clock-top"]`, `.clock-node-top`                                                                           | Fixture only (2026-10-22) |
| `turnClock`       | Detect which clock is running                            | `.clock-player-turn`    | `[data-test-element="clock-player-turn"]`, `.clock-running`; plus class hints `clock-player-turn`, `clock-running`, `running`  | Fixture only (2026-10-22) |
| `timeControl`     | Read the time-control label                              | `.time-control`         | `.game-info-time-control`, `[data-test-element="time-control"]`, `.game-info`, `.sidebar-game-info`, `[class*="time-control"]` | Fixture only (2026-10-22) |
| `board`           | Board/orientation lookup, currently **unused**           | `chess-board`           | `.board`, `[data-board-orientation]`, `.board-layout-main`                                                                     | Not applicable            |
| `playerTop`       | Player label near the top clock, currently **unused**    | `.player-top`           | `[data-test-element="player-top"]`, `.clock-top .user-username`, `.clock-top [data-test-element="user-tag"]`                   | Not applicable            |
| `playerBottom`    | Player label near the bottom clock, currently **unused** | `.player-bottom`        | `[data-test-element="player-bottom"]`, `.clock-bottom .user-username`, `.clock-bottom [data-test-element="user-tag"]`          | Not applicable            |

### Not used by the current product

| Item                      | Status                | Why                                                                                                                                                              |
| ------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Move list**             | Not read; no selector | Turn state comes from the running-clock class. Reading moves is unnecessary and outside the fair-play boundary.                                                  |
| **Game-over indicator**   | Not read; no selector | The announcer stops naturally when clocks stop changing; an announced-set reset handles a new game on the same page.                                             |
| **Player-side indicator** | No DOM selector       | `ChessComClockProvider.getPlayerSide()` returns `'bottom'` by product assumption. The `board` selector exists but is intentionally not used to swap clock sides. |

## Matching and clock mapping

- `LIVE_GAME_PATH = /^\/(?:game|play|live)(?:\/|$)/i`
- `matchesLiveGame(url)` requires hostname `chess.com` or a subdomain and a path matching the regex.
- The content script runs on:
  - `https://*.chess.com/game/*`
  - `https://*.chess.com/play/*`
  - `https://*.chess.com/live*`
- The provider takes the first two clock containers, or falls back to the parents of the first two clock-text nodes.
- A container is mapped to `bottom`/`top` from `bottomClock`/`topClock`, then class names (`bottom`/`top`), then DOM order (first = top, second = bottom).
- **The bottom clock is treated as the signed-in player's clock.** Board orientation reflects color but does not move the clock panels; do not use the `board` selector to swap sides without changing `getPlayerSide()` and the fixture/tests.

## Time-control parsing

The `timeControl` elements are scanned in order. For each element, `parseTimeControlCandidate` extracts a compact paired value (e.g. `3|2`) or a minutes/seconds/day phrase, then `parseTimeControlText` normalizes it.

| Example  | Base    | Increment | Category                                                   |
| -------- | ------- | --------- | ---------------------------------------------------------- |
| `3\|2`   | 180 s   | 2 s       | Blitz (the 2 s increment is above the bullet limit of 1 s) |
| `1\|0`   | 60 s    | 0 s       | Bullet                                                     |
| `3+2`    | 180 s   | 2 s       | Blitz                                                      |
| `10+5`   | 600 s   | 5 s       | Rapid                                                      |
| `3 min`  | 180 s   | 0 s       | Blitz                                                      |
| `30 sec` | 30 s    | 0 s       | Bullet                                                     |
| `1 day`  | 86400 s | 0 s       | Daily                                                      |

Note: the current classifier is `base ≤ 180 && increment ≤ 1 → bullet`, `base ≤ 300 → blitz`, `base ≤ 3600 → rapid`, else daily. This means `3|2` is Blitz by design, not Bullet. The product's bullet _threshold cap_ is still 60 s because thresholds are category caps. If this classification changes, update [`docs/SETTINGS_SCHEMA.md`](SETTINGS_SCHEMA.md), the parser tests, and the store copy together.

## When chess.com changes its DOM

Run this runbook before changing code.

1. Open a live chess.com game in Chrome and open DevTools → Elements.
2. Inspect a clock. Find the outermost element that contains exactly one clock and the time text.
3. In the console, test candidates against the page:

   ```js
   document.querySelectorAll('.clock-component').length;
   document.querySelectorAll('[data-test-element="clock"]').length;
   [...document.querySelectorAll('.clock-time-monospace')].map((n) => n.textContent);
   [...document.querySelectorAll('.clock-player-turn')].map((n) => n.className);
   [...document.querySelectorAll('.time-control')].map((n) => n.textContent);
   ```

4. Confirm there are exactly two clock containers and two time texts, and that the running class moves between them.
5. Add the **new variant at the end** of the relevant fallback list in `src/adapters/chesscom/selectors.ts`. Do not reorder working fallbacks without a reason.
6. Update `tests/fixtures/chesscom-live.html` to include the new markup variant, keeping the existing fixture cases where possible.
7. Update or add adapter tests in `tests/chesscom-adapter.test.ts` to assert:
   - two clocks are found,
   - top/bottom mapping is correct,
   - the running side is detected,
   - time-control parsing yields the expected category/increment.
8. Run:

   ```bash
   npm test
   npm run lint
   npm run build
   ```

9. Reload the extension and the chess.com tab. Enable debug logging in the page console:

   ```js
   localStorage.setItem('ccv:debug', '1');
   ```

10. Verify both colors, a bullet game, a blitz game, and an increment game. Check that only the running clock can speak and that the correct side speaks.
11. Only after live verification, change “fixture only” to the date and Chrome/chess.com version in this table.
12. Delete stale selectors once the new variant is stable; fallback lists are not archives.

## Guardrails

- Never put a chess.com selector in `provider.ts`, a feature, the UI, or the content script.
- Do not read the board, move list, chat, evaluation, or account data to “improve” detection.
- Do not add a host permission for another site here; that belongs in its own adapter, manifest change, privacy update, and ADR.
- If a selector change also changes the player-side assumption, update `getPlayerSide()`, the architecture note, the README assumptions, and the fixture.

## Related

- [Architecture](../ARCHITECTURE.md)
- [Settings schema](SETTINGS_SCHEMA.md)
- [Contributing](../CONTRIBUTING.md)
- [README](../README.md)

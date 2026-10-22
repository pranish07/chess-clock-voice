# Privacy Policy

**Chess Clock Voice**
Last updated: October 22, 2026

This is the plain-language policy for the Chess Clock Voice Chrome extension. The same policy is published as a hostable page in [`privacy-policy.html`](privacy-policy.html).

## Short version

Chess Clock Voice does not collect, transmit, sell, or share any data. It reads the clock text on chess.com, speaks the remaining time locally, and stores your settings in Chrome sync storage.

## What the extension does

Chess Clock Voice speaks the remaining seconds on a chess.com clock when time gets low. It is a clock-only accessibility and time-management tool. It does not read the board, evaluate positions, suggest moves, or interact with chess.com's game logic.

## Data we collect

**None.** We do not collect, use, or transfer:

- personal information, names, email addresses, or account identifiers;
- chess.com account data, game history, results, ratings, or opponents;
- board positions, pieces, moves, move list, chat, messages, or game content;
- health, financial, authentication, location, or web-history data;
- analytics, telemetry, crash reports, or advertising identifiers.

The extension has no server, no user accounts, no analytics SDK, and no remote code. No data leaves your browser.

## What the extension reads on chess.com

On chess.com live game pages, the content script reads only:

- the clock text (for example `0:09.3` or `3:00`);
- which clock is currently running;
- the time-control label (for example `3|2`);
- clock placement used to distinguish the top and bottom clock.

This information is processed in memory to decide what to speak. It is never stored, transmitted, or logged to a remote service. The extension does not read the board, pieces, moves, evaluation, chat, or account data.

## Settings stored locally

Your preferences are stored with `chrome.storage.sync`:

- master on/off;
- clock scope;
- per-time-control enable flags and thresholds;
- phrase, cadence, and milestones;
- voice, language, rate, pitch, and volume;
- custom presets.

If Chrome Sync is enabled, Chrome may sync this small settings object across your signed-in browsers. That is a Chrome platform feature; the developer has no access to it. Settings contain no game data or personal information. There is no extension server and no remote settings store.

## Speech synthesis

Announcements use the browser and operating system's built-in speech synthesis. The spoken text is generated locally. The extension does not send audio or text to a cloud speech service.

## Permissions

| Permission              | Why                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `storage`               | Save your settings and presets in `chrome.storage.sync`.                                         |
| `https://*.chess.com/*` | Let the declared content script read the clock on chess.com game pages. No other hosts are used. |

The extension does not request `tabs`, `scripting`, `cookies`, `webRequest`, history, clipboard, downloads, or `<all_urls>`.

## Third parties and sharing

We do not sell, rent, transfer, or disclose data to third parties. There are no advertising, analytics, or tracking partners. The extension is distributed through the Chrome Web Store, which is operated by Google and governed by Google's own policies.

## Children

The extension is not directed at children under 13 and collects no data from anyone, including children.

## Fair play

The extension is not a chess engine, does not analyze positions, and does not provide move suggestions. It only speaks clock time. Users are responsible for following chess.com's terms and fair-play rules.

## Changes

If this policy changes, the updated version will be published at this page with a new “last updated” date. Material changes will be reflected in the extension's store listing.

## Contact

Use the support email shown on the Chess Clock Voice Chrome Web Store listing. The publisher name is the one shown on that listing. Do not send game data, account credentials, or cookies; none are needed to support this extension.

Chess Clock Voice is an independent extension and is not affiliated with chess.com.

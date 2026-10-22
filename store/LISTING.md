# Chrome Web Store Listing

Use this file as the source of truth for the Developer Dashboard. Verify character limits and current asset requirements in the Dashboard before submitting; the store UI changes occasionally.

## Identity

| Field                        | Value                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Name**                     | Chess Clock Voice – Spoken Time Alerts                                                                                  |
| **Name length**              | 38 characters (limit 45)                                                                                                |
| **Short description**        | Speaks the seconds left on your chess.com clock near the end of the game, so you never flag in bullet, blitz, or rapid. |
| **Short description length** | 119 characters (limit 132)                                                                                              |
| **Category**                 | Productivity                                                                                                            |
| **Language**                 | English                                                                                                                 |
| **Pricing**                  | Free                                                                                                                    |
| **Mature content**           | No                                                                                                                      |
| **Visibility**               | Public after approval; Unlisted is acceptable for a soft launch                                                         |

## Single-purpose statement

> Speaks the remaining seconds on the user's chess.com clock when time is low, using the browser's local speech synthesis.

This is the only purpose. The extension does not read the board, evaluate positions, suggest moves, or provide game assistance.

## Long description

```text
Never lose on time because you did not look at the clock.

Chess Clock Voice speaks the remaining seconds out loud when your chess.com clock gets low. It is designed for bullet, blitz, and rapid players who want a calm audio cue without taking their eyes off the board.

HOW IT WORKS
• Set a threshold for each time control: bullet, blitz, rapid, and daily.
• When your clock drops to that threshold, the extension says the remaining seconds once per whole second.
• Defaults: bullet 50 seconds, blitz 20, rapid 20, daily off.
• Choose my clock, the opponent's clock, or both.

BUILT FOR REAL GAMES
• Reads m:ss, whole seconds, and tenths such as 0:09.3.
• Detects the time control and increment from the game page.
• Increment-aware thresholds give you credit for time you are about to receive.
• Resets after increment jumps and waits for the clock to settle after a move, so bullet and premove play do not double-speak.
• Never announces a clock that is not running.

MAKE IT YOURS
• Pick a voice, language, rate, pitch, and volume from the voices installed on your device.
• Use tokens {seconds}, {increment}, and {timeControl} to write your own phrase.
• Live character count and spoken-duration estimate keep phrases short.
• One-click presets: Numbers only, Seconds left, Panic mode, Minimal, and Coach voice.
• Save your own presets.
• Light and dark theme, compact popup, full settings page.

FAIR PLAY FIRST
This extension only reads the clock text on chess.com and speaks the time. It does not read the board, suggest moves, evaluate positions, or interact with chess.com's game logic. It is not a chess engine or a cheating tool.

PRIVATE BY DESIGN
• No analytics.
• No accounts.
• No remote code.
• No data collection.
• Settings are stored in Chrome's synced extension storage; no game data is kept.
• Permissions: storage, plus https://*.chess.com/* to read the clock on game pages.

A note about voices: speech is generated locally by your browser and operating system. Available voices and pronunciation depend on your device. Use the Test voice button in settings to preview your phrase.
```

## Permission justification text

### `storage`

> Used to save the user's extension settings and custom presets with `chrome.storage.sync`, so preferences carry across Chrome profiles where Chrome Sync is enabled. The extension stores only configuration values (thresholds, toggles, voice options, phrase text, presets). It stores no personal data, browsing history, or game data.

### `https://*.chess.com/*`

> Required to declare the content script that runs on chess.com game pages. The content script reads only the two clock time strings, which clock is currently running, the time-control label, and clock placement used to distinguish the top and bottom clock. It speaks the remaining seconds with the browser's local speech synthesis API. It does not read the board position, pieces, moves, chat, account data, cookies, or any other page content. It makes no network requests. It does not modify the page or interact with chess.com's game logic.

### Not requested

`tabs`, `scripting`, `webRequest`, `cookies`, `history`, clipboard, downloads, `<all_urls>`, or any optional permission. The service worker queries chess.com tabs using the host permission to broadcast settings; the content script is statically declared.

### Remote code

None. All JavaScript is bundled. The only dynamic import uses `chrome.runtime.getURL()` to load a local chunk created by the build tool.

## Screenshot plan

Upload 3–5 screenshots at **1280×800** (or 640×400), PNG or JPEG. Capture at 100% browser zoom. Blur or replace real usernames, avatars, chat, ratings, and browser chrome.

| #   | Caption                                       | What to show                                                                                                                                                           |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **One switch. Spoken low-time alerts.**       | Popup on a chess.com live game tab: master switch, “Listening” status, clock scope, Test voice, Open settings.                                                         |
| 2   | **Tune every time control.**                  | Options header, master switch, and the start of Clock behavior / Announcements with the sticky Save bar visible.                                                       |
| 3   | **Bullet, blitz, rapid, daily — separately.** | The four time-control cards: bullet 50 s, blitz 20 s, rapid 20 s, daily off. Optionally show an inline threshold error, then reset before capture.                     |
| 4   | **Make the clock say what you need.**         | Announcement phrase `{seconds} seconds left`, character count, duration estimate, and the preset cards (Numbers only, Seconds left, Panic mode, Minimal, Coach voice). |
| 5   | **Hear the last 20 seconds.**                 | A clean composed 1280×800 frame with a live game in the background and a callout of the spoken phrase; no result, username, chat, engine, or arrows.                   |

Do not show an engine, evaluation bar, arrows, move suggestions, or a real game result. Do not imply affiliation with chess.com.

## Promo tile

Use [`promo-tile-440x280.png`](promo-tile-440x280.png) as the small promo tile (440×280). Suggested overlaid text, if you regenerate the asset:

> **Chess Clock Voice**
> Hear the last seconds.

A large promo tile is optional; use the size shown in the current dashboard. Keep the same clock/wordmark identity as the 128×128 icon.

## Store icon

Upload [`icon-128.png`](icon-128.png) (128×128). The manifest also ships 16, 48, and 128 px icons from `public/icons/`.

## Privacy practices answers

| Question                                                                                             | Answer                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Does the extension collect or use personal data?                                                     | No                                                                                         |
| Health, financial, authentication, personal communications, location, web history, or user activity? | No                                                                                         |
| Sell or transfer data to third parties?                                                              | No                                                                                         |
| Use or transfer data for purposes unrelated to the single purpose?                                   | No                                                                                         |
| Use or transfer data to determine creditworthiness or for lending?                                   | No                                                                                         |
| Privacy policy URL                                                                                   | Host [`privacy-policy.html`](privacy-policy.html) at a public HTTPS URL and paste that URL |

The policy source is [`PRIVACY.md`](PRIVACY.md). Verify the hosted URL opens in an incognito window without login.

## What's new (1.0.0)

```text
First release: per-time-control spoken thresholds, increment-aware announcements, custom voice and phrase, built-in and custom presets, popup master switch, and a schema-driven options page.
```

## Support

Use the publisher support email configured in the Developer Dashboard. There is no account system or server. Do not ask users for chess.com credentials, cookies, or game exports.

## Fair-play and affiliation disclaimer

Chess Clock Voice is an independent extension. It is not affiliated with, endorsed by, or sponsored by chess.com. It only reads clock text and speaks time; it does not provide move assistance.

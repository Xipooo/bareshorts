# MOB.md: bareshorts mob whiteboard

Shared whiteboard for the mob. No code in this session: the output is the ordered backlog (GitHub Project board + issues). Adapted from BaccaratSim/play-tracker `MOB.md` conventions (read, not modified). Process rules live in `TEAM_WORKING_AGREEMENT.md`.

Roles: product-manager (PM, facilitator) · domain-expert (YouTube Data API, IFrame Player API, ToS, quota) · ux-designer (mobile-first swipe UX) · architect (vertical slices, flags) · security · qa-engineer (testable ACs). Non-driving roles reply SIGN-OFF or a critical-only FLAG.

Steve's request (2026-10-07), verbatim: "I want an app that will let me watch YouTube shorts without the overlays". Answers: PWA; sources "all of those" (his subscriptions' Shorts, search, curated channel list); name: bareshorts. Change of plan: build the board and stories with the mob first; do not build the app yet.

## Driver log

| When (UTC) | Seat | Driver | Notes |
|---|---|---|---|
| 2026-10-08T05:57Z | probe | cursor-agent | available (`--mode ask`, read-only; `PROBE-OK`) |
| 2026-10-08 | card drafter, every card | cursor-agent | codex and agy not up this round; rotation impossible with one driver, so cursor-agent drafts every card. |
| 2026-10-08 | facilitator, reviewer, board filer | Claude | Facilitation and review are Claude seats (not author of the drafts). Last-resort reason: `real-exhaustion` of the rest of the pool (only cursor-agent up). |

## Round 1: mob discussion (PM facilitating)

**PM:** Smallest thing Steve can watch on his phone first, then value-first. Every card is a user story or bug with a user-observable outcome; no tooling cards. What does each of you need to be true before we write ACs?

**Domain expert (YouTube):**
- *Playback is the official IFrame Player API only.* `playerVars`: `controls=0`, `playsinline=1`, `rel=0`, `iv_load_policy=3`, `fs=0`, `disablekb=1`, `cc_load_policy=0`. `modestbranding` is a hint YouTube has reduced the effect of; a small logo/title flash from the embed is the accepted limit. No ripping/proxying/downloading, no CSS that hides YouTube's own branding.
- *Autoplay on phones:* browsers allow autoplay when muted or after a user gesture; iOS needs `playsinline`. So the first Short may start muted or wait for a tap: the story must say what the user sees, not assume sound.
- *Embed failures are normal:* owners can disable embedding (player errors 101/150), videos get removed or made private (100/ 5). A feed must skip them, not stall. `search.list` supports `videoEmbeddable=true`; `videos.list part=status` has `embeddable`.
- *There is no "is Short" field in the Data API.* Heuristic: duration from `videos.list part=contentDetails` (ISO 8601). Since **2024-10-15** Shorts may be up to **3 minutes**; uploads before that date are limited to 60 s; Shorts are square or taller. `player.embedWidth/embedHeight` give a landscape/portrait hint when present. `search.list videoDuration=short` means under 4 min, so it over-fetches and must be filtered.
- *Quota:* default **10,000 units/day**, reset at midnight Pacific. `search.list` = **100** units; `videos.list`, `playlistItems.list`, `channels.list`, `subscriptions.list` = **1**. So search is ~100 searches/day max; channel and subscription flows are cheap. Batch `videos.list` (up to 50 ids). A `UC...` channel id maps to its uploads playlist `UU...` with no API call; `@handles` need `channels.list?forHandle`. A quota failure is HTTP 403 with reason `quotaExceeded` (also `dailyLimitExceeded`, `rateLimitExceeded`).
- *Policy risk to flag (open):* YouTube's developer policies discourage obscuring or overlaying the player. Our transparent gesture layer draws nothing and exists only to receive swipes and taps. Mob position: acceptable for a personal-use app because it hides nothing YouTube draws; revisit if Steve ever publishes it. Preloaded neighbours must be cued, not playing, and the player stays at least 200x200 and visible.

**UX designer:**
- Full-bleed, `100dvh`, safe-area insets, `overscroll-behavior: none` and `touch-action: none` so the browser never pulls-to-refresh or scrolls the page mid-swipe.
- Swipe threshold about 50 px (or a quick flick); tap = under 10 px movement and under 500 ms; long-press = 500 ms hold. Motion respects `prefers-reduced-motion`.
- **Edge-swipe conflict:** a left-edge swipe collides with the iOS Safari back gesture and Android gesture navigation. Long-press is the primary way into the hidden menu; the edge swipe is a bonus and must not be the only way. A small one-time hint ("Long-press for menu") covers discoverability, then disappears.
- Menu and Settings are thumb-reachable (bottom sheet feel), 48 px touch targets, no chrome on the feed itself.
- Every state shows plain words: loading, empty, error, quota, offline. Never a blank black screen.

**Architect:**
- Vertical slices, each deployable and watchable on the phone. The first slice needs no API key, no OAuth: a built-in starter list of embeddable Shorts.
- Pure logic (Shorts detection, feed position/preload window, quota+cache policy) separate from DOM and network; `fetch`, clock and storage injected, so every AC is testable without YouTube.
- **Flags (assumption, reversible):** slices 1 to 8 are the baseline product (no prior behaviour to protect) and ship unflagged. From the first new *source* onward, each ships behind a **default-off flag with a visible Settings toggle**: `search`, `channels`, `subscriptions`. The toggle mechanism is introduced by the Search story and reused. Flags graduate (flag removed) at a retro once Steve has used the source.
- Preload window: current plus one neighbour each side; players beyond that are destroyed.
- Cache: results in localStorage with TTLs (search 6 h, channel uploads 30 min, video details 24 h) keyed without the API key.

**Security:**
- API key: restricted by HTTP referrer to the deployed origin and to YouTube Data API v3 only; never committed; entered on the device and kept in that device's storage. Honest caveat: a referrer restriction is not a secret (non-browser clients can spoof it), so the key is treated as low-value and quota-capped, not as confidential.
- OAuth: Google Identity Services *token* flow in the browser (no client secret anywhere), scope `youtube.readonly` only, access token kept **in memory only**, never in URLs or storage; sign-out revokes it. Testing-mode consent screen for a personal app (Steve as test user); grants can lapse about weekly in testing mode, so there is a story for re-consent.
- No third-party scripts except YouTube's IFrame API and Google Identity Services; a Content-Security-Policy documents that. Render all API text via `textContent`, never `innerHTML`.

**QA:** Every story gets Gherkin with ZOMBIES coverage (Zero, One, Many, Boundary, Interface, Exceptions, Simple); where a letter does not apply the card says `n/a` and why. Rendering ACs assert garbage is absent (`undefined`, `[object Object]`, `NaN`). Every AC is checkable with a faked YouTube (injected `fetch`, fake player), no live network. User-observable only: if an AC cannot be seen or done on the phone, it is rejected as process work.

**PM decision:** card format is Connextra + Gherkin tagged `@zero @one @many @boundary @interface @exception @simple`; each card names its flag (or "baseline"), its dependencies, and what is out of scope. Setup (Google Cloud, hosting, CI) is in `SETUP.md`, not on the board.

## Board order (value-first, one line of "why" per position)

Project board: https://github.com/users/Xipooo/projects/4 (columns Backlog / Ready / In Progress / Done). Issue numbers equal board positions. Each issue body holds the Connextra story and Gherkin ACs (ZOMBIES-tagged).

| # | Story | Flag | Status | Why here |
|---|---|---|---|---|
| 1 | Watch a Short full-screen on my phone | baseline | Ready | Smallest thing Steve can watch on his phone: proves the official embed, the no-overlay look and hosting with no API key and no sign-in. |
| 2 | Swipe up and down between Shorts | baseline | Ready | Turns one video into a feed: the core interaction. |
| 3 | Tap to pause and resume | baseline | Ready | Second core gesture and cheap; also settles how taps coexist with the start prompt. |
| 4 | A Short replays when it ends | baseline | Ready | Hands-free watching; tiny and finishes the single-Short experience. |
| 5 | Next Short starts instantly (preload neighbours) | baseline | Ready | Makes swiping feel instant, the quality bar for a Shorts feed. |
| 6 | Install bareshorts on my home screen | baseline | Backlog | Phone-first: launching full screen with no browser bar is half the "no chrome" promise, and it is cheap. |
| 7 | Open a hidden menu without UI on the feed | baseline | Backlog | The doorway to every later source and setting, without putting UI on the feed. |
| 8 | Save my YouTube API key on this phone | baseline | Backlog | Unblocks all live data; first Google-console step Steve has to do (SETUP.md). |
| 9 | Search for Shorts by topic | `search` | Backlog | First live source and the first flagged feature; the most-wanted way to find Shorts. |
| 10 | See only real Shorts in results | `search` | Backlog | Search is noisy without it; protects the promise that the feed is only Shorts. |
| 11 | Skip videos that cannot play in the embed | `search` | Backlog | A dead video must never stall the feed. |
| 12 | Watch Shorts from my favorite channels | `channels` | Backlog | Steve's curated list; cheap on quota (1-unit calls) so it is the reliable daily source. |
| 13 | See clearly when today's YouTube quota is used up | baseline | Backlog | Search costs 100 units (about 100 searches a day); failures must be explained, not shown as an empty feed. |
| 14 | Reopen the app without spending quota (saved results) | baseline | Backlog | Protects the quota and makes reopening instant. |
| 15 | Understand every empty, error and loading state | baseline | Backlog | Polish pass over every state once the sources exist; never a blank black screen. |
| 16 | Open the app with no connection | baseline | Backlog | Lower value (the embed cannot play offline) but prevents a dead-looking app. |
| 17 | Link my YouTube subscriptions with Google sign-in | `subscriptions` | Backlog | Start of Subscriptions; ordered late because it carries the most setup friction (OAuth client, consent screen), not because it is low value. |
| 18 | Watch Shorts from the channels I subscribe to | `subscriptions` | Backlog | The headline source Steve asked for; cheap on quota via uploads playlists once sign-in exists. |
| 19 | Recover when my Google sign-in expires | `subscriptions` | Backlog | Resilience: an expired or revoked sign-in must not break the other sources. |

Ready = refined and reviewed, can start the moment Steve says go. 1-5 are Ready because they need no Google setup; everything from 8 on needs Steve's Google Cloud steps in `SETUP.md`.

## Round 2: card drafting and review

Cards were drafted one per dispatch by **cursor-agent** (read-only `--mode ask`, brief = Round 1 above; no rotation possible with one driver up) and reviewed by Claude, who did not author them. QA/PM review findings, all applied to the issue text before filing:

1. **Ownership overlaps.** Replay-at-end appeared in cards 1 and 4 (now 4 only); offline launch appeared in cards 6 and 16 (now 16 only); offline reuse of search results appeared in 9 and 14 (now 14 only).
2. **Tap collision.** Card 1's "Tap to play / Tap for sound" prompt versus card 3's tap-to-pause: card 3 gained a scenario saying the first tap on a start prompt starts or unmutes, and only the next tap pauses.
3. **Message consistency.** Quota text defined once (card 13) and referenced from 9 and 18; "No Shorts found for "<query>"" shared by 9 and 10; "None of these Shorts can play here" shared by 11 and 15.
4. **Invalid Gherkin.** Card 13 had tags after the `Scenario:` line; moved before it.
5. **Forward references.** Cards 13 and 14 mentioned sources that arrive later; they now use Search/Channels and say the rows apply as those cards land.
6. **Unquantified AC.** Card 18's "stated cap" is now 100 Shorts (PM decision, reversible).
7. **Property checks, not eyeball checks.** Card 14's "API key never appears in saved data" is verified by an automated test on stored data, not by inspecting the phone; card 15 includes an HTML-injection query to prove API text is rendered as text.
8. **Embedded-test numbers.** Timing ACs ("within 1 second") become injectable-clock assertions in tests, not stopwatch checks.

Decisions recorded as assumptions (all reversible, none need Steve): flags apply from card 9 on (baseline cards ship unflagged); preload window is current plus one each side; cache TTLs search 6 h / channel uploads 30 min / video details 24 h; Subscriptions feed cap 100.

## Parking list (not on the board; Steve will add more)

- **Stay signed in across launches.** The Google token flow keeps the token in memory only, so Subscriptions asks Steve to sign in on every cold start. Persisting needs a refresh token (a small backend or a different flow); a Security decision, parked until Steve has lived with it.
- **Auto-advance when a Short ends** (instead of replay), as a setting. Needs a story once Steve has used replay.
- **Sound control** beyond the autoplay prompt (mute/unmute by gesture).
- **Policy risk to revisit:** our transparent gesture layer over the embed (Round 1, domain expert). Revisit before any public release.
- **Flag graduation:** remove `search` and `channels` flags after Steve has used them (retro item, not a card).
- **Quota usage meter**, **shuffle/watch history**, **save favorites**: ideas only, no stories yet.

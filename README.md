# bareshorts

YouTube Shorts in a full-screen vertical feed with none of the Shorts UI on top: no like/comment/share rail, captions, channel row or subscribe button. Installable PWA.

- Playback is the **official YouTube IFrame Player API** embed (`controls=0`, `playsinline`, `modestbranding`). No stream ripping, proxying or downloading, and YouTube's own embed branding is not hidden with CSS. A small logo/title flash from the embed is the accepted limit.
- **Swipe** up/down: next/previous (neighbours preloaded). **Tap**: pause/play. **Long-press** or **swipe in from the left edge**: hidden menu (source, settings).
- Sources (YouTube Data API v3): Search, curated Channels, and (slice 2, behind a flag) Subscriptions.

## Hosting
GitHub Pages: free, static, same place as the repo and CI, HTTPS (required for PWAs and OAuth).

## How a Short is identified (`src/isShort.ts`)
The Data API has no "is Short" field, so this is a heuristic:
1. `videos.list` `contentDetails.duration` must be > 0 and
   - <= 60 s for uploads before **2024-10-15**, or
   - <= 180 s for uploads on/after 2024-10-15 (YouTube raised the limit to 3 minutes that day; Shorts must be square or taller).
2. If `player.embedWidth/embedHeight` are present, landscape (w > h) is rejected. Missing dimensions fall back to duration only.

Known gaps: a vertical-looking short video uploaded as a regular video can pass; a Short with unreported dimensions is judged on duration alone.

## API quota (10,000 units/day by default)
- `search.list` costs 100; everything else used here costs 1. Search is cached 6 h, playlist reads 30 min, video details 24 h (localStorage).
- `videos.list` is always batched (50 ids per call).
- Channels: a `UC...` id maps straight to its uploads playlist `UU...` (no `channels.list` call); only `@handles` cost a lookup (cached 24 h).
- A 403 `quotaExceeded`/`dailyLimitExceeded`/`rateLimitExceeded` is shown as "YouTube API daily quota exceeded" rather than an empty feed.

## API key
Never committed. Paste it into **Settings** in the app (stored in that device's localStorage), or set `VITE_YT_API_KEY` at build time. Restrict it by HTTP referrer to the deployed origin (see `NOTES.md`).

## Develop
```
npm install
npm run dev        # open /?fixture for a no-key feed
npm test           # acceptance + unit tests (vitest)
npm run verify     # tests + typecheck + build; run by the pre-push hook
```

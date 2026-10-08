# bareshorts

YouTube Shorts in a full-screen vertical swipe feed with none of the Shorts UI on top (no like/comment/share rail, captions, channel row or subscribe button). An installable PWA, built phone-first.

**Status: starter repo.** No features are built yet. The backlog lives on the GitHub Project board (ordered, value-first); each story is a thin vertical slice with Gherkin acceptance criteria.

## Ground rules
- Playback uses only YouTube's **official IFrame Player API** embed. No stream ripping, proxying or downloading, and YouTube's own embed branding is never hidden with CSS.
- Data comes from the YouTube Data API v3 (search, curated channels, and subscriptions via Google OAuth behind a feature flag).
- Secrets are never committed. The API key is entered on the device and restricted by HTTP referrer.

## Where things are
| File | What |
|---|---|
| `MOB.md` | The mob's whiteboard: backlog discussion, decisions, rationale |
| `TEAM_WORKING_AGREEMENT.md` | How we work (TDD, trunk-based, flags, issues policy) |
| `CODING_GUIDELINES.md` | Code conventions |
| `SETUP.md` | One-time Google Cloud, GitHub and hosting checklist |

## Develop
```
npm install
npm run dev
npm test        # vitest (jsdom); pre-push hook runs this
npm run build
```

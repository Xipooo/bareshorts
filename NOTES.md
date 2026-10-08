# Team working agreement and notes

## Working agreement
- Outside-in TDD from ZOMBIES acceptance tests: Red -> Green -> Refactor -> Commit -> Push. Only call something Red after watching it fail; reverting only the fix must turn it red again.
- Given/When/Then comments in every test. Rendering tests assert garbage is absent (`undefined`, `[object Object]`, `NaN`).
- Trunk-based: commit to `main`, push promptly. New features go behind feature flags toggleable in the UI.
- No Co-Authored-By trailers. GitHub issues are for bugs and user stories only; process notes live here.
- Pushes are gated by `.githooks/pre-push` (`npm run verify`). Enable once per clone: `git config core.hooksPath .githooks`.

## Setup (one-time, Google/GitHub console)
1. Google Cloud Console -> new project -> APIs & Services -> Library -> enable **YouTube Data API v3**.
2. Credentials -> Create credentials -> API key -> Application restrictions: **Websites** -> add `https://xipooo.github.io/*` -> API restrictions: YouTube Data API v3.
3. Open the deployed app, long-press, Settings, paste the key, Save.
4. Slice 2 only: Credentials -> OAuth client ID (Web) -> authorized JS origin `https://xipooo.github.io`; OAuth consent screen -> add yourself as test user, scope `youtube.readonly`.

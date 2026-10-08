# bareshorts coding guidelines

Adapted 2026-10-07 from BaccaratSim's `CODING_GUIDELINES.md`.

## Authorship references
No `@author` tags, author bylines, "Generated with" markers or `Co-Authored-By:` trailers in source or commit messages.

## Secrets
Never commit an API key, OAuth client secret or token (not in code, tests, fixtures, docs or CI logs). The YouTube API key is entered on the device and kept in that device's storage; it is restricted by HTTP referrer in Google Cloud. OAuth access tokens live in memory only. Tests use obvious fake values.

## Missing values stay missing
Never turn a missing value into a plausible one (`|| 0`, `?? 'Untitled'` shown as fact). Keep `null`/absent and say so where the user can see it ("unknown length", "no results"), or return a `{ value, source }` pair. A real `0` is a result: test for missing with `== null` or `Number.isFinite`, never truthiness.

## Official embed only
Playback goes through YouTube's IFrame Player API. No stream extraction, proxying or downloading, and no CSS that hides YouTube's own embed branding. Our own gesture layer over the embed is fine; it must not obscure what YouTube draws.

## TypeScript
`strict` on. Pure logic (Shorts detection, quota/caching, feed state) is kept separate from DOM and network code so it is unit-testable; the network (`fetch`), clock and storage are injected.

## Rendering
Any code that renders text asserts, in its tests, that `undefined`, `[object Object]` and `NaN` are absent.

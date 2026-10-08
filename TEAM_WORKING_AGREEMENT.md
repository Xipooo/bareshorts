# Team Working Agreement: bareshorts

How this mob works and why. Process changes land **here**, never as a card or issue. Issues hold only product **bugs** and **user stories**.

Adapted on 2026-10-07 from BaccaratSim's `TEAM_WORKING_AGREEMENT.md` (read, not modified), at Steve's instruction. Trimmed to what applies to a new PWA with no code yet; it grows through retros. Repo specifics: Vite + TypeScript + Vitest (jsdom), static PWA, free static hosting, no backend.

## 1. Values
- **Correctness over speed, but speed matters.** Every "it works" points at a command and its real output.
- **Respect Steve's attention.** He works from his phone. Don't invent decisions for him; don't bury the ones he needs.
- **ToS first.** Playback is the official YouTube IFrame Player API only. A change that would rip, proxy, download or visually hide YouTube's embed branding is rejected, not debated.

## 2. Practices

### Outside-in TDD, one story at a time
- Start from the story's Gherkin acceptance criteria (ZOMBIES: Zero, One, Many, Boundary, Interface, Exceptions, Simple scenarios). The first failing test traces to a stated AC; if an AC can't produce a test without inventing meaning, the story goes back for refinement.
- Red -> Green -> Refactor -> Commit -> Push. **Only claim Red after watching the test fail at the target assertion**, and reverting only the fix must flip it back to red. A new test that passes before its fix is vacuous unless labelled `GUARD: <why>`.
- Every test carries `// Given`, `// When`, `// Then` comments so the reader knows what it is for.
- **Rendering tests assert garbage is absent** (`undefined`, `[object Object]`, `NaN`, stray `}}`), not just that elements are present.
- When a cycle changes user-facing text, grep all tests for the old string and run them.
- One driver per cycle; the incoming driver reviews the previous cycle first (run tests, revert the fix in a scratch copy and quote the failure) and replies `SIGN-OFF` or `FLAG`. A driver never reviews what it authored.

### Trunk-based, flags
- Commit to `main`, push promptly. No long-lived branches.
- New or unfinished user-visible behaviour ships behind a **default-off feature flag that is toggleable in the Settings UI**. Bug fixes ship unflagged.
- CI (GitHub Actions) runs the tests. If CI cannot run (billing), the pre-push hook (`npm test`) is the gate and we say so plainly.
- Stage explicit paths; never `git add .`/`-A` for doc edits during a card.
- **No `Co-Authored-By` trailers.**

### What becomes a card
- **Cards and issues are user stories or bugs only.** Each story is Connextra (As a / I want / So that) plus Gherkin acceptance criteria, is a thin vertical slice, and has a user-observable outcome (something Steve sees or does on his phone).
- Tooling, CI, hosting and Google Cloud setup are never cards: they live in `SETUP.md` or here. A card whose only deliverable is tests, hooks, harnesses or gates is rejected as process work.
- Board order is value-first with a one-line "why" per position (see `MOB.md`). Columns: Backlog, Ready, In Progress, Done.

### Drivers
- Pool: non-Claude drivers first (cursor-agent is the only one up as of 2026-10-07; codex and agy join when available). **Claude is the last resort** and every Claude seat is logged in `MOB.md` with the reason. Copilot is benched.
- Probe a driver with a cheap real call before relying on it; record the result with a UTC timestamp.

### Shared machine
- Other mobs run on this laptop. Keep runs light: targeted test files, one install, no heavy gates while another mob's slow lane is active.

### Retro
- After every Done story. At most **one** process change per retro, stating its user benefit. Everything else goes to the parking list in `MOB.md`.

### Stop the line
- Only for data loss, a security hole (a leaked key or token), or a broken `main`. Everything else is logged as a retro seed and waits.

### Communication
- **No popups, ever** (`AskUserQuestion` or any interactive prompt). Plain-text reports: what happened, evidence, what's next. Blockers are one-line asks, phone-friendly.

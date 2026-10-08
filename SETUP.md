# One-time setup checklist

Not board work. Do these when the stories that need them reach Ready. Each is phone-friendly (browser only).

## GitHub
- [x] Repo `Xipooo/bareshorts` created.
- [ ] CI workflow file: needs the `workflow` token scope. Run `gh auth refresh -h github.com -s workflow` on the laptop (approve the one-time code at https://github.com/login/device), then merge the local-only branch `ci-local` (it holds `.github/workflows/ci.yml`) into `main` and push.
- [ ] GitHub Actions billing: Actions failed to start on another repo with "recent account payments have failed". If CI here also won't start, Settings -> Billing & plans -> fix payment or spending limit. Until then the pre-push hook (`npm test`) is the gate.

## Hosting (when the first slice is ready to watch)
Pick GitHub Pages: free, static, HTTPS (needed for PWA and OAuth), same place as repo and CI.
- [ ] Repo -> Settings -> Pages -> Build and deployment -> Source: **GitHub Actions**.
- [ ] Add a deploy job to CI (done by a story's PR, not by hand). Site URL will be `https://xipooo.github.io/bareshorts/`.

## Google Cloud (needed by the Search story)
1. console.cloud.google.com -> project selector -> **New project** -> name `bareshorts`.
2. **APIs & Services -> Library** -> search "YouTube Data API v3" -> **Enable**.
3. **APIs & Services -> Credentials -> Create credentials -> API key**.
4. Edit the key -> **Application restrictions: Websites** -> add `https://xipooo.github.io/*` (and `http://localhost:5173/*` for local dev).
5. Same screen -> **API restrictions: Restrict key** -> YouTube Data API v3 only -> Save.
6. Never commit the key. Paste it into the app's Settings on each device.

## Google OAuth (needed by the Subscriptions stories only)
1. **APIs & Services -> OAuth consent screen** -> External -> app name `bareshorts` -> add scope `.../auth/youtube.readonly`.
2. Leave publishing status as **Testing** and add your own Google account under **Test users** (no verification needed for personal use; note testing-mode grants can expire after about 7 days, so you may re-consent).
3. **Credentials -> Create credentials -> OAuth client ID -> Web application** -> Authorized JavaScript origins: `https://xipooo.github.io` (and `http://localhost:5173`).
4. The client ID is not a secret but is still kept out of the repo until the story that uses it decides where it lives (see MOB.md Security notes).

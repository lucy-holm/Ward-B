# itch.io release runbook

Companion to `docs/superpowers/specs/2026-07-26-telemetry-and-measurement-design.md`
§7 (itch briefing) and §7.5 (release pipeline decision). This is the
step-by-step for Tom, who has never used itch.io or butler before.
Follow it top to bottom the first time; after that, skip to
**"6. Every subsequent release."**

**Placeholder to confirm before the first real run:** the workflow assumes
the itch username is `lucy-holm` and the project slug is `ward-b`, i.e. the
project's public page is `https://lucy-holm.itch.io/ward-b`. **itch
usernames are independent of GitHub, so this is a guess.** Open your itch
dashboard, click into the "Ward b" project, and look at its public page URL
— it has the form `https://<username>.itch.io/<slug>`. butler's target is
then `<username>/<slug>`. If either part differs, edit the `butler push`
line in `.github/workflows/deploy-itch.yml` (bottom of the file, clearly
marked).

---

## 1. How this differs from what you have today

Today, every push to `main` builds the game and deploys it to GitHub Pages
— that's `.github/workflows/deploy.yml`, unchanged by this work. Per
CLAUDE.md, pushing to `main` is already a public act.

This adds a **second, separate branch and workflow** so itch publishing
never happens by accident:

```
main     → GitHub Pages (+ tailnet)   — staging/playtest, today's behavior, unchanged
release  → itch.io via butler         — you merge main → release when you're happy
```

`release` doesn't exist yet — you create it once in step 5. Nothing
publishes to itch until you push to it.

Two separate workflow files were used (`deploy.yml` for Pages,
`deploy-itch.yml` for itch) rather than one file with branch conditionals.
Reasoning: they have almost nothing in common after the build step — one
uploads a Pages artifact and calls a deploy action, the other downloads
and runs a third-party binary and authenticates against an external
service. Keeping them apart means each file's job list reads top-to-bottom
as "what happens on this trigger" with no `if:` branching to trace through.

---

## 2. One-time: generate a butler API key

1. Go to https://itch.io/user/settings/api-keys while logged into the
   `lucy-holm` itch account.
2. Click **Generate new API key**. Give it a label like `ward-b-ci` so you
   can recognize it later.
3. Copy the key immediately — itch shows it once.

## 3. One-time: add the GitHub Actions secret and variable

Both live in the same place in the Ward B GitHub repo:

**Repo → Settings → Secrets and variables → Actions**

### 3a. `BUTLER_API_KEY` (secret — the itch key from step 2)

1. On that page, make sure the **Secrets** tab is selected.
2. Click **New repository secret**.
3. Name: `BUTLER_API_KEY`
4. Value: paste the key from step 2.
5. Click **Add secret**.

### 3b. `TELEMETRY_URL` (variable — NOT a secret, it's a public URL)

1. Same page, switch to the **Variables** tab.
2. Click **New repository variable**.
3. Name: `TELEMETRY_URL`
4. Value: the Cloudflare Worker URL another workstream is standing up
   (e.g. `https://telemetry.wardb.workers.dev` — confirm the real URL once
   that Worker is deployed). If you leave this unset, the game still
   builds and runs fine — it just logs telemetry to the browser console
   instead of sending it anywhere. Not a blocker for shipping.

Why a variable and not a secret: it gets baked into the client-side JS
bundle that ships to every player's browser, so it was never private —
treating it as a secret would just make it harder to read your own build
logs for no security benefit.

---

## 4. One-time: manual itch.io project setup (load-bearing — do not skip)

**butler cannot do either of these steps for you.** Skip them and the
build uploads successfully but shows a **download button** instead of a
**play button** on the itch page — the single most common way this goes
wrong.

### 4a. Set "Kind of project" to HTML

itch defaults new projects to "Downloadable" (for .exe/.zip files people
download and run locally). Ward B needs to run *in the browser*.

1. Go to your project's edit page: itch.io dashboard → the "Ward b"
   project → **Edit game**.
2. Find **Kind of project** near the top.
3. Change it from **Downloadable** to **HTML**.
4. Save.

Do this *before* the first butler push, or at latest before you try to
mark the file as browser-playable in step 4b (it won't have the right
upload slot otherwise).

### 4b. Mark the uploaded file as "played in the browser"

This one can **only** happen after butler has pushed at least one build —
there's no file to flag until one exists.

1. Trigger the first release (see step 5 below), and confirm in the
   Actions tab that the `Publish to itch.io` workflow finished green.
2. Go back to **Edit game** on the itch dashboard.
3. Scroll to the **Uploads** section. You should see a file (from the
   `html5` channel butler pushed to) with a checkbox column.
4. Tick **"This file will be played in the browser"** next to it.
5. Save.

### 4c. Recommended embed settings (same Edit game page)

While you're there, set these — they matter for a first-person game with
touch controls:

- **Viewport dimensions:** ~960×600 is a sane default for this game.
- **Fullscreen button:** enable it. Important for a first-person game —
  players will want to get the browser chrome out of the way.
- **Mobile friendly:** tick it. Ward B ships real touch controls (the
  on-screen stick and INTERACT button in `index.html`'s `#stick` /
  `#btnAct`), so it's not a false claim.

### 4d. Visibility: draft → restricted → public

Don't flip straight to Public. itch visibility has three states:

- **Draft** — only you can see it. Good for steps 4a/4b/4c before anyone
  else looks.
- **Restricted** — generates a secret shareable link. Anyone with the
  link can play, but it's not listed or searchable. **Use this to verify
  telemetry actually lands** from a real itch iframe before going public
  — the itch sandbox origin behaves differently from localhost/Pages (see
  §7.4/§5.3 of the telemetry design doc), so this is the only way to
  catch a CORS or origin problem before real players hit it.
- **Public** — listed, searchable, linkable from anywhere. Flip to this
  only after you've confirmed telemetry events are arriving from a
  Restricted-link playtest.

Set visibility from the same **Edit game** page, top of the form.

---

## 5. First release

1. Locally, create the `release` branch from `main` (only needed once):
   ```
   git checkout -b release main
   git push -u origin release
   ```
2. This immediately triggers `deploy-itch.yml` (push to `release`).
   Watch it in **repo → Actions → Publish to itch.io**.
3. If it's green, go do step 4b (mark the file browser-playable) — this
   is the only manual step left after the first push.
4. Reload the itch project page (Restricted link) and confirm the game
   boots with a play button, not a download prompt.
5. Play it via the Restricted link, then check the telemetry
   collector/dashboard for events tagged with the itch origin. Only once
   you see real events from that origin, flip visibility to Public
   (step 4d).

---

## 6. Every subsequent release

Once the one-time setup above is done, shipping to itch is just:

```
git checkout release
git merge main
git push
```

That push triggers `deploy-itch.yml` automatically. Watch **Actions →
Publish to itch.io** for green. No further manual itch steps are needed —
4a/4b/4c only had to happen once, the file stays flagged browser-playable
across future pushes to the same channel.

If you ever need to re-run a release without a new commit (e.g. after
fixing a secret), use the **Run workflow** button on the
`Publish to itch.io` workflow in the Actions tab — it's wired to
`workflow_dispatch` for exactly this.

---

## 7. Troubleshooting

**Build uploaded (workflow went green) but itch shows a download button,
not a play button.**
This is 4a/4b, not a bug in the pipeline. Check: is "Kind of project" set
to HTML (4a)? Is the uploaded file ticked "played in the browser" (4b)?
Both must be true. This is by far the most common failure mode and is
entirely on the itch dashboard side — nothing in CI can fix it.

**Workflow fails on the "Push build to itch.io" step, auth error /
"401" / "invalid key".**
The `BUTLER_API_KEY` secret is missing, mistyped, or the key was
regenerated/revoked on itch since it was added. Regenerate a key
(section 2), update the GitHub secret (section 3a) — secrets can be
edited in place, no need to delete and re-add.

**Workflow fails on "Push build to itch.io" with a 404 or "project not
found."**
The `lucy-holm/ward-b` target in `deploy-itch.yml` doesn't match your
actual project. Check the public page URL — `https://<username>.itch.io/<slug>`
— and set the target to `<username>/<slug>` in the `butler push` line (see
the placeholder note at the top of this doc).

**Game loads on Pages/tailnet but telemetry never shows up when played
from the itch Restricted link (CORS failures in the browser console).**
This is the itch-sandbox-origin problem the design doc calls out (§5.3,
§7.4) — itch serves the game from an iframe on a different origin than
your Worker expects. Check the Worker's CORS configuration allows the
itch origin (or `*`, per the design doc's plan), and check the browser
console on the Restricted-link playtest specifically — this is exactly
why step 4d has you verify on Restricted before Public.

**`TELEMETRY_URL` variable not set — is that a problem?**
No. The client falls back to console-logging telemetry instead of
sending it anywhere. The build won't fail. Set it once the Worker exists;
until then itch releases still work, you just won't get data from them.

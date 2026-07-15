# Installing The Megastructure system on The Forge

This is the mechanical "how to publish this system and load it on Forge" guide.
For the full setup timeline and the pre-session checklist, see
`../../FOUNDRY-FORGE-SETUP-PLAN.md`.

The system is a self-contained folder (~160 KB, no build step, no dependencies).
It targets **Foundry v13**.

---

## Before you start

1. **Own a Foundry VTT license** (foundryvtt.com, one-time purchase ~$50 USD).
   You need this even on Forge. Forge hosts Foundry; it does not replace owning it.
2. **A Forge account** (forge-vtt.com) on the **Game Master** tier (~$4.49/mo). It is
   the cheapest paid tier and allows custom systems (its 500 MB quota covers custom
   systems/modules). Story Teller / World Builder are not needed for one small world.
3. On Forge, set your Foundry version to **v13** to match this system.

---

## Route A (recommended): install by manifest URL via GitHub

This is the dependable route on any Forge tier, and it doubles as your backup and
version history.

The GitHub account is **sjestro23** and `system.json` is already filled in with the real
URLs (done 2026-07-15). Nothing to substitute.

1. Create a **public** repo named exactly `megastructure-foundry` under `sjestro23`.
   It must be public: Forge fetches the manifest anonymously, and a private repo 404s.
2. Commit the contents of this `megastructure/` folder to the repo's `main` branch
   (so `system.json` sits at the repo root, NOT inside a `megastructure/` subfolder).
3. Create a **Release** tagged exactly `v0.6.0` and attach the packaged zip
   `megastructure-v0.6.0.zip` (found one level up, in the `Foundry System/` folder)
   as a release asset. The tag must match the `download` URL in `system.json`.
4. In Forge: **Setup -> Game Systems -> Install System**, paste the **manifest URL**:
   ```
   https://raw.githubusercontent.com/sjestro23/megastructure-foundry/main/system.json
   ```
   and install.

Before pasting into Forge, open that manifest URL in a browser tab. If you see raw JSON,
Forge will too. If you see GitHub's 404 page, the repo is private, the branch is not
`main`, or `system.json` is not at the repo root.

To ship an update later: bump `version` in `system.json`, cut a new release tag,
update the `download` URL to that tag's zip, and Foundry will offer the update.

## Route B: direct upload (only if your Forge tier exposes it)

If your Forge plan has a direct "upload system" option, upload
`megastructure-v0.6.0.zip` through that UI instead. The placeholder URLs in
`system.json` do not matter for this route. [Confirm your tier exposes this.]

## Route C: test locally first — NOT IN USE

Superseded 2026-07-15: hosting is Forge-only, with no local Foundry install, so this
route is unavailable. Kept for reference in case a local install is ever added.

Install Foundry on your own computer and drop this `megastructure/` folder into
`…/FoundryVTT/Data/systems/megastructure/`. Restart Foundry, create a World on The
Megastructure, and confirm an Actor opens and rolls. Local iteration is instant and
free. The GitHub URLs do not matter locally.

---

## Sanity check after install

- The World loads with **The Megastructure** as its system, no errors in the console
  (F12) on load.
- Create an Actor of type **Character** — it opens with the humanoid Limb set.
- A **skill roll** and a **weapon attack** both post a result to chat.
- The **Combat Tracker** rolls `1d10 + Initiative` and advances turns.

## Repackaging the zip (if you edit the system)

From inside this `megastructure/` folder:

```
zip -r ../megastructure-v0.6.0.zip . -x '*.DS_Store'
```

The zip must have `system.json` at its root (not inside an extra wrapping folder).

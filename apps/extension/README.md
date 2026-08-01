# FitLoom Chrome Extension MVP

## Configure

Edit `src/config.js` if your API is not running at `http://localhost:4000`.

## Load locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `apps/extension`.
4. Open a supported product page for a top or outerwear item.
5. Open the FitLoom extension popup.

## How detection works

Nothing is injected until you press **Capture product from this page**. The popup
then runs `src/content-script.js` once in the active tab through
`chrome.scripting.executeScript`, and it reads the product in this order:

1. `schema.org/Product` JSON-LD, including entries nested in `@graph`.
2. OpenGraph (`og:image` / `og:title`) meta tags.
3. A scored scan of the page images, ignoring anything under 120px and
   penalising wide banner-shaped images.

The script is deliberately **not** registered in the manifest, so it never runs
on pages you have not acted on.

## Permissions

- `activeTab` + `scripting` — inject the detector on demand, only after a click.
- `storage` — `chrome.storage.session` only (see below).
- `host_permissions: <all_urls>` — required to download the product image from
  retailer CDNs, which are usually on a different origin from the product page.

## Session-only inputs

Chrome destroys the popup whenever it loses focus. To avoid re-entering
everything on each use, the access token, the confirmed garment, and the last
result are kept in `chrome.storage.session`, which lives in memory and is
cleared when the browser closes. Nothing is written to disk, and `local`/`sync`
storage, localStorage, IndexedDB, and cookies are never used.

**The person photo is never stored**, in session storage or anywhere else, so it
has to be chosen again after the popup closes.

For the MVP, paste a Supabase access token from an authenticated test session
into the popup. This is a temporary hackathon handoff until a reviewed extension
auth flow is implemented.

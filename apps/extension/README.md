# FitLoom Chrome Extension MVP

## Configure

Edit `src/config.js`:

- `FITLOOM_API_BASE_URL` — change it if your API is not running at `http://localhost:4000`.
- `FITLOOM_SUPABASE_URL` and `FITLOOM_SUPABASE_ANON_KEY` — the same project URL and
  publishable key the web app uses in `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sign-in does not work until these are set.

The anon key is a public client credential, so shipping it in the extension is
expected. Never put the service-role key here.

The API must also allow the extension's origin. Add
`chrome-extension://<your-extension-id>` to `ALLOWED_ORIGINS` on the API, or every
try-on request is blocked by CORS. Chrome shows the ID on `chrome://extensions`
after you load the extension.

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

## Sign in and sign up

The popup signs in against Supabase directly, the same way the web app's browser
client does. Passwords are sent only to Supabase — they never reach the FitLoom
API, which sees the resulting bearer token and re-verifies it server-side on
every request.

- **Sign in** — email and password for an existing FitLoom account.
- **Create account** — the same fields. If the Supabase project requires email
  confirmation, signup returns no session; the popup says so and switches back to
  sign-in for after you confirm.
- **Sign out** — drops the local session and revokes the token with Supabase.

Access tokens expire (one hour by default). The popup refreshes the token a
minute before expiry, so a long try-on cannot start on a token that dies
mid-request. If the refresh token is also rejected, the popup returns to the
sign-in view rather than failing the request with an unexplained 401.

## Session-only inputs

Chrome destroys the popup whenever it loses focus. To avoid re-entering
everything on each use, the signed-in session, the confirmed garment, and the
last result are kept in `chrome.storage.session`, which lives in memory and is
cleared when the browser closes. Nothing is written to disk, and `local`/`sync`
storage, localStorage, IndexedDB, and cookies are never used.

Signing in therefore lasts until the browser closes, by design — the tokens are
never persisted to disk.

**The person photo is never stored**, in session storage or anywhere else, so it
has to be chosen again after the popup closes.

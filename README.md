# TrueFit

TrueFit is a consent-first virtual try-on MVP for online fashion discovery. It pairs a moderated visual try-on result with a Gemini-generated Fit-Physics Note so shoppers can understand likely stretch, structure, pressure points, and uncertainty without treating AI imagery as a guaranteed size or physical-fit simulation.

## What is in this repo

| Path | Purpose |
| --- | --- |
| `apps/api` | Express + TypeScript proxy API for auth, validation, memory-only media intake, SafeSearch moderation, YouCam orchestration, Gemini fit notes, and explicit Supabase wardrobe saves. |
| `apps/web` | Next.js onboarding and wardrobe app for Supabase auth, consent, fit profile capture, and private saved-result browsing. |
| `apps/extension` | Chrome Manifest V3 MVP extension for page-local garment detection, thumbnail confirmation, try-on requests, split result viewing, and save-to-wardrobe. |
| `context` | Product, architecture, standards, API reference, progress tracker, and unit specs. |

## Safety and data-handling principles

- The backend validates Supabase bearer tokens and derives user identity only from verified auth context.
- Raw person photos and garment images are request-scoped and in memory only.
- Inputs are moderated before YouCam; generated outputs are moderated before display or save.
- Gemini receives approved garment metadata and minimal profile fields only; it does not receive raw image buffers.
- Try-on generation returns a session-scoped result. Supabase Storage/database persistence happens only after an explicit save action.
- The Chrome extension keeps token, image, garment, and result data in memory only; it does not use persistent extension storage for sensitive data.

## Prerequisites

- Node.js 22+ recommended.
- npm available for local installs.
- A Supabase project.
- Google Cloud Vision API access.
- Gemini API access.
- Perfect Corp / YouCam API access.
- Chrome or a Chromium-based browser for the extension.

> Note: package installation in the current agent environment was blocked by an npm registry `403 Forbidden` policy for new packages. The API dependencies already present in this environment were testable; the web app needs its declared dependencies installed locally before its typecheck/build can run.

## Required keys and environment variables

### API: `apps/api/.env`

Copy `apps/api/.env.example` to `apps/api/.env` and fill in:

```env
NODE_ENV=development
PORT=4000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-or-secret-key
SUPABASE_RESULTS_BUCKET=try-on-results

GOOGLE_CLOUD_VISION_API_KEY=your-google-cloud-vision-api-key

YOUCAM_API_KEY=your-youcam-api-key
YOUCAM_BASE_URL=https://api.yce.perfectcorp.com
TRY_ON_POLL_INTERVAL_MS=1000
TRY_ON_TIMEOUT_MS=30000

GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

### Web: `apps/web/.env.local`

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
SUPABASE_RESULTS_BUCKET=try-on-results
```

### Extension API URL

Edit `apps/extension/src/config.js` if the API is not running locally at `http://localhost:4000`.

```js
export const TRUEFIT_API_BASE_URL = 'http://localhost:4000';
```

## How to get keys

### Supabase

1. Create or open a Supabase project.
2. Go to **Project Settings → API Keys**.
3. Copy the project URL to `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy the anon/publishable key to `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Copy the service-role/secret key to `SUPABASE_SERVICE_ROLE_KEY` for the API only.
6. Do not expose the service-role/secret key to the web app or extension.

### Google Cloud Vision SafeSearch

1. Create or open a Google Cloud project.
2. Enable billing if required.
3. Enable the **Cloud Vision API**.
4. Go to **APIs & Services → Credentials**.
5. Create an API key and restrict it to Cloud Vision when possible.
6. Set `GOOGLE_CLOUD_VISION_API_KEY` in `apps/api/.env`.

### Gemini

1. Open Google AI Studio.
2. Create a Gemini API key for your Google Cloud project.
3. Set `GEMINI_API_KEY` in `apps/api/.env`.
4. Keep `GEMINI_MODEL=gemini-2.0-flash` unless you intentionally update and re-test the model contract.

### Perfect Corp / YouCam

1. Sign up for Perfect Corp / YouCam API access.
2. Create or obtain an API key from the YouCam developer dashboard or account contact.
3. Set `YOUCAM_API_KEY` in `apps/api/.env`.
4. Keep `YOUCAM_BASE_URL=https://api.yce.perfectcorp.com` unless your account documentation provides a different endpoint.

## Supabase schema expectations

The current app expects at least these tables and a private Storage bucket.

### Storage

Create a private bucket:

```text
try-on-results
```

### Tables

The implementation expects these logical fields:

```sql
profiles:
  user_id
  height
  usual_size
  fit_preferences
  onboarding_complete
  updated_at

photo_consents:
  user_id
  accepted_at
  consent_version

saved_try_ons:
  id
  user_id
  result_path
  garment
  fit_physics_note
  source_url
  created_at
```

Enable Row Level Security for user-owned tables and apply owner-scoped policies before using real user data.

## Install and run

### API

```bash
cd apps/api
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

The API runs on:

```text
http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{ "data": { "status": "ok" }, "error": null }
```

### Web app

```bash
cd apps/web
npm install
npm run typecheck
npm run dev
```

Open:

```text
http://localhost:3000
```

Test flow:

1. Open `/auth`.
2. Sign up or sign in.
3. Complete consent at `/onboarding`.
4. Complete fit profile at `/onboarding/profile`.
5. Open `/try-on`, upload one clear person photo and one or more product photos, and generate a moderated try-on.
6. Confirm `/wardrobe` shows an empty state or your saved results.

### Chrome extension

1. Ensure the API is running.
2. Edit `apps/extension/src/config.js` if needed.
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select `apps/extension`.
7. Open a supported product page for a top or outerwear item.
8. Open the TrueFit extension popup.
9. Paste a Supabase access token for your signed-in test user.
10. Select a front-facing, fully clothed person photo.
11. Click **Detect garment**.
12. Confirm the detected thumbnail.
13. Click **Generate Fit**.
14. Review the approved result and Fit-Physics Note.
15. Click **Save to Wardrobe** and verify it appears in the web app.

For the MVP, the access token handoff is manual and session-only. The extension does not persist the token, images, or generated result.

## How to test without live vendor keys

The API unit tests use mocked services for critical workflows, so they can run without live Google Vision, Gemini, YouCam, or Supabase writes:

```bash
cd apps/api
npm test
```

These tests cover:

- Health and auth envelopes.
- Missing/malformed token rejection.
- Request validation failures.
- Memory-only upload assertions.
- SafeSearch blocked/approved paths.
- YouCam timeout behavior.
- Fit-note input shaping.
- Explicit save behavior and cleanup on failed persistence.

## Useful verification commands

From the repo root:

```bash
node --check apps/extension/src/contracts.js
node --check apps/extension/src/api-client.js
node --check apps/extension/src/content-script.js
node --check apps/extension/src/popup.js
python3 -m json.tool apps/extension/manifest.json >/tmp/manifest.json
cd apps/api && npm run typecheck && npm test
```

## Current limitations

- The extension auth handoff is manual token paste for the MVP.
- The web app has onboarding, upload-based try-on, and wardrobe gallery screens, but no saved-item detail page yet.
- The backend currently uses in-memory current-result storage for session-scoped unsaved results; production deployment may require a reviewed short-lived result cache strategy.
- Minor detection is not implemented. Google Vision SafeSearch is not a minor/age detector.
- Live end-to-end testing requires real Supabase, Google Vision, Gemini, and YouCam credentials.

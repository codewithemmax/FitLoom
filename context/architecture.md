# Architecture Context

## Stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web app | Next.js + TypeScript | Authentication UI, consent, onboarding, profile management, saved wardrobe gallery |
| Browser capture | Chrome Extension | Page-local garment discovery, metadata capture, thumbnail confirmation, split-screen try-on experience |
| Proxy backend | Node.js + Express + TypeScript | Authenticated request gateway, validation, moderation workflow, API orchestration, consistent error responses |
| Database and auth | Supabase | Auth, user profiles, saved wardrobe metadata, and explicitly saved result records |
| Image moderation | Google Cloud Vision SafeSearch | Input and generated-image safety checks |
| Virtual try-on | Perfect Corp YouCam | Asynchronous garment overlay generation |
| Fit analysis | Google Gemini | Fit-Physics Note from approved garment metadata and profile data |

## System Boundaries

- `apps/web/` — Next.js pages, components, Supabase client integration, and user-owned gallery/profile experiences.
- `apps/extension/` — content scripts, popup/panel UI, page parsing, confirmation UI, and calls only to the Express API.
- `apps/api/` — Express routes, middleware, controllers, services, integrations, polling, and error mapping.
- `apps/api/src/middleware/` — authentication, input validation, upload limits, moderation gates, and centralized error handling.
- `apps/api/src/services/` — vendor clients and orchestration services; controllers must not contain vendor calls or polling loops.
- `supabase/` — migrations, row-level security policies, and database functions only.
- `context/` — durable product and engineering decisions; no runtime application code.

## Storage Model

- **Supabase Auth**: User identity and sessions.
- **Supabase Postgres**: Profile data (height, usual size, fit preferences), consent record, garment metadata for saved items, Fit-Physics Notes, and saved-result metadata.
- **Supabase Storage**: Final composited image only after the user explicitly selects “Save to Wardrobe.” Access must be scoped to the owning user.
- **Process memory**: Base photos, garment-source images, vendor payload buffers, and any unsaved generated image. Use Multer memory storage only; release references after the request completes.
- **Never persist**: Raw base photos, blocked images, failed generation artifacts, or unsaved source media.

## Auth and Access Model

- The web app and extension authenticate the user with Supabase.
- The extension sends the user’s bearer token only to the Express proxy over HTTPS.
- The proxy validates the Supabase JWT before processing any protected route; it derives the user ID from the verified token, never from request input.
- Supabase row-level security restricts profiles, saved wardrobe records, and stored result images to their owner.
- Vendor credentials remain server-side environment variables and are never bundled into the Next.js app or extension.

## Vendor Documentation Gate

- The canonical vendor links and integration constraints live in [`api-references.md`](api-references.md).
- Before changing a vendor client, endpoint, model, file requirement, polling rule, or moderation threshold, read the relevant official API documentation and update `api-references.md` when the provider has changed its contract or limitations.
- Google Cloud Vision SafeSearch is an NSFW/explicit-content gate, not a minor/age detector. It cannot alone support a claim that minors are detected or blocked; that requires a separate approved control.

## Safety-First Data Flow

1. The extension collects a candidate garment image and textual metadata, then displays a thumbnail confirmation.
2. After user confirmation, the extension sends the base photo, garment image, and metadata to the authenticated Express endpoint.
3. Express validates type, size, garment scope, consent, and required inputs; uploaded buffers stay in RAM.
4. Google Cloud Vision SafeSearch moderates the base photo and garment image. Any unsafe, ambiguous, missing, or failed moderation result stops the request.
5. Only approved inputs are submitted to YouCam. Express owns YouCam’s asynchronous polling and does not expose its credentials or task lifecycle to clients.
6. The generated image is sent through SafeSearch again. A blocked, ambiguous, or failed check returns a safe error and the image is discarded.
7. For approved output, Gemini receives only the approved garment metadata and relevant profile fields to produce the Fit-Physics Note.
8. The extension receives the approved result. A final image and note are written to Supabase only when the user explicitly saves them.

## Invariants

1. No client calls Google Cloud Vision, YouCam, or Gemini directly, and no vendor credential is exposed to a browser context.
2. Raw user photos and unsaved generated images are never written to disk, logs, database rows, or object storage.
3. Every input image must pass SafeSearch before YouCam is called; every generated image must pass SafeSearch before it is returned or saved.
4. Moderation, validation, authentication, and vendor failures are fail-closed: stop processing, discard transient media, and return a safe error.
5. The Express API verifies identity and ownership at every protected boundary; it never trusts a supplied user ID.
6. Only supported garment categories (tops and outerwear) may reach generation.
7. Gemini output is guidance, not a physical-fit guarantee; its prompt and UI must preserve that distinction.

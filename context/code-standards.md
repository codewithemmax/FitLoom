# Code Standards

## General

- Use TypeScript with `strict: true` across the Next.js app, extension, and Express backend.
- Prefer small, explicit modules with one responsibility. Use named exports unless a framework convention requires a default export.
- Never use `any`. Treat external data as `unknown` and validate it at the boundary.
- Keep secrets in validated server-side environment configuration. Never use `NEXT_PUBLIC_` or extension build variables for vendor secrets.
- Do not log photos, image buffers, authorization headers, API keys, or complete third-party responses.

## Naming and File Organization

- Use `kebab-case` for file and folder names, `PascalCase` for React components and types, and `camelCase` for functions and variables.
- Co-locate a component with its styles, tests, and feature-specific helpers where practical.
- Use `apps/web/` for the Next.js web app, `apps/extension/` for Chrome extension code, and `apps/api/` for Express code.
- Keep cross-app request and response contracts in a typed shared package or a clearly versioned contract module; do not duplicate informal interfaces.

## Next.js and React

- Default to Server Components. Add `'use client'` only for browser state, event handlers, or browser APIs.
- Access Supabase using the appropriate server or browser client; never leak service-role credentials to client code.
- Model request UI with explicit `idle`, `confirming`, `loading`, `success`, and `error` states.
- Keep data access out of presentational components. Use feature-level actions, hooks, or service modules.
- Make safety consent, photo guidance, errors, and fit limitations visible in the user experience.

## Chrome Extension

- Separate content-script extraction from popup/panel rendering and API communication.
- Treat scraped DOM content as untrusted. Sanitize, validate, and constrain it before displaying or sending it.
- Require an explicit thumbnail confirmation after extraction and before every generation request.
- Do not store raw person photos, source images, bearer tokens, or generation results in persistent extension storage unless a future, reviewed requirement explicitly permits it.
- Support only the documented MVP garment categories; reject unclear product classification rather than guessing.

## Express Backend

- Use the request flow: `route -> auth/validation middleware -> controller -> service -> vendor client`.
- Keep controllers thin: parse typed input and map a service result to HTTP. Polling, moderation, Gemini prompting, and YouCam integration belong in services.
- Apply authentication, consent checks, input validation, garment-scope validation, and moderation gates before business logic.
- Use Multer `memoryStorage()` only. Disk storage, temporary files, and filesystem writes for uploaded media are forbidden.
- Enforce file MIME allowlists, byte-size limits, and buffer presence before sending data to a vendor.
- Use centralized error middleware with a stable response shape: `{ data: null, error: { code, message } }`. Do not return a vendor’s raw error to the client.
- Fail closed. If a dependency times out, returns an invalid payload, or cannot make a clear safety decision, stop the pipeline, discard buffers, and return a safe error.
- Use timeouts, bounded polling, and cancellation/cleanup paths for YouCam tasks. Never leave an unbounded polling loop.

## API Contracts

- Version Express routes under `/api/v1`.
- Validate bodies, query values, and vendor responses with a schema validator before use.
- Keep successful responses consistent: `{ data: ..., error: null }`.
- Return only the minimal approved result data required by the extension or web app.
- Do not encode user IDs in URLs or request bodies when they can be read from the verified JWT.

## Database and Storage

- Create migrations for every schema change and enable row-level security for all user-owned tables.
- Store only the finalized result after an explicit user save; use user-scoped object paths and signed access where needed.
- Record consent and saved-item ownership explicitly.
- Do not persist rejected images, unsaved input photos, or vendor task payloads.

## Verification

- Run formatting, linting, type checking, and the relevant tests before marking a unit complete.
- Test the safe path and the blocked path for every change to the proxy workflow.
- Manually verify extension confirmation, skeleton loading, failure state, result state, save, and close/cleanup paths.

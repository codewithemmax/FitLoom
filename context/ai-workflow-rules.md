# AI Workflow Rules

## Approach

Build TrueFit incrementally and spec-first. Read `context/project-overview.md`, `context/architecture.md`, `context/code-standards.md`, and `context/ui-context.md` before proposing or implementing a feature. Use `context/progress-tracker.md` to select the current task and update it after meaningful work.

Before modifying a Perfect Corp YouCam, Google Gemini, or Google Cloud Vision integration, read the corresponding official link in `context/api-references.md`. Treat that file as the source of truth for current endpoints, versions, limits, and documented limitations.

## Scoping Rules

- Work on one verifiable feature unit at a time.
- Do not introduce libraries, vendor integrations, data stores, or architectural patterns without first checking `architecture.md` and documenting an approved change there.
- Do not combine unrelated web app, extension, database, and backend changes unless the current task explicitly requires an end-to-end slice.
- Do not implement out-of-scope garment types, exact fit predictions, checkout, or automated purchasing.
- Preserve existing user changes. Do not reformat, rename, or rewrite unrelated files.

## Safety Rules

- Never bypass, weaken, reorder, mock around, or remove Express authentication, validation, consent, or moderation middleware in production code.
- Never call Google Cloud Vision, Perfect Corp YouCam, or Google Gemini from Next.js client code, a content script, or an extension popup.
- Never write a raw user photo, unapproved image, or unsaved generated image to disk, persistent extension storage, logs, database, or object storage.
- Use memory-only uploads and explicitly release transient buffers/references after success, failure, timeout, or cancellation.
- Treat missing, malformed, timed-out, ambiguous, or failed moderation as unsafe. Stop the request and return a safe error.
- Do not represent Google Cloud Vision SafeSearch as minor or age detection. SafeSearch alone cannot enforce a no-minors requirement.
- Do not expose vendor credentials, full third-party errors, raw prompts containing user data, or bearer tokens.

## When to Split Work

Split a task when it combines any of the following:

- A schema/RLS change and unrelated UI polish.
- More than one independent Express route or vendor integration.
- Extension page parsing and result-view redesign.
- A safety-pipeline change and any unconnected feature work.
- Work that cannot be verified with a concise, end-to-end acceptance check.

## Handling Missing Requirements

- Do not invent product behavior, fit claims, retention periods, or safety exceptions.
- Resolve ambiguity against the safety-first invariants in `architecture.md`.
- If a decision changes scope, storage, user consent, or the data flow, add an open question to `progress-tracker.md` and request direction before implementation.
- Prefer rejecting uncertain product classification or moderation results to guessing.

## Documentation Discipline

- Update `architecture.md` when a system boundary, data flow, storage rule, auth rule, or invariant changes.
- Update `code-standards.md` when a durable implementation convention changes.
- Update `ui-context.md` when an interaction state or layout pattern changes.
- Mark work in `progress-tracker.md` only after the stated verification has passed.

## Before Moving to the Next Unit

1. Confirm the implementation matches the relevant context files.
2. Confirm no safety or data-retention invariant was violated.
3. Run the project’s formatter, linter, type check, and applicable tests.
4. Exercise both approved and blocked/failure paths for any proxy or media-flow change.
5. Update `progress-tracker.md` with completed work, current state, and unresolved questions.

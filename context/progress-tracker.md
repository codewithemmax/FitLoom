# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Planning and foundation setup

## Current Goal

- Establish the secure data model and implementation foundations for the hackathon MVP.

## Database Schema

- [ ] Create Supabase project configuration and environment-variable templates.
- [ ] Configure Supabase Auth for the Next.js app and Chrome extension flow.
- [ ] Create `profiles` table for height, usual size, fit preferences, and onboarding completion.
- [ ] Create a consent record/table for explicit photo-use acceptance and timestamp.
- [ ] Create saved wardrobe/result tables with user ownership, garment metadata, Fit-Physics Note, and result-image path.
- [ ] Write row-level security policies for every user-owned table and storage object.
- [ ] Configure private result-image storage paths scoped to the authenticated user.
- [ ] Create migrations and seed/demo data appropriate for the hackathon demo.

## Express Proxy

- [x] Scaffold TypeScript Express service with health endpoint, typed configuration, and centralized error middleware.
- [x] Add Supabase JWT validation middleware for protected routes.
- [x] Add consent, file-size, MIME-type, and supported-garment validation.
- [x] Configure request-scoped memory-only upload handling; confirm no upload path or disk storage is present.
- [x] Implement Google Cloud Vision SafeSearch service for input images.
- [x] Add the pre-generation moderation gate with fail-closed responses.
- [x] Implement Perfect Corp YouCam submission and bounded asynchronous polling service.
- [x] Implement generated-image SafeSearch moderation gate and transient buffer cleanup.
- [x] Implement Gemini Fit-Physics Note service using approved garment metadata and user profile fields.
- [x] Create a single authenticated try-on endpoint with stable request/response contracts.
- [x] Add integration tests for approved, unsafe, malformed, timeout, and vendor-failure paths.

## Next.js Web App

- [ ] Scaffold the Next.js TypeScript application and shared styling foundation.
- [ ] Connect Supabase authentication and protected-route handling.
- [ ] Build explicit safety consent screen.
- [ ] Build base-photo guidance and upload experience (front-facing, fully clothed, hair tied back).
- [ ] Build body-profile form for height, usual size, and fit preferences.
- [ ] Persist onboarding completion and profile data in Supabase.
- [ ] Build saved wardrobe gallery with owner-scoped query and result cards.
- [ ] Add saved-item detail view with image, garment data, Fit-Physics Note, and delete/save controls as scoped.
- [ ] Add friendly empty, loading, error, and blocked states.

## Chrome Extension

- [ ] Scaffold Manifest V3 extension with content script, popup/panel, and secure API configuration.
- [ ] Implement page-local detection of a candidate primary garment image.
- [ ] Implement extraction of available garment metadata: title, fabric composition, size-chart hints, and source URL.
- [ ] Add supported-garment classification and a safe unsupported/uncertain state.
- [ ] Build thumbnail confirmation flow; prevent generation until the user confirms.
- [ ] Integrate authenticated request to the Express proxy.
- [ ] Build the split-screen result panel: visual canvas left, Fit-Physics Note right.
- [ ] Add aspect-ratio-preserving skeleton loader and stage messaging for API latency.
- [ ] Add Fit-Physics Note streaming/progressive rendering state.
- [ ] Add safe blocked, retryable failure, cancel, save-to-wardrobe, and close/cleanup actions.
- [ ] Test the demo flow on at least one supported product page.

## Open Questions

- [ ] Confirm the exact Supabase Storage retention and deletion policy for saved wardrobe images.
- [ ] Confirm the approved image upload size and formats for the chosen YouCam API plan.
- [x] Confirm whether Fit-Physics Notes are streamed by the backend or returned once complete for the MVP. Notes are returned once complete for the MVP.
- [ ] Confirm the extension authentication handoff design for the hackathon demo.
- [ ] Select and approve a separate minor-protection control if the product must enforce “no minors processed”; Google Cloud Vision SafeSearch alone does not provide age/minor detection.

## Architecture Decisions

- [x] Unit 01 backend foundation implemented with versioned `/api/v1` protected routes, Supabase-token-derived request identity, Zod request/response contracts, and a consistent JSON envelope.

## Session Notes

- [ ] Initial Six-File Context Methodology files created; all build tasks remain To Do.
- [x] Unit 01 verified with typecheck, lint, and unit tests.
- [x] Unit 02 safety pipeline implemented with pre/post SafeSearch gates, bounded YouCam polling, safe error envelopes, and request-scoped media cleanup tests.
- [x] Unit 03 implemented with typed Gemini fit-note generation, session-scoped approved results, explicit owner-scoped save, and cleanup-on-failed-save tests.

# Unit 02: Safety Pipeline and Try-On Orchestration

## Goal

Implement the fail-closed Express workflow that validates approved inputs, moderates before and after generation, and orchestrates YouCam without exposing vendor APIs to the browser.

## Design

- The route must follow `route -> auth/validation middleware -> controller -> service -> vendor client`.
- All media is request-scoped memory. Multer disk storage and filesystem writes are prohibited.
- Treat no result, malformed result, moderation uncertainty, timeout, and vendor errors as blocking failures.
- Do not call Gemini in this unit; it is added after the approved image path exists.

## Implementation

### Media Intake

- Add the authenticated `POST /api/v1/try-ons` route.
- Require a person photo, one or more confirmed product/garment images, permitted garment category, and the minimum approved metadata contract.
- Use Multer `memoryStorage()` with MIME allowlists and explicit byte limits.
- Reject unsupported categories and incomplete confirmation before any vendor request.
- Reject no-face, unclear-face, or random/non-person person photos before any try-on vendor request.

### SafeSearch Gates

- Wrap Google Cloud Vision SafeSearch in a dedicated service.
- Moderate both input images before submitting a YouCam task.
- Define explicit safe/unsafe/indeterminate outcomes. Indeterminate must block.
- Moderate the generated image before returning any output.

### YouCam Orchestration

- Wrap the Perfect Corp YouCam API in a dedicated vendor client.
- Submit only approved image buffers and use bounded polling with a timeout.
- Map vendor payloads to a small internal result contract.
- Release image buffers/references on every completion, failure, timeout, or cancellation path.

## Dependencies

- `multer` configured for memory storage
- Google Cloud Vision SDK
- Perfect Corp YouCam client or typed HTTP client

## Verify When Done

- [ ] Disk uploads are impossible in configuration and tests.
- [ ] Unsafe or indeterminate input prevents the YouCam client from being called.
- [ ] Unsafe or indeterminate generated output is never returned.
- [ ] Polling stops at the configured timeout and returns a safe error.
- [ ] An approved fixture follows the complete moderation -> YouCam -> moderation path.
- [ ] Tests cover cleanup on success and every failure path.

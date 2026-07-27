# Unit 05: Chrome Extension Discovery and Result View

## Goal

Build the Chrome Extension MVP that detects a garment on the current page, requires thumbnail confirmation, launches the secured try-on request, and presents the approved result and Fit-Physics Note in a split-screen panel.

## Design

- Use Manifest V3 and separate content extraction from the extension UI and API client.
- Keep user media and results session-only. Do not use persistent extension storage for images, tokens, or generated outputs.
- The result surface has two panes: visual output on the left and Fit-Physics Note on the right. Stack at constrained widths.

## Implementation

### Discovery and Confirmation

- Implement a content script that identifies a candidate primary product image and available nearby text metadata.
- Treat page content as untrusted. Sanitize and validate extracted values.
- Classify only tops and outerwear for the MVP. Show an unsupported/uncertain state rather than guessing.
- Display the candidate thumbnail, title, and material details, with explicit Confirm and Cancel actions.
- Do not enable “Generate Fit” until the user confirms the detected garment.

### Request and Progress States

- Send the confirmed request only to the Express API using the authenticated session.
- Model `idle`, `confirming`, `loading`, `success`, `blocked`, and `error` states explicitly.
- Use an aspect-ratio-preserving skeleton for the left result pane during the 5–15 second generation window.
- Show truthful progress messages that never state generation succeeded before post-generation moderation completes.
- Progressively render the Fit-Physics Note in the right pane when supported by the backend; otherwise use a text skeleton then an atomic result.

### Result Actions

- Render only an approved visual result and its note.
- Disable Save to Wardrobe until the full approved result is available.
- Add Save to Wardrobe, retryable safe-error, cancel, and close actions.
- Closing or cancelling clears in-memory session state and media references.

## Dependencies

- Chrome Extensions Manifest V3 APIs
- Existing shared API contract package/module

## Verify When Done

- [ ] A supported-page fixture produces a candidate thumbnail and requires confirmation.
- [ ] An unsupported or ambiguous product cannot reach the generation endpoint.
- [ ] The split-screen skeleton prevents layout shift while the request is pending.
- [ ] Blocked/error states do not expose media and are actionable.
- [ ] Save remains disabled until both result components are approved.
- [ ] Closing clears extension session state; no raw media is written to persistent storage.

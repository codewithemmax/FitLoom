# UI Context

## Product Movement

1. **Onboarding** — A signed-in user reviews explicit photo-use consent, sees person-photo guidance, uploads a front-facing fully clothed image with hair tied back, and enters sizing preferences.
2. **Discovery** — On a retailer, social, or editorial page, the user opens the extension. It finds the candidate garment image and available text metadata.
3. **Thumbnail confirmation** — The extension shows the detected garment thumbnail and metadata summary. The user must confirm that it is the intended supported garment before continuing.
4. **Try-On trigger** — The user selects “Generate Fit.” The UI starts the secure processing state and makes clear that results are an assessment, not a guarantee.
5. **Result view** — The extension panel uses a split screen: visual result on the left and live Fit-Physics Note on the right. The user can save or close.

## Design Principles

- Feel calm, editorial, and trustworthy rather than flashy or overly futuristic.
- Explain safety and uncertainty in plain language at the relevant moment, not in dense legal copy.
- Preserve user control: confirmation before generation, explicit save after generation, and a visible close/cancel action.
- Make the distinction between visual try-on and physical fit confidence unmistakable.

## Layout Patterns

- **Web onboarding**: a focused single-column card or stepped flow with progress indication; photo guidance appears beside the uploader on wide screens and above it on narrow screens.
- **Extension capture view**: compact panel showing the detected garment thumbnail, garment details, classification/scope feedback, and primary “Generate Fit” action.
- **Extension result view**: two equal, vertically scrollable columns on desktop-width panels. Left is the visual canvas; right is the Fit-Physics Note. Stack vertically in constrained layouts.
- **Saved wardrobe**: responsive card grid with saved image thumbnail, garment title/source, saved date, and fit-note preview.
- **Destructive/unsafe states**: use a dedicated blocking state; do not display an unapproved image as a fallback preview.

## Loading and Streaming

- YouCam can take 5–15 seconds. Immediately replace the left image area with a fixed-size skeleton that preserves the final aspect ratio and avoids layout shift.
- Show concise stage text, such as “Checking image safety,” “Creating your try-on,” and “Reviewing the result.” Never imply success before post-generation moderation passes.
- Stream or progressively reveal the Fit-Physics Note in the right panel as it becomes available, with readable line lengths and an inline text skeleton before the first content arrives.
- Keep the Save action disabled until both the visual result and its safety check are complete.

## Required States

- **No garment found**: explain that the page could not be confidently read and invite the user to choose another product page.
- **Unsupported garment**: state that FitLoom’s MVP supports tops and outerwear only.
- **Confirmation required**: show the thumbnail and a clear confirm/cancel pair; no generation call is allowed in this state.
- **Safety blocked**: show a neutral privacy-respecting message and no unsafe media.
- **Network/vendor failure**: preserve the confirmed garment details, offer retry only when safe, and never claim a result was generated.
- **Success**: provide “Save to Wardrobe” and “Close” actions; closing clears session-only state.

## Accessibility

- Meet keyboard navigation requirements for all web and extension actions.
- Use semantic labels for thumbnails, loaders, progress text, buttons, and generated-image status.
- Do not rely on color alone for safety, errors, confidence, or loading.
- Provide alt text based on approved garment metadata; do not fabricate details about generated imagery.

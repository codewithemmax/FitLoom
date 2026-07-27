# Unit 03: Fit-Physics Note and Explicit Save

## Goal

Add Gemini fit-note generation to the approved try-on result flow and provide an owner-scoped save action that persists only content the user explicitly chooses to keep.

## Design

- Gemini receives approved garment metadata plus the minimum needed user profile fields; it never needs raw image buffers.
- The note must be written as confidence guidance, not a size guarantee or claim of physical simulation.
- Saving is a separate explicit action. A successful generation alone must not write an image, note, or source media to Supabase.

## Implementation

### Fit-Physics Note Service

- Create a Gemini service with a typed prompt input and typed output validation.
- Include fabric composition, garment cut/category, available sizing information, height, usual size, and fit preferences when present.
- Require concise explanations of stretch, structure, likely pressure points, and uncertainty.
- Return a safe degraded error if a note cannot be produced; never replace it with fabricated guidance.

### Generate Response

- Extend the approved try-on response with the approved visual result and Fit-Physics Note.
- Return only session-scoped result data until the user requests save.

### Save to Wardrobe

- Add an authenticated owner-scoped save endpoint.
- Validate that the save request references an approved current result and verified user identity.
- Write the final image to private, user-scoped Supabase Storage and create the related database record only after explicit save.
- Support cleanup if the storage write or database write fails partway through.

## Dependencies

- Google Gemini SDK or typed HTTP client
- Supabase server SDK

## Verify When Done

- [ ] Gemini is never called with raw image buffers or secrets.
- [ ] Generated notes communicate uncertainty and do not promise exact fit.
- [ ] Completing a try-on does not create a database row or storage object.
- [ ] Save creates an owner-scoped record and private result object.
- [ ] A user cannot save or access another user’s result.
- [ ] Failed saves do not leave unintended persistent artifacts.

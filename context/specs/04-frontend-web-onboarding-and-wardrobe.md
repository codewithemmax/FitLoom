# Unit 04: Next.js Onboarding and Wardrobe

## Goal

Build the web experience that signs users in, captures explicit consent and fit profile information, guides a standardized base-photo setup, and displays only the user’s saved wardrobe results.

## Design

- Use Next.js and Supabase according to `context/architecture.md`; default to Server Components and use Client Components only where interaction is necessary.
- The experience should feel calm and trustworthy. Place safety guidance alongside the task that requires it.
- Do not persist raw base-photo media from the web app unless a reviewed architecture decision changes the current transient-media rule.

## Implementation

### Auth and Route Protection

- Add sign-in/sign-up views and protected app routes.
- Redirect unauthenticated users to authentication and incomplete users to onboarding.

### Consent and Profile

- Build an explicit consent screen with a required acknowledgement before a try-on can be initiated.
- Build a body-profile form for height, usual size, and fit preferences.
- Provide base-photo instructions: front-facing, fully clothed, hair tied back; explain why this improves garment segmentation.
- Persist consent and profile data through owner-scoped Supabase operations.

### Wardrobe

- Build an empty state and responsive gallery of saved results.
- Display a saved image thumbnail, garment title/source, saved date, and a short Fit-Physics Note preview.
- Handle loading, error, and no-results states accessibly.

## Dependencies

- Next.js
- Supabase browser/server clients
- Existing project styling system; do not add a component library without an architecture update

## Verify When Done

- [ ] Unauthenticated visitors cannot view profile or wardrobe data.
- [ ] Consent is required and persisted before the user is treated as onboarded.
- [ ] Profile input validation and accessible errors work on desktop and mobile.
- [ ] Wardrobe only renders results belonging to the signed-in user.
- [ ] Empty, loading, and failure states are clear and keyboard accessible.

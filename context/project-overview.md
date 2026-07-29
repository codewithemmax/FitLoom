# Project Overview: TrueFit

## Executive Summary

TrueFit is an in-context virtual try-on platform for online fashion discovery. It addresses the fit-physics gap: generative try-on can show how a garment may look, but cannot reliably simulate tension, stretch, drape, or sizing on a particular body. In a market affected by vanity sizing, that uncertainty drives bracketing and returns. TrueFit pairs a visual garment overlay with a grounded, text-based Fit-Physics Note so shoppers can make a more informed decision without leaving the page where they found the item.

## Target User

The primary user is an online fashion shopper who wants to upload a clear photo of themself and one or more product photos to see a moderated generated image of how a supported garment may look on them. The hackathon MVP focuses on people willing to use a standardized, fully clothed person photo with their face visible, plus basic sizing preferences for fit guidance.

## Core Value Proposition

At the point of discovery, TrueFit provides a safe virtual visualization and a practical fit-confidence assessment. It helps shoppers move from “this looks good” to “this may be restrictive across my shoulders because this fabric has little stretch,” without treating AI imagery as a guarantee of physical fit.

## Goals

1. Let a signed-in user try on a top or outerwear garment by uploading a clear person photo and one or more product photos, or by confirming a detected garment in the extension.
2. Pair every generated image with a Gemini-generated Fit-Physics Note based on garment metadata and the user profile.
3. Enforce a safety-first, fail-closed moderation pipeline for every user and generated image.
4. Allow the user to save only explicitly chosen results to a personal wardrobe gallery.

## Core User Flow

1. The user signs in through the web app, accepts the photo-use consent, and creates a fit profile.
2. The user uploads one clear, front-facing, fully clothed person photo with their face visible.
3. The user uploads one or more product photos for a supported top or outerwear item.
4. The backend rejects random/non-person photos, photos without a detectable face, unsafe images, unsupported categories, and ambiguous moderation outcomes before generation.
5. The Express proxy moderates approved inputs, orchestrates YouCam generation, moderates the generated result, and requests the Fit-Physics Note.
6. The web app or extension shows the approved generated image plus Fit-Physics Note.
7. The user either saves the result to their wardrobe or closes the flow, clearing session-only media from memory.

## Core Features

### Photo-Based Try-On

- Web upload flow with one person photo and one or more product photos.
- Person-photo checks that require a visible face and reject random/non-person inputs before generation.
- Chrome extension capture remains available for page-local garment discovery and mandatory thumbnail confirmation.

### Fit-Physics Note

- Gemini analysis of fabric composition, cut, and available sizing data alongside the user’s height, usual size, and fit preferences.
- Plain-language confidence guidance that clearly distinguishes a fit assessment from a guarantee.

### Safety-by-Design

- Explicit user consent and standardized person-photo guidance: front-facing, fully clothed, face visible, and hair tied back where possible.
- Google Cloud Vision SafeSearch checks before and after generation.
- Memory-only handling for transient uploaded photos.
- A fail-closed backend: unsafe, ambiguous, or unavailable moderation outcomes do not reach generation or display.

## MVP Scope

- Tops and outerwear only: jackets, T-shirts, and button-downs.
- Next.js onboarding, authentication, profile setup, upload-based try-on flow, and saved wardrobe gallery.
- Chrome extension capture, confirmation, generation trigger, and result panel.
- One secure proxy workflow for moderation, YouCam orchestration, and Gemini fit notes.

## Out of Scope

- Bottoms, dresses, footwear, accessories, swimwear, singlets, and tank tops.
- Claims of exact size prediction or physical fit simulation.
- Direct client-side calls to AI vendors.
- Persistent storage of unsaved source photos or failed/blocked attempts.
- Automated purchasing, retailer checkout, or broad multi-garment outfit generation.

## Success Criteria

- A signed-in user can complete onboarding and launch a try-on from the web app by uploading a valid person photo and product images, or from the extension by confirming a supported garment.
- A request cannot reach YouCam unless input moderation succeeds.
- An unmoderated or failed post-generation result is never shown or saved.
- The result view displays a generated image and Fit-Physics Note, with usable loading feedback during API latency.

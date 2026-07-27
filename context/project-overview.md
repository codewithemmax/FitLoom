# Project Overview: TrueFit

## Executive Summary

TrueFit is an in-context virtual try-on platform for online fashion discovery. It addresses the fit-physics gap: generative try-on can show how a garment may look, but cannot reliably simulate tension, stretch, drape, or sizing on a particular body. In a market affected by vanity sizing, that uncertainty drives bracketing and returns. TrueFit pairs a visual garment overlay with a grounded, text-based Fit-Physics Note so shoppers can make a more informed decision without leaving the page where they found the item.

## Target User

The primary user is an online fashion shopper who discovers a top or outerwear item on a retailer, social, or editorial web page and is uncertain how it will look and fit. The hackathon MVP focuses on people willing to use a standardized, fully clothed base photo and provide basic sizing preferences.

## Core Value Proposition

At the point of discovery, TrueFit provides a safe virtual visualization and a practical fit-confidence assessment. It helps shoppers move from “this looks good” to “this may be restrictive across my shoulders because this fabric has little stretch,” without treating AI imagery as a guarantee of physical fit.

## Goals

1. Let a signed-in user try on a detected top or outerwear garment from the current web page.
2. Pair every generated image with a Gemini-generated Fit-Physics Note based on garment metadata and the user profile.
3. Enforce a safety-first, fail-closed moderation pipeline for every user and generated image.
4. Allow the user to save only explicitly chosen results to a personal wardrobe gallery.

## Core User Flow

1. The user signs in through the web app, accepts the photo-use consent, and creates a body profile.
2. The user uploads a standardized front-facing, fully clothed base photo with hair tied back.
3. While browsing a web page, the user opens the TrueFit Chrome extension.
4. The extension detects a primary garment image and scrapes available garment metadata such as composition and sizing information.
5. The user confirms the garment thumbnail before generation.
6. The extension sends the approved request to the Express proxy.
7. The proxy moderates inputs, orchestrates the YouCam generation, moderates the result, and requests the Fit-Physics Note.
8. The extension shows the visual result and note in its split-screen result view.
9. The user either saves the result to their wardrobe or closes the panel, clearing session-only media from memory.

## Core Features

### In-Context Discovery

- Chrome extension capture from the page where the garment is discovered.
- Garment-image and metadata extraction.
- Mandatory thumbnail confirmation before a try-on request.

### Fit-Physics Note

- Gemini analysis of fabric composition, cut, and available sizing data alongside the user’s height, usual size, and fit preferences.
- Plain-language confidence guidance that clearly distinguishes a fit assessment from a guarantee.

### Safety-by-Design

- Explicit user consent and standardized base-photo guidance.
- Google Cloud Vision SafeSearch checks before and after generation.
- Memory-only handling for transient uploaded photos.
- A fail-closed backend: unsafe, ambiguous, or unavailable moderation outcomes do not reach generation or display.

## MVP Scope

- Tops and outerwear only: jackets, T-shirts, and button-downs.
- Next.js onboarding, authentication, profile setup, and saved wardrobe gallery.
- Chrome extension capture, confirmation, generation trigger, and result panel.
- One secure proxy workflow for moderation, YouCam orchestration, and Gemini fit notes.

## Out of Scope

- Bottoms, dresses, footwear, accessories, swimwear, singlets, and tank tops.
- Claims of exact size prediction or physical fit simulation.
- Direct client-side calls to AI vendors.
- Persistent storage of unsaved source photos or failed/blocked attempts.
- Automated purchasing, retailer checkout, or broad multi-garment outfit generation.

## Success Criteria

- A signed-in user can complete the onboarding flow and launch a try-on from a supported garment page.
- A request cannot reach YouCam unless input moderation succeeds.
- An unmoderated or failed post-generation result is never shown or saved.
- The result view displays a generated image and Fit-Physics Note, with usable loading feedback during API latency.

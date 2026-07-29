# API References and Integration Gate

Use these official references as the source of truth before adding, changing, troubleshooting, or upgrading a vendor integration. Do not rely on copied endpoints, model names, limits, or examples from chat history.

## Perfect Corp YouCam: AI Clothes Virtual Try-On

- **Role in TrueFit**: The visual try-on engine. The Express proxy sends only SafeSearch-approved user and garment images to Perfect Corp, creates the AI Clothes task, polls it to completion, and passes the generated image through SafeSearch before returning it.
- **Official API overview**: [AI Clothes Virtual Try-On](https://docs.perfectcorp.com/reference/ai_clothes/section/overview)
- **Required documentation checks**: file/image requirements, supported garment categories, upload method, `POST /s2s/v2.0/task/cloth-v3`, task polling, result URL expiry, error codes, rate limits, and current API version.
- **Integration rule**: Keep the Bearer API key in the Express server only. Do not expose task IDs, vendor error payloads, or keys directly to the web app or Chrome extension.

## Google Gemini API: Fit-Physics Note

- **Role in TrueFit**: The text-only fit-confidence layer. Gemini receives approved garment metadata (such as material, cut, and available size information) and the minimum profile fields needed for the note. It does not receive raw user or generated image buffers.
- **Official API reference**: [Gemini API reference](https://ai.google.dev/api)
- **Content-generation reference**: [Generate content](https://ai.google.dev/api/generate-content)
- **Required documentation checks**: supported model and SDK version, current authentication method, structured-output options, streaming behavior, safety settings, quota/rate limits, and response schema.
- **Integration rule**: Use a server-side API key only. Validate the response against the typed Fit-Physics Note contract and preserve the UI disclaimer that this is guidance—not a physical-fit or size guarantee.

## Google Cloud Vision API: Face Detection

- **Role in TrueFit**: The person-photo validity gate. The Express proxy checks that the user-uploaded person photo includes a detectable face before any try-on vendor request. No face, low confidence, malformed response, or failed request blocks generation.
- **Official documentation**: [Detect faces](https://cloud.google.com/vision/docs/detecting-faces)
- **Integration rule**: Use face presence as a safety/input-quality gate only. Do not claim identity verification, age detection, or minor detection.

## Google Cloud Vision API: SafeSearch

- **Role in TrueFit**: The structural image-safety gate. The Express proxy uses SafeSearch on each input image before YouCam and on the generated image before it is returned or saved.
- **Official documentation**: [Detect explicit content (SafeSearch)](https://cloud.google.com/vision/docs/detecting-safe-search)
- **Required documentation checks**: authentication setup, request limits, supported input transport, `SAFE_SEARCH_DETECTION`, likelihood values, response errors, and SDK/API version.
- **Integration rule**: Define and test explicit block thresholds for `adult`, `racy`, `violence`, `medical`, and `spoof`. An unknown, missing, malformed, or failed response blocks the request.

## Minor-Protection Limitation

Google Cloud Vision SafeSearch is an NSFW/explicit-content classifier; its documented SafeSearch categories are `adult`, `spoof`, `medical`, `violence`, and `racy`. It does **not** determine whether an image contains a minor. Therefore, SafeSearch alone cannot satisfy a “no minors processed” claim.

- Do not claim minors are detected or blocked unless a separate, approved age-assurance or minor-detection control is selected, documented, legally reviewed, and implemented.
- Until such a control exists, do not market the SafeSearch workflow as minor detection. Treat the minor-protection requirement as an open product and compliance decision.

## Required Agent Check

Before modifying any vendor client, API route, request schema, model selection, polling logic, or safety threshold, read the linked official documentation and update this file if the provider changes its API, version, or limitations.

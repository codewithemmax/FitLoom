# TrueFit Chrome Extension MVP

## Configure

Edit `src/config.js` if your API is not running at `http://localhost:4000`.

## Load locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `apps/extension`.
4. Open a supported product page for a top or outerwear item.
5. Open the TrueFit extension popup.

## Session-only inputs

The popup keeps the Supabase access token, selected person photo, detected garment, and generated result only in memory. It does not use `chrome.storage`, localStorage, IndexedDB, or cookies for media, tokens, or generated outputs.

For the MVP, paste a Supabase access token from an authenticated test session into the popup. This is a temporary hackathon handoff until a reviewed extension auth flow is implemented.

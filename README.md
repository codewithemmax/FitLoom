# TrueFit

TrueFit is a consent-first virtual try-on MVP for online fashion discovery. It pairs a moderated visual try-on result with a Gemini-generated Fit-Physics Note so shoppers can understand likely stretch, structure, pressure points, and uncertainty without treating AI imagery as a guaranteed size or physical-fit simulation.

## What is in this repo

| Path | Purpose |
| --- | --- |
| `apps/api` | Express + TypeScript proxy API for auth, validation, memory-only media intake, SafeSearch moderation, YouCam orchestration, Gemini fit notes, and explicit Supabase wardrobe saves. |
| `apps/web` | Next.js onboarding and wardrobe app for Supabase auth, consent, fit profile capture, and private saved-result browsing. |
| `apps/extension` | Chrome Manifest V3 MVP extension for page-local garment detection, thumbnail confirmation, try-on requests, split result viewing, and save-to-wardrobe. |
| `context` | Product, architecture, standards, API reference, progress tracker, and unit specs. |

## Safety and data-handling principles

- The backend validates Supabase bearer tokens and derives user identity only from verified auth context.
- Raw person photos and garment images are request-scoped and in memory only.
- Inputs are moderated before YouCam; generated outputs are moderated before display or save.
- Gemini receives approved garment metadata and minimal profile fields only; it does not receive raw image buffers.
- Try-on generation returns a session-scoped result. Supabase Storage/database persistence happens only after an explicit save action.
- The Chrome extension keeps token, image, garment, and result data in memory only; it does not use persistent extension storage for sensitive data.

## Prerequisites

- Node.js 22+ recommended.
- npm available for local installs.
- A Supabase project.
- Google Cloud Vision API access.
- Gemini API access.
- Perfect Corp / YouCam API access.
- Chrome or a Chromium-based browser for the extension.

> Note: package installation in the current agent environment was blocked by an npm registry `403 Forbidden` policy for new packages. The API dependencies already present in this environment were testable; the web app needs its declared dependencies installed locally before its typecheck/build can run.

## Required keys and environment variables

### API: `apps/api/.env`

Copy `apps/api/.env.example` to `apps/api/.env` and fill in:

```env
NODE_ENV=development
PORT=4000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-or-secret-key
SUPABASE_RESULTS_BUCKET=try-on-results

GOOGLE_CLOUD_VISION_API_KEY=your-google-cloud-vision-api-key

YOUCAM_API_KEY=your-youcam-api-key
YOUCAM_BASE_URL=https://yce-api-01.perfectcorp.com
TRY_ON_POLL_INTERVAL_MS=1000
TRY_ON_TIMEOUT_MS=30000

GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

### Web: `apps/web/.env.local`

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
SUPABASE_RESULTS_BUCKET=try-on-results
```

### Extension API URL

Edit `apps/extension/src/config.js` if the API is not running locally at `http://localhost:4000`.

```js
export const TRUEFIT_API_BASE_URL = 'http://localhost:4000';
```

## How to get keys

### Supabase

1. Create or open a Supabase project.
2. Go to **Project Settings → API Keys**.
3. Copy the project URL to `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy the anon/publishable key to `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Copy the service-role/secret key to `SUPABASE_SERVICE_ROLE_KEY` for the API only.
6. Do not expose the service-role/secret key to the web app or extension.

### Google Cloud Vision SafeSearch

---

#  Project Structure

```
truefit/
│
├── extension/
│   ├── popup/
│   ├── content/
│   └── background/
│
├── web/
│   ├── app/
│   ├── components/
│   ├── pages/
│   └── lib/
│
├── server/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── controllers/
│
├── database/
│
├── public/
│
└── README.md
```

---

#  Safety & Privacy

TrueFit was designed with user privacy as a priority.

- Images are processed in memory only.
- Photos are never permanently stored.
- Users explicitly consent before uploading photos.
- Google SafeSearch filters unsafe content.
- AI requests are routed securely through the backend.

---

#  Edge Cases

TrueFit gracefully handles situations such as:

- Unsupported garments
- Failed image scraping
- AI generation timeouts
- NSFW image detection
- Network failures

Instead of failing silently, users receive clear guidance and fallback experiences.

---

#  Current MVP Scope

Supported:

- T-Shirts
- Jackets
- Hoodies
- Shirts
- Outerwear

Planned:

- Pants
- Dresses
- Skirts
- Shoes
- Accessories
- Full-body outfits

---

#  Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/truefit.git
```

Navigate into the project:

```bash
cd truefit
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

---

#  Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=

YOUCAM_API_KEY=

GOOGLE_VISION_API_KEY=
```

---

#  Future Improvements

- Personalized size recommendations
- Multi-angle try-on
- Outfit generation
- Fashion recommendations
- Brand size normalization
- Mobile application
- AI wardrobe assistant
- Shopping history analytics

---

#  Impact

TrueFit aims to:

- Reduce online clothing returns
- Improve shopping confidence
- Minimize fashion waste
- Save customers time and money
- Deliver a seamless AI shopping experience

---

#  Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes

```bash
git commit -m "Add amazing feature"
```

4. Push to the branch

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request

---


# 📄 License

 MIT 

---

## If you found this project interesting, consider giving it a star!




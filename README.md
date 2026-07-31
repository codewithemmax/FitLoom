#  TrueFit
### AI-Powered In-Context Virtual Try-On Platform

> Bringing intelligent virtual try-on directly to where you shop.

TrueFit is an AI-powered browser extension and web platform that combines **Perfect Corp's YouCam AI** with **Google Gemini** to deliver realistic virtual try-ons alongside intelligent fit analysis—without requiring users to leave the webpage they're shopping on.

Built for the **YouCam AI Hackathon**.

---

##  Overview

Online shopping has a major problem:

- Clothing sizes vary drastically across brands.
- Existing virtual try-on solutions only show how clothes *look*, not how they *fit*.
- Millions of shoppers buy multiple sizes and return unwanted items, increasing costs and environmental waste.

TrueFit solves this by combining **visual AI** with **fit intelligence**.

Instead of only generating an image, TrueFit also analyzes:

- Fabric composition
- Stretch
- Garment structure
- User body profile
- Fit preferences

to produce a realistic **Fit Confidence Note** alongside the generated try-on.

---

#  Features

###  AI Virtual Try-On
Generate photorealistic clothing try-ons using Perfect Corp YouCam.

###  AI Fit Analysis
Google Gemini evaluates:

- Fabric stretch
- Material behavior
- Body measurements
- Clothing cut

to explain how an item is likely to fit.

###  Browser Extension
Try clothes directly from:

- Fashion websites
- Online stores
- Product pages

without opening another application.

###  Privacy First
- Session-only image processing
- No permanent photo storage
- SafeSearch moderation before and after generation

###  Wardrobe Saving
Save your favorite try-ons and fit notes for future reference.

---

#  System Architecture

```
                ┌────────────────────┐
                │ Browser Extension  │
                │  (Chrome)          │
                └─────────┬──────────┘
                          │
                          ▼
               Node.js / Express API
                          │
      ┌───────────────────┼──────────────────┐
      ▼                   ▼                  ▼
 YouCam API        Google Gemini      Google Vision
(Virtual Try-On)   (Fit Analysis)     (SafeSearch)

                          │
                          ▼
                    Supabase Database
```

---

#  User Flow

1. User creates an account.
2. Uploads a reference photo.
3. Enters body measurements.
4. Visits an online clothing store.
5. Opens the TrueFit browser extension.
6. Extension detects the clothing item.
7. User confirms the garment.
8. AI generates:
   - Virtual Try-On
   - Fit Confidence Note
9. User saves the result to their wardrobe.

---

#  Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Chrome Extension APIs

## Backend

- Node.js
- Express.js
- Multer (Memory Storage)

## Database

- Supabase
- Supabase Auth

## AI Services

- Perfect Corp YouCam API
- Google Gemini API
- Google Cloud Vision SafeSearch

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




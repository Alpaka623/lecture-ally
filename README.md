This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Bring your own Gemini API key

LectureAlly ships **without** a built-in API key — every user provides their own:

1. Get a free key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Click the ⚙️ icon in the header, paste the key (optionally a custom base URL) and hit **Save**.
   Use **Test connection** to check the key works before saving.

Key handling:

- The key is stored only in the browser (`localStorage`) and sent to the app's API routes as a
  request header; the settings dialog is the single source of truth.
- The server never reads `GEMINI_API_KEY`/`GOOGLE_API_KEY` from the environment and never persists
  the key — without a browser-provided key, generation requests fail fast with a
  `MISSING_API_KEY` error and the UI prompts to add one.
- **Clear** in the settings dialog removes the key instantly.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

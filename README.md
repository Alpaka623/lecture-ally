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

## Bring your own API key (any provider)

LectureAlly ships **without** a built-in API key — every user provides their own. It works with
**any OpenAI-compatible provider**, so you can pick the model you like. Open the ⚙️ icon in the
header, choose a provider, enter your key and model, and hit **Save** (use **Test connection** to
check first).

> **Important:** every explanation sends the slide image to the model, so the model you pick must
> support **image input (vision)**.

### Easiest start: a free Google Gemini key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Click **Create API key** and copy the key (starts with `AIza…`).
3. In LectureAlly, open ⚙️, leave the provider on **Google Gemini**, paste the key and hit **Save**.

That's it — Gemini's free tier is plenty for trying the app out. (You're using your own key under
your own account; the key never leaves your browser except to call the provider directly.)

### Other providers

| Provider | Base URL | Example model | Where to get a key |
| --- | --- | --- | --- |
| Google Gemini (default) | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.1-flash-lite` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| OpenRouter | `https://openrouter.ai/api/v1` | `google/gemini-3.1-flash-lite`, `anthropic/claude-…`, many more | [openrouter.ai/keys](https://openrouter.ai/keys) |
| Custom | any OpenAI-compatible endpoint | any vision model | your endpoint |

**Custom** covers local or self-hosted servers, e.g. [Ollama](http://localhost:11434/v1) or
[LM Studio](http://localhost:1234/v1) — pick a vision-capable model such as `llama3.2-vision`.
[OpenRouter](https://openrouter.ai) is the simplest way to reach hundreds of models (including
Claude and open-weight vision models) through a single key.

Key handling:

- The key is stored only in the browser (`localStorage`) and sent to the app's API routes as a
  request header; the settings dialog is the single source of truth.
- The server never reads an API key from the environment and never persists the key — without a
  browser-provided key, generation requests fail fast with a `MISSING_API_KEY` error and the UI
  prompts to add one.
- **Clear** in the settings dialog removes the key instantly.

## Export & import lectures

Every lecture in the library has an export button (⬇) that downloads a single
`.lecture` file — a plain ZIP containing:

- `manifest.json` — format/version and the deck metadata (title, language, slide count)
- `original.pdf` — the uploaded slides
- `scripts/slide-N.json` — the generated narration text (+ word timings)
- `qna/slide-N.json` — the slide's question/answer history

Audio and slide images are deliberately left out: the app re-renders slides
from the PDF and re-synthesizes narration with the free, key-less TTS
endpoint on demand. So an imported lecture plays **without** an API key — a key is only
needed to ask *new* questions.

To import, drop the `.lecture` file (or rename it to `.zip`) into the upload
form on the start page. The archive is validated (manifest, PDF integrity,
slide count) and materialized as a brand-new deck — the same file can be
imported any number of times.

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

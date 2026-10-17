# Deploy Nova Chat on Vercel

Project layout: the React app is at the repo root (Vite), and the API is `api/index.py` (FastAPI as a
serverless function). `vercel.json` routes `/api/*` to it.

## Steps
1. Push this folder to a GitHub repo. `.env` is git-ignored, so your key is not uploaded.
2. vercel.com > Add New > Project > import the repo. Keep the detected settings (Framework: Vite).
3. Before deploying open **Environment Variables** and add:
   - `GROQ_API_KEY` = your Groq key
   - optional: `RATE_LIMIT_PER_MIN` (15), `DAILY_LIMIT` (2000), `MAX_TOKENS_CAP` (2048)
4. Click Deploy. Your site is live at https://<project>.vercel.app

Or with the CLI: `npm i -g vercel`, then `vercel` and `vercel env add GROQ_API_KEY`.

## Reliable rate limiting (recommended)
Serverless instances come and go, so the built-in in-memory limiter is only best-effort.
In your Vercel project open Storage > Marketplace > add **Upstash Redis** (free tier) and connect it.
The API picks up its environment variables automatically and enforces per-IP and daily limits across all instances.

## Notes
- Replies stream when the Vercel Python runtime supports it for your plan; otherwise the full answer
  appears at once. It works either way.
- A single request can run up to 60 seconds (`maxDuration` in vercel.json).
- Never put the key in frontend code, GitHub, screenshots or chats. If it leaks, delete it in the Groq
  console and create a new one.

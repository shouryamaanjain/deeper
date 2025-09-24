# Vercel Deployment Guide — Deeper

This guide explains how to deploy Deeper on Vercel. Because Deeper uses long-running parallel research + SSE streaming, the recommended approach is:
- Frontend (web) on Vercel (static)
- Backend (server) on a persistent app host (Render/Railway/Fly/EC2/Heroku). Then configure a rewrite on Vercel to forward `/api/*` to your backend.

An experimental Vercel-only option (serverless/edge) is described at the end, but it may hit timeouts for long sessions.

---

## Option A (Recommended): Frontend on Vercel + Backend on persistent host

### 1) Deploy backend to a persistent host
- Choose a provider (Render, Railway, Fly.io, EC2, etc.).
- Build command: `bun install` (or `npm install`)
- Start command: `bun run dev` for dev, `bun run build && node dist/index.js` for prod.
- Port: use `PORT` env (default 8787).
- Env vars (Required):
  - `PARALLEL_API_KEY` (Parallel.ai)
  - `OPENAI_API_KEY` (OpenAI)
  - `PARALLEL_RPM` (default 30; increase only if your plan allows)
- Ensure the app is reachable, e.g., `https://deeper-backend.example.com`.

### 2) Deploy frontend to Vercel
Create a new Vercel project from this repository and set the project root to `web/`.
- Build Command: `bun run build` (or `npm run build`)
- Output Directory: `dist`
- Install Command: `bun install` (or `npm install`)

Alternatively, add a `vercel.json` in the repo root to control build:
```json
{
  "buildCommand": "cd web && bun install && bun run build",
  "outputDirectory": "web/dist"
}
```

### 3) Route `/api/*` from Vercel to your backend
Add a rewrite to `vercel.json` at the repo root:
```json
{
  "buildCommand": "cd web && bun install && bun run build",
  "outputDirectory": "web/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://deeper-backend.example.com/api/$1" }
  ]
}
```
- Replace `https://deeper-backend.example.com` with your backend URL.
- Redeploy the project to apply rewrites.

### 4) Security
- Do not set `PARALLEL_API_KEY` or `OPENAI_API_KEY` in the frontend (Vercel project for `web/`). Keys must only live on the backend host.

### 5) Testing
- Open your Vercel URL.
- Ensure Demo mode is toggled OFF in the UI.
- Start a research session. You should see live SSE updates flowing through the rewrite.

---

## Option B (Experimental): Backend as Vercel Serverless/Edge
Deeper’s backend uses long-lived SSE and multi-minute orchestration. Vercel serverless functions have execution time limits; Edge functions can stream SSE but require careful adaptation.

If you still want to try Vercel-only:
1) Port Express handlers to Vercel functions:
   - `api/research.ts` — start a session and queue work
   - `api/stream/[id].ts` — SSE endpoint (Node streaming or Edge runtime)
   - `api/session/[id]/pause.ts`, `resume.ts`, `export.json.ts`, `export.md.ts`
2) Use an external store (Redis/KV/Upstash/Prisma DB) for session state instead of in-memory maps.
3) Ensure your Parallel.ai + OpenAI calls complete within function time limits, or split work:
   - Short synchronous calls that stream progress to the client
   - Offload longer work to background queues (e.g., Upstash Q/Stochastic/Temporal), sending SSE heartbeats/status
4) Replace the Node OpenAI SDK with `fetch` on Edge where needed.
5) Test SSE reliability under Vercel’s networking.

This approach is advanced and typically unnecessary unless you require a single Vercel footprint.

---

## Troubleshooting
- 404s on `/api/*`: Verify `rewrites` are present in `vercel.json` and that your backend domain is correct.
- SSE doesn’t update: Ensure the backend supports SSE with proper headers and that your host allows long-lived connections. Some hosts need `keepalive` turned on.
- CORS: If you restrict CORS on the backend, allow your Vercel domain and enable SSE response headers. The current code uses permissive CORS by default.
- Rate limits: Default to `PARALLEL_RPM=30` as per Parallel Chat API docs. Increase only if your plan allows.

---

## Quick checklist
- [ ] Backend deployed on a persistent host with env vars set
- [ ] Frontend deployed on Vercel (root: `web/`) and builds to `dist`
- [ ] `vercel.json` contains `rewrites` for `/api/*` to backend URL
- [ ] Demo mode toggled OFF for live sessions
- [ ] Observe activity feed, sub-query progress, and final GPT-5 report

# Local Hosting Guide — Deeper

This guide walks you through running the Deeper frontend and backend locally with live streaming progress.

## Prerequisites
- Node.js 20+
- bun (recommended) or npm
- Parallel.ai API key
- OpenAI API key

## 1) Backend (server)
1. Open a terminal:
```
cd server
cp .env.example .env
```
2. Edit `.env` and fill:
```
PARALLEL_API_KEY=...      # from https://parallel.ai
OPENAI_API_KEY=...        # from https://platform.openai.com
PORT=8787                 # default
PARALLEL_RPM=30           # default rate limit per docs (raise only if your plan allows)
```
3. Install and run:
```
# with bun
bun i
bun run dev

# or with npm
yarn install # or npm install
npm run dev
```
The server will start on `http://localhost:8787`.

### Endpoints overview
- POST /api/research — start a session
- GET /api/stream/:id — Server-Sent Events for progress
- POST /api/session/:id/pause — pause
- POST /api/session/:id/resume — resume
- GET /api/history — list sessions
- GET /api/session/:id/export.json — export JSON
- GET /api/session/:id/export.md — export Markdown

## 2) Frontend (web) — dev mode with proxy
The UI expects the API at `/api/*`. In dev, we proxy to the backend.

1. In a new terminal:
```
cd web
bun i # or npm install
```
2. Optional: add a dev proxy to `vite.config.ts` (not committed by default). Add below the `plugins` and `resolve` keys:
```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss(), injectBuiltByScoutPlugin()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
})
```
3. Run the dev server:
```
bun run dev  # or npm run dev
```
Open `http://localhost:5173`. Toggle off “Demo mode” to use the live backend.

## 3) Local production build
You can also serve the built UI and point `/api/*` to the backend with an HTTP proxy (Caddy/Nginx/Traefik) if preferred.
```
cd web
bun run build  # or npm run build
# serve web/dist with your static server and proxy /api to http://localhost:8787
```

## 4) Troubleshooting
- CORS/SSE: The backend uses permissive CORS by default. If you harden CORS, allow the UI origin and enable SSE headers.
- Timeouts: Parallel.ai default is 30 RPM. Increase `PARALLEL_RPM` only if your plan supports it. 
- Keys: Never expose API keys to the browser; only set them server-side.
- Demo Mode: If the backend isn’t reachable, keep Demo mode on to verify UI flows.

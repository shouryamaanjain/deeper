# Deeper — Parallel Deep Research Agent

Deeper decomposes a single query into 5–10 sub-queries, researches them in parallel with Parallel.ai’s speed model, and synthesizes a comprehensive report via GPT-5. The UI shows rich real-time progress with SSE.

- Frontend: React + Vite + Tailwind + shadcn/ui (web/)
- Backend: Node + TypeScript + Express + SSE (server/)

## Documentation
- Local hosting guide: [docs/local-hosting.md](docs/local-hosting.md)
- Vercel deployment guide: [docs/vercel-deployment.md](docs/vercel-deployment.md)

## Quick start (root)

- npm install  # installs both workspaces (web and server)
- cd server && cp .env.example .env  # fill API keys
- npm run -w server dev  # start backend on 8787
- npm run -w web dev     # start frontend dev on 5173 (proxy /api → 8787)

## Live preview
A demo UI is included with “Demo mode” to simulate progress even without a backend.

## License
MIT
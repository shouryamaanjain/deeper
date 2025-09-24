import type { FastifyInstance } from "fastify";
import type { createOrchestrator } from "../orchestrator";

export async function registerSessionRoutes(app: FastifyInstance, orchestrator: ReturnType<typeof createOrchestrator>) {
  app.get("/health", async () => ({ ok: true }));

  app.post<{ Body: { query: string } }>("/sessions", async (req, res) => {
    const { query } = req.body;
    const { sessionId } = await orchestrator.createSession(query);
    return { sessionId };
  });

  app.post<{ Params: { id: string } }>("/sessions/:id/pause", async (req) => ({ ok: true, sessionId: req.params.id }));
  app.post<{ Params: { id: string } }>("/sessions/:id/resume", async (req) => ({ ok: true, sessionId: req.params.id }));
  app.post<{ Params: { id: string } }>("/sessions/:id/cancel", async (req) => ({ ok: true, sessionId: req.params.id }));
}

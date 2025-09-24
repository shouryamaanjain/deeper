import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server as IOServer } from "socket.io";
import { getLogger } from "@deeper/lib";
import { createParallelClient } from "./orchestrator/parallelClient";
import { createOrchestrator } from "./orchestrator";
import { registerSessionRoutes } from "./routes/sessions";
import { getEnv } from "./types/env";
import { Agent } from "undici";
import { setupGateway } from "./ws/gateway";

async function bootstrap() {
  const env = getEnv();
  const logger = getLogger();
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: false });

  const server = app.server; // Fastify's underlying Node server
  const io = new IOServer(server, { cors: { origin: env.WEB_ORIGIN } });

  const dispatcher = new Agent({ keepAliveTimeout: 10_000, keepAliveMaxTimeout: 30_000 });
  const parallel = createParallelClient(env.PARALLEL_API_KEY, "https://api.parallel.ai", dispatcher);
  const orchestrator = createOrchestrator(io, { research: parallel.streamResearch });
  setupGateway(io as any, orchestrator);

  await registerSessionRoutes(app, orchestrator);

  const port = Number(process.env.PORT || 4000);
  await app.listen({ port, host: "0.0.0.0" });
  logger.info(`API listening on :${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

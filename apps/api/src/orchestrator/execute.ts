import type { Server as IOServer } from "socket.io";
import type { ResearchSession, SubQuery, ParallelResponse } from "@deeper/shared-types";
import { ServerEvent } from "@deeper/shared-types";
import { forSession } from "./rateLimiter";
import { backoffDelay, shouldRetry } from "./retry";
import { Metrics } from "../analytics/metrics";

export async function executeSubQueries(
  io: IOServer,
  session: ResearchSession,
  subQueries: SubQuery[],
  deps: {
    research: (input: string, onDelta: (d: { textDelta?: string; preview?: string; citationsDelta?: number }) => void) => Promise<ParallelResponse>;
    redisUrl?: string;
  },
) {
  const room = `session:${session.id}`;
  const { global, session: sessLimiter } = forSession(session.id);

  await Promise.all(
    subQueries.map((sq) =>
      sessLimiter.schedule(async () =>
        global.schedule(async () => runOne(sq)).catch((e) => {
          // already handled
        }),
      ),
    ),
  );

  async function runOne(sq: SubQuery) {
    const maxAttempts = 3;
    let attempt = 0;
    let done = false;

    while (!done && attempt < maxAttempts) {
      attempt += 1;
      io.to(room).emit(ServerEvent.SubqueryUpdate, {
        sessionId: session.id,
        id: sq.id,
        status: attempt === 1 ? "researching" : "retrying",
      });
      try {
        let preview = sq.preview || "";
        let sourceCount = sq.sourceCount || 0;
        const response = await deps.research(sq.text, (d) => {
          if (d.preview) preview = d.preview;
          if (typeof d.citationsDelta === "number") sourceCount = d.citationsDelta;
          const progress = Math.min(95, Math.max(sq.progress, Math.floor(preview.length / 3)));
          io.to(room).emit(ServerEvent.SubqueryUpdate, {
            sessionId: session.id,
            id: sq.id,
            progress,
            preview,
            sourceCount,
          });
        });

        io.to(room).emit(ServerEvent.SubqueryCompleted, {
          sessionId: session.id,
          id: sq.id,
          response,
        });
        done = true;
      } catch (err: any) {
        const willRetry = shouldRetry(err) && attempt < maxAttempts;
        io.to(room).emit(ServerEvent.SubqueryFailed, {
          sessionId: session.id,
          id: sq.id,
          error: err?.message || String(err),
          willRetry,
          attempt,
        });
        Metrics.markFailure();
        if (!willRetry) break;
        Metrics.markRetry();
        const delay = backoffDelay(attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    io.to(room).emit(ServerEvent.SubqueryUpdate, {
      sessionId: session.id,
      id: sq.id,
      status: done ? "completed" : "failed",
      progress: done ? 100 : sq.progress,
    });
  }
}

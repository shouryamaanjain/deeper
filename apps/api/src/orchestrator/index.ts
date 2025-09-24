import type { Server as IOServer } from "socket.io";
import { nanoid } from "nanoid";
import type { ResearchSession, SubQuery } from "@deeper/shared-types";
import { ServerEvent } from "@deeper/shared-types";
import { decomposeQuery } from "./decompose";
import { executeSubQueries } from "./execute";
import { computeOverallProgress, nextStatus } from "./aggregator";
import { Metrics } from "../analytics/metrics";

export type OrchestratorDeps = {
  research: (input: string, onDelta: (d: { textDelta?: string; preview?: string; citationsDelta?: number }) => void) => Promise<any>;
};

export function createOrchestrator(io: IOServer, deps: OrchestratorDeps) {
  async function createSession(query: string) {
    const sessionId = nanoid();
    const createdAt = new Date().toISOString();

    const session: ResearchSession = {
      id: sessionId,
      query,
      createdAt,
      status: "analyzing",
      progress: 0,
      subQueries: [],
      metrics: { parallelCalls: 0, retries: 0, failures: 0 },
    };

    const room = `session:${sessionId}`;

    io.to(room).emit(ServerEvent.Activity, {
      sessionId,
      message: "Analyzing query complexity…",
      level: "info",
      timestamp: new Date().toISOString(),
    });

    io.to(room).emit(ServerEvent.SessionStatus, {
      sessionId,
      status: "analyzing",
      overallProgress: 0,
    });

    const subs: SubQuery[] = decomposeQuery(query);
    session.subQueries = subs;

    io.to(room).emit(ServerEvent.Activity, {
      sessionId,
      message: `Generated ${subs.length} sub-queries`,
      level: "success",
      timestamp: new Date().toISOString(),
    });

    for (const sq of subs) {
      io.to(room).emit(ServerEvent.SubqueryCreated, { sessionId, subQuery: sq });
    }

    io.to(room).emit(ServerEvent.SessionStatus, {
      sessionId,
      status: "executing",
      overallProgress: 0,
    });

    Metrics.markSessionCreated();

    // Fire and forget execution
    executeSubQueries(io, { ...session, status: "executing" }, subs, { research: deps.research }).then(() => {
      const overall = computeOverallProgress(subs);
      io.to(room).emit(ServerEvent.SessionStatus, {
        sessionId,
        status: "aggregating",
        overallProgress: overall,
      });
      io.to(room).emit(ServerEvent.Activity, {
        sessionId,
        message: "Aggregating results…",
        level: "info",
        timestamp: new Date().toISOString(),
      });
      io.to(room).emit(ServerEvent.SessionStatus, {
        sessionId,
        status: "complete",
        overallProgress: 100,
      });
      io.to(room).emit(ServerEvent.Activity, {
        sessionId,
        message: "Research complete",
        level: "success",
        timestamp: new Date().toISOString(),
      });
    });

    return { sessionId };
  }

  return { createSession };
}

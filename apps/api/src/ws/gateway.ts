import type { Server as IOServer, Socket } from "socket.io";
import { ClientEvent, ServerEvent, type ClientToServer, type ServerToClient } from "@deeper/shared-types";
import type { createOrchestrator } from "../orchestrator";

export function setupGateway(
  io: IOServer<any, any>,
  orchestrator: ReturnType<typeof createOrchestrator>,
) {
  const nsp: any = io.of("/research");

  nsp.on("connection", (socket: any) => {
    socket.on(ClientEvent.SessionCreate, async ({ query }: { query: string }) => {
      const { sessionId } = await orchestrator.createSession(query);
      const room = `session:${sessionId}`;
      socket.join(room);
      socket.emit(ServerEvent.Activity, {
        sessionId,
        message: "Session created",
        level: "success",
        timestamp: new Date().toISOString(),
      } as any);
      socket.emit(ServerEvent.SessionStatus, {
        sessionId,
        status: "decomposing",
        overallProgress: 0,
      } as any);
    });

    socket.on(ClientEvent.SessionPause, async ({ sessionId }: { sessionId: string }) => {
      const room = `session:${sessionId}`;
      socket.to(room).emit(ServerEvent.Activity, {
        sessionId,
        message: "Pause requested (stub)",
        level: "warning",
        timestamp: new Date().toISOString(),
      } as any);
    });

    socket.on(ClientEvent.SessionResume, async ({ sessionId }: { sessionId: string }) => {
      const room = `session:${sessionId}`;
      socket.to(room).emit(ServerEvent.Activity, {
        sessionId,
        message: "Resume requested (stub)",
        level: "info",
        timestamp: new Date().toISOString(),
      } as any);
    });

    socket.on(ClientEvent.SessionCancel, async ({ sessionId }: { sessionId: string }) => {
      const room = `session:${sessionId}`;
      socket.to(room).emit(ServerEvent.Activity, {
        sessionId,
        message: "Cancel requested (stub)",
        level: "error",
        timestamp: new Date().toISOString(),
      } as any);
    });
  });
}

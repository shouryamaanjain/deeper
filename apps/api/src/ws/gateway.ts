import type { Server as IOServer, Socket } from "socket.io";
import { ClientEvent, ServerEvent, type ClientToServer, type ServerToClient } from "@deeper/shared-types";
import type { createOrchestrator } from "../orchestrator";

export function setupGateway(
  io: IOServer<ClientToServer, ServerToClient>,
  orchestrator: ReturnType<typeof createOrchestrator>,
) {
  const nsp = io.of("/research");

  nsp.on("connection", (socket: Socket<ClientToServer, ServerToClient>) => {
    socket.on(ClientEvent.SessionCreate, async ({ query }) => {
      const { sessionId } = await orchestrator.createSession(query);
      const room = `session:${sessionId}`;
      socket.join(room);
      socket.emit(ServerEvent.Activity, {
        sessionId,
        message: "Session created",
        level: "success",
        timestamp: new Date().toISOString(),
      });
      socket.emit(ServerEvent.SessionStatus, {
        sessionId,
        status: "decomposing",
        overallProgress: 0,
      });
    });

    socket.on(ClientEvent.SessionPause, async ({ sessionId }) => {
      const room = `session:${sessionId}`;
      socket.to(room).emit(ServerEvent.Activity, {
        sessionId,
        message: "Pause requested (stub)",
        level: "warning",
        timestamp: new Date().toISOString(),
      });
    });

    socket.on(ClientEvent.SessionResume, async ({ sessionId }) => {
      const room = `session:${sessionId}`;
      socket.to(room).emit(ServerEvent.Activity, {
        sessionId,
        message: "Resume requested (stub)",
        level: "info",
        timestamp: new Date().toISOString(),
      });
    });

    socket.on(ClientEvent.SessionCancel, async ({ sessionId }) => {
      const room = `session:${sessionId}`;
      socket.to(room).emit(ServerEvent.Activity, {
        sessionId,
        message: "Cancel requested (stub)",
        level: "error",
        timestamp: new Date().toISOString(),
      });
    });
  });
}

/**
 * Socket.IO event names and payload contracts.
 * @packageDocumentation
 */
import type { ParallelResponse, SubQuery, ResearchSession } from "./models";

export enum ServerEvent {
  SessionStatus = "session_status",
  Activity = "activity",
  SubqueryCreated = "subquery_created",
  SubqueryUpdate = "subquery_update",
  SubqueryCompleted = "subquery_completed",
  SubqueryFailed = "subquery_failed",
}

export enum ClientEvent {
  SessionCreate = "session_create",
  SessionPause = "session_pause",
  SessionResume = "session_resume",
  SessionCancel = "session_cancel",
}

export type ServerToClient = {
  [ServerEvent.SessionStatus]: {
    sessionId: string;
    status: ResearchSession["status"];
    overallProgress: number;
  };
  [ServerEvent.Activity]: {
    sessionId: string;
    message: string;
    level: "info" | "success" | "warning" | "error";
    timestamp: string;
  };
  [ServerEvent.SubqueryCreated]: {
    sessionId: string;
    subQuery: SubQuery;
  };
  [ServerEvent.SubqueryUpdate]: {
    sessionId: string;
    id: string;
    status?: SubQuery["status"];
    progress?: number;
    etaSeconds?: number;
    sourceCount?: number;
    preview?: string;
  };
  [ServerEvent.SubqueryCompleted]: {
    sessionId: string;
    id: string;
    response: ParallelResponse;
  };
  [ServerEvent.SubqueryFailed]: {
    sessionId: string;
    id: string;
    error: string;
    willRetry: boolean;
    attempt: number;
  };
};

export type ClientToServer = {
  [ClientEvent.SessionCreate]: { query: string };
  [ClientEvent.SessionPause]: { sessionId: string };
  [ClientEvent.SessionResume]: { sessionId: string };
  [ClientEvent.SessionCancel]: { sessionId: string };
};

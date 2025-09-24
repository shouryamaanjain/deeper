"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { ClientToServer, ServerToClient } from "@deeper/shared-types";
import { ClientEvent, ServerEvent } from "@deeper/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type State = {
  sessionId?: string;
  status: string;
  overallProgress: number;
  subQueries: Array<{
    id: string;
    index: number;
    text: string;
    status: any;
    progress: number;
    etaSeconds?: number;
    sourceCount: number;
    preview?: string;
    attempts: number;
    errors: string[];
  }>;
  activity: { message: string; level: "info" | "success" | "warning" | "error"; timestamp: string }[];
};

const initial: State = { status: "idle", overallProgress: 0, subQueries: [], activity: [] };

type Action =
  | { type: "session"; id: string; status: string; progress: number }
  | { type: "activity"; msg: string; level: State["activity"][number]["level"]; ts: string }
  | { type: "sub_created"; sub: State["subQueries"][number] }
  | { type: "sub_update"; id: string; patch: Partial<State["subQueries"][number]> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "session":
      return { ...state, sessionId: action.id, status: action.status, overallProgress: action.progress };
    case "activity":
      return { ...state, activity: [{ message: action.msg, level: action.level, timestamp: action.ts }, ...state.activity].slice(0, 200) };
    case "sub_created":
      return { ...state, subQueries: [...state.subQueries, action.sub] };
    case "sub_update":
      return {
        ...state,
        subQueries: state.subQueries.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };
    default:
      return state;
  }
}

export function useSessionSocket() {
  const [state, dispatch] = useReducer(reducer, initial);
  const socketRef = useRef<Socket<ServerToClient, ClientToServer> | null>(null);

  useEffect(() => {
    const s = io<ServerToClient, ClientToServer>(`${API_URL}/research`, { transports: ["websocket"], withCredentials: false });
    socketRef.current = s as any;
    s.on(ServerEvent.SessionStatus, (p) => dispatch({ type: "session", id: p.sessionId, status: p.status, progress: p.overallProgress }));
    s.on(ServerEvent.Activity, (p) => dispatch({ type: "activity", msg: p.message, level: p.level, ts: p.timestamp }));
    s.on(ServerEvent.SubqueryCreated, (p) => dispatch({ type: "sub_created", sub: p.subQuery }));
    s.on(ServerEvent.SubqueryUpdate, (p) => dispatch({ type: "sub_update", id: p.id, patch: { status: p.status as any, progress: p.progress ?? 0, etaSeconds: p.etaSeconds, sourceCount: p.sourceCount ?? 0, preview: p.preview } }));
    s.on(ServerEvent.SubqueryCompleted, (p) => dispatch({ type: "sub_update", id: p.id, patch: { status: "completed", progress: 100 } }));
    s.on(ServerEvent.SubqueryFailed, (p) => dispatch({ type: "sub_update", id: p.id, patch: { status: "failed" } }));
    return () => {
      s.disconnect();
    };
  }, []);

  const startSession = useCallback((q: string) => {
    socketRef.current?.emit(ClientEvent.SessionCreate, { query: q });
  }, []);

  return { state, startSession };
}

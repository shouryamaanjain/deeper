import Redis from "ioredis";
import type { ResearchSession, SubQuery } from "@deeper/shared-types";

let redis: Redis | null = null;
const memSessions = new Map<string, ResearchSession>();

export function getRedis(url?: string) {
  if (!url) return null;
  if (redis) return redis;
  redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  return redis;
}

export async function saveSession(session: ResearchSession, url?: string) {
  const client = getRedis(url);
  if (!client) {
    memSessions.set(session.id, session);
    return;
  }
  await client.set(`session:${session.id}`, JSON.stringify(session), "EX", 60 * 60);
}

export async function getSession(sessionId: string, url?: string): Promise<ResearchSession | null> {
  const client = getRedis(url);
  if (!client) return memSessions.get(sessionId) ?? null;
  const raw = await client.get(`session:${sessionId}`);
  return raw ? (JSON.parse(raw) as ResearchSession) : null;
}

export async function updateSubQuery(
  sessionId: string,
  subQueryId: string,
  patch: Partial<SubQuery>,
  url?: string,
) {
  const s = await getSession(sessionId, url);
  if (!s) return;
  const idx = s.subQueries.findIndex((sq) => sq.id === subQueryId);
  if (idx === -1) return;
  s.subQueries[idx] = { ...s.subQueries[idx], ...patch } as SubQuery;
  await saveSession(s, url);
}

export async function setSessionStatus(
  sessionId: string,
  status: ResearchSession["status"],
  url?: string,
) {
  const s = await getSession(sessionId, url);
  if (!s) return;
  s.status = status;
  await saveSession(s, url);
}

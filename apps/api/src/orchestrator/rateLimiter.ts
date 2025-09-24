import Bottleneck from "bottleneck";

const globalLimiter = new Bottleneck({
  reservoir: 300,
  reservoirRefreshInterval: 60_000,
  reservoirRefreshAmount: 300,
  maxConcurrent: 25,
});

const sessionGroups = new Map<string, Bottleneck>();

export function forSession(sessionId: string) {
  let limiter = sessionGroups.get(sessionId);
  if (!limiter) {
    limiter = new Bottleneck({ maxConcurrent: 10 });
    sessionGroups.set(sessionId, limiter);
  }
  return { global: globalLimiter, session: limiter };
}

import Bottleneck from "bottleneck";

export type LimiterOptions = {
  reservoir?: number;
  reservoirRefreshInterval?: number;
  reservoirRefreshAmount?: number;
  maxConcurrent?: number;
};

let globalLimiter: Bottleneck | null = null;

export function getGlobalLimiter() {
  if (globalLimiter) return globalLimiter;
  globalLimiter = new Bottleneck({
    reservoir: 300,
    reservoirRefreshInterval: 60_000,
    reservoirRefreshAmount: 300,
    maxConcurrent: 25,
  });
  return globalLimiter;
}

export function sessionLimiter(sessionId: string, perSessionConcurrent = 10) {
  const limiter = new Bottleneck.Group({
    maxConcurrent: perSessionConcurrent,
    id: `session:${sessionId}`,
  });
  return limiter;
}

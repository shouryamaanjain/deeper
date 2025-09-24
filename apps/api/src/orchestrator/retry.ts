export function backoffDelay(attempt: number, baseMs = 500, factor = 2, maxMs = 10_000) {
  const exp = Math.min(maxMs, baseMs * Math.pow(factor, attempt));
  const jitter = Math.floor(Math.random() * Math.min(1000, exp * 0.1));
  return exp + jitter;
}

export function shouldRetry(err: any): boolean {
  if (!err) return false;
  const code = err.status ?? err.code ?? 0;
  const retryableCodes = [408, 409, 425, 429, 500, 502, 503, 504];
  if (typeof code === "number" && retryableCodes.includes(code)) return true;
  const msg = String(err.message || "").toLowerCase();
  return /econnreset|etimedout|timeout|rate limit|temporarily unavailable/.test(msg);
}

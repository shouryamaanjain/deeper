import type { ResearchSession, SubQuery } from "@deeper/shared-types";

export function computeOverallProgress(subQueries: SubQuery[]): number {
  if (!subQueries.length) return 0;
  const total = subQueries.reduce((acc, sq) => acc + sq.progress, 0);
  return Math.round((total / (subQueries.length * 100)) * 100);
}

export function nextStatus(session: ResearchSession): ResearchSession["status"] {
  const allDone = session.subQueries.every((s) => s.status === "completed" || s.status === "failed");
  if (allDone) return "aggregating";
  const anyActive = session.subQueries.some((s) => ["researching", "retrying"].includes(s.status));
  if (anyActive) return "executing";
  return session.status;
}

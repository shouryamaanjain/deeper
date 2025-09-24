/**
 * Core data models for the research agent.
 * @packageDocumentation
 */

/** A source/citation discovered during research. */
export type SourceCitation = {
  title: string;
  url: string;
  publisher?: string;
  published_at?: string;
  accessed_at?: string;
  snippet?: string;
  confidence?: number;
};

/** Structured model returned by Parallel.ai for a sub-query. */
export type ParallelResponse = {
  reasoning: string;
  answer: string;
  citations: SourceCitation[];
  confidence_score: number;
  rawStreamTokens?: number;
};

/** A single sub-query unit within a broader research session. */
export type SubQuery = {
  id: string;
  index: number;
  text: string;
  status: "queued" | "researching" | "retrying" | "completed" | "failed" | "paused";
  progress: number;
  etaSeconds?: number;
  sourceCount: number;
  preview?: string;
  response?: ParallelResponse;
  attempts: number;
  errors: string[];
};

/**
 * Research session container tracking overall progress and orchestration state.
 */
export type ResearchSession = {
  id: string;
  query: string;
  createdAt: string;
  status:
    | "idle"
    | "analyzing"
    | "decomposing"
    | "executing"
    | "aggregating"
    | "synthesizing"
    | "complete"
    | "failed"
    | "paused";
  progress: number;
  subQueries: SubQuery[];
  metrics: {
    startedAt?: string;
    endedAt?: string;
    elapsedMs?: number;
    parallelCalls: number;
    retries: number;
    failures: number;
  };
};

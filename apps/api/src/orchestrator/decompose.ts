import { nanoid } from "nanoid";
import type { SubQuery } from "@deeper/shared-types";

const MULTI_DOMAIN = /(economy|policy|science|health|education|technology|market|finance|law|ethics)/i;
const TIME_PHRASES = /(latest|recent|trend|trends|forecast|202\d|this year|quarter|month)/i;
const COMPARATIVE = /(\bvs\b|versus|compare|comparison|compared to)/i;
const TECH_DEPTH = /(architecture|algorithm|implementation|benchmark|scal(e|ability)|latency|throughput|vector|embedding|llm|transformer|dataset)/i;
const EXPERT_OPINION = /(analyst|expert|opinion|critique|review|consensus|survey)/i;

export function decomposeQuery(query: string): SubQuery[] {
  const baseCount = 5;
  let extras = 0;
  if (MULTI_DOMAIN.test(query)) extras += 1;
  if (TIME_PHRASES.test(query)) extras += 1;
  if (COMPARATIVE.test(query)) extras += 1;
  if (TECH_DEPTH.test(query)) extras += 1;
  if (EXPERT_OPINION.test(query)) extras += 1;
  const total = Math.max(5, Math.min(10, baseCount + extras));

  const templates = [
    (q: string) => `Give a concise, directly actionable answer to: ${q}`,
    (q: string) => `Provide necessary background and key definitions for: ${q}`,
    (q: string) => `Compare differing viewpoints or options related to: ${q}`,
    (q: string) => `Summarize the most recent developments (last 12 months) regarding: ${q}`,
    (q: string) => `Extract expert or analyst insights relevant to: ${q}`,
    (q: string) => `Outline industry-specific implications for: ${q}`,
    (q: string) => `Describe historical context and prior attempts for: ${q}`,
    (q: string) => `Discuss future outlook and potential risks for: ${q}`,
    (q: string) => `Validate claims and identify contradictions around: ${q}`,
    (q: string) => `List related topics and keywords to expand research on: ${q}`,
  ];

  const subQueries: SubQuery[] = Array.from({ length: total }).map((_, i) => ({
    id: nanoid(),
    index: i,
    text: templates[i % templates.length]!(query),
    status: "queued",
    progress: 0,
    sourceCount: 0,
    attempts: 0,
    errors: [],
  }));

  return subQueries;
}

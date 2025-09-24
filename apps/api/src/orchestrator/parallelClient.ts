import OpenAI from "openai";
import type { Agent } from "undici";
import { ParallelResearchResponseSchema } from "@deeper/shared-types";
import type { ParallelResponse } from "@deeper/shared-types";
import { Metrics } from "../analytics/metrics";

export function createParallelClient(apiKey: string, baseURL = "https://api.parallel.ai", dispatcher?: Agent) {
  const client = new OpenAI({ apiKey, baseURL, fetch: (url, init) => fetch(url, { ...(init || {}), dispatcher }) });

  async function streamResearch(input: string, onDelta: (delta: {
    textDelta?: string;
    preview?: string;
    citationsDelta?: number;
  }) => void): Promise<ParallelResponse> {
    Metrics.markParallelCall();
    // Using new Responses API with streaming events
    // @ts-ignore - stream typing is still evolving
    const stream = await client.responses.create({
      model: "speed",
      stream: true,
      input,
      response_format: { type: "json_schema", json_schema: ParallelResearchResponseSchema },
    });

    let reasoning = "";
    let answer = "";
    let citations: ParallelResponse["citations"] = [];
    let confidence = 0;

    // @ts-ignore
    for await (const event of stream) {
      // Types of events: response.output_text.delta, response.output_delta, response.completed
      // We attempt to build a preview from any text deltas observed.
      // @ts-ignore
      if (event.type === "response.output_text.delta") {
        const delta: string = event.delta || "";
        if (delta) {
          answer += delta;
          onDelta({ textDelta: delta, preview: answer.slice(0, 280) });
        }
      }
      // @ts-ignore
      if (event.type === "response.output_delta") {
        const output = event.output_delta?.[0]?.content?.[0];
        if (output?.type === "output_text.delta") {
          const d = output.delta as string;
          answer += d;
          onDelta({ textDelta: d, preview: answer.slice(0, 280) });
        }
        if (output?.type === "json_schema.delta") {
          // Try to extract partial JSON fields like citations as they arrive
          const fields = output.delta as any;
          if (Array.isArray(fields?.citations)) {
            citations = fields.citations;
            onDelta({ citationsDelta: citations.length });
          }
          if (typeof fields?.reasoning === "string") reasoning = fields.reasoning;
          if (typeof fields?.answer === "string") {
            answer = fields.answer;
            onDelta({ preview: answer.slice(0, 280) });
          }
          if (typeof fields?.confidence_score === "number") confidence = fields.confidence_score;
        }
      }
      // @ts-ignore
      if (event.type === "response.completed") {
        const out = event.response?.output?.[0];
        if (out?.content?.[0]?.type === "output_text") {
          answer = out.content[0].text || answer;
        }
        if (out?.content?.[0]?.type === "json_schema") {
          const js = out.content[0].json_schema as any;
          reasoning = js?.reasoning ?? reasoning;
          answer = js?.answer ?? answer;
          citations = js?.citations ?? citations;
          confidence = js?.confidence_score ?? confidence;
        }
      }
    }

    return { reasoning, answer, citations, confidence_score: confidence };
  }

  return { streamResearch };
}

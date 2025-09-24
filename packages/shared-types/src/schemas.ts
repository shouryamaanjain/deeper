/**
 * JSON schemas used for structured responses.
 * @packageDocumentation
 */

export const ParallelResearchResponseSchema = {
  name: "ParallelResearchResponse",
  schema: {
    type: "object",
    required: ["reasoning", "answer", "citations", "confidence_score"],
    properties: {
      reasoning: { type: "string" },
      answer: { type: "string" },
      citations: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "url"],
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            publisher: { type: "string" },
            published_at: { type: "string", format: "date-time" },
            snippet: { type: "string" },
          },
        },
      },
      confidence_score: { type: "number", minimum: 0, maximum: 1 },
    },
  },
} as const;

/**
 * Utilities for parsing incremental Server-Sent Events (SSE) JSON streams.
 */

export type PartialJsonHandler<T = unknown> = (obj: T) => void;

export function createSSEJsonParser<T = any>(onPartial: PartialJsonHandler<T>) {
  let buffer = "";
  return function feed(chunk: string | Uint8Array) {
    const str = typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
    buffer += str;
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const eventBlock = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of eventBlock.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]" || payload === "DONE") continue;
        try {
          const obj = JSON.parse(payload);
          onPartial(obj as T);
        } catch {
          // ignore partial fragments
        }
      }
    }
  };
}

/**
 * Builds a rolling preview string of the first N characters seen.
 */
export function rollingPreview(limit: number = 280) {
  let text = "";
  return {
    append(fragment: string) {
      if (!fragment) return text;
      text += fragment;
      if (text.length > limit) text = text.slice(0, limit);
      return text;
    },
    get() {
      return text;
    },
    reset() {
      text = "";
    },
  };
}

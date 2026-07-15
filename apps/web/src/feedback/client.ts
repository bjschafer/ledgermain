/**
 * Thin `fetch` wrapper over the Worker's `POST /api/feedback` — the I/O half of
 * the feedback feature, kept separate from the pure `model/feedback.ts` logic
 * (mirrors the `sync/client.ts` split). Takes an explicit `apiBase` so it never
 * reads config/env itself.
 */
import type { FeedbackRequest } from "../model/feedback.js";

export interface FeedbackResponse {
  ok: true;
  /** Link to the created GitHub issue, shown to the user on success. */
  url?: string;
  number?: number;
}

export class FeedbackError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "FeedbackError";
  }
}

export async function submitFeedback(
  apiBase: string,
  body: FeedbackRequest,
): Promise<FeedbackResponse> {
  const res = await fetch(`${apiBase}/api/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // The Worker returns `{ error }` for handled failures; fall back to status
    // text for anything unexpected.
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // Non-JSON body — keep the status-based message.
    }
    throw new FeedbackError(res.status, message);
  }
  return (await res.json()) as FeedbackResponse;
}

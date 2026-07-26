/**
 * Reading a request body with a hard size ceiling.
 *
 * Shared by every route that accepts a body, because `content-length` is a
 * *claim*, not a fact: a client may omit it entirely (chunked / HTTP2) or send
 * a non-numeric value, and either way a check like `Number(header) > MAX` waves
 * the request through to `request.json()`, which then buffers the whole thing.
 * The only trustworthy cap is one enforced while draining the stream.
 */

export class PayloadTooLargeError extends Error {}

/**
 * Read the request body as text, aborting the stream (never buffering
 * unbounded input in memory) the moment it exceeds `maxBytes` — the
 * workers-best-practices "stream large/unknown payloads" rule applied to a
 * body whose *expected* size is small but whose *actual* size is
 * client-controlled.
 */
export async function readBodyWithCap(request: Request, maxBytes: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let out = "";
  let total = 0;
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- stream chunks are inherently sequential
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      // oxlint-disable-next-line no-await-in-loop -- abort path, loop exits here
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

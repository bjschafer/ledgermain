import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";

import worker from "../src/index.js";
import { createSession } from "../src/session.js";

/**
 * Run one request through the Worker's exported `fetch` handler inside
 * Miniflare (vitest-pool-workers) — no deployed environment. `new Request()`
 * produces the DOM/outgoing `Request` shape (`CfProperties`), while
 * `ExportedHandlerFetchHandler` expects the incoming-request shape
 * (`IncomingRequestCfProperties`, which adds edge-only fields like `colo`);
 * the two are structurally incompatible so the runtime-accurate but
 * test-irrelevant cf metadata fields need one explicit cast here.
 */
export async function request(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const ctx = createExecutionContext();
  const incoming = new Request(input, init) as unknown as Request<
    unknown,
    IncomingRequestCfProperties
  >;
  const response = await worker.fetch(incoming, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

/** `request()` plus a freshly-minted session's bearer token for `ownerId`. */
export async function authedRequest(
  ownerId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await createSession(env.KV, ownerId);
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return request(`https://api.test${path}`, { ...init, headers });
}

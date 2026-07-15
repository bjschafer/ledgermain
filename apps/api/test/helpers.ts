import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { vi } from "vitest";

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

export interface FetchCall {
  input: RequestInfo | URL;
  init?: RequestInit;
}

/**
 * Replace the global `fetch` with a stub, recording each call. The Vitest 4
 * workers pool no longer ships `cloudflare:test`'s `fetchMock`, so outbound
 * requests (GitHub, Turnstile siteverify) are intercepted this way instead.
 * Pair with `vi.unstubAllGlobals()` in `afterEach`.
 */
export function stubFetch(respond: () => Promise<Response>): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return respond();
  });
  return calls;
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

# @pf1/api — Stage 5 persistence Worker

Cloudflare Worker implementing DESIGN.md §2.1 ("Cross-device sync — Level 1
for v1"): an account-scoped cloud store for opaque `CharacterDoc` blobs, with
optimistic-concurrency conflict detection. It is **dumb persistence only** —
it never computes, validates, or interprets game data. The only fields it
ever reads are the three envelope fields `CharacterDoc` already carries for
this purpose (`id`, `version`, `updatedAt`), plus writing a server-assigned
`ownerId`.

Deployed and live at `api.ledgermain.whizkid.dev` (two KV namespaces, the
custom-domain route, the Discord Application, and the `DISCORD_CLIENT_SECRET`
are all in place). The remaining opt-in step is client-side: the web app only
talks to this API when built with `VITE_API_URL` set — unset (the default)
keeps it in local-only mode. See Deploy steps for how the pieces fit and how to
redeploy.

## Architecture

- **Storage**: two Workers KV namespaces (`kv_namespaces` in
  `wrangler.jsonc`):
  - `KV` — session tokens (`session:<token>` → `{ ownerId, createdAt }`,
    30-day TTL) and short-lived Discord OAuth CSRF-state nonces
    (`oauthstate:<nonce>` → `redirect_uri`, 10-minute TTL).
  - `CHARACTERS` — one entry per document, keyed `<ownerId>::<docId>`, value
    = the raw `CharacterDoc` JSON. `version`/`updatedAt` are duplicated into
    the KV entry's `metadata` so listing a user's characters is a single
    `list({ prefix })` call — it never has to fetch/parse every blob.
- **Auth**: Discord OAuth (DESIGN §2.1 named GitHub OAuth or email
  magic-link; Discord was substituted for GitHub since the actual target
  audience — TTRPG players, not developers — overwhelmingly already has a
  Discord account, and it still needs no email-sending infra). Auth is a **bearer token**, not a
  cookie: after the OAuth callback, the session token is appended to the
  redirect URL's `#fragment` (never sent to a server/logged in a Referer),
  and the SPA is expected to move it into `localStorage` and send it back as
  `Authorization: Bearer <token>` on every API call. This sidesteps
  cross-origin cookie/`SameSite` complexity entirely, since the web app and
  this API are almost certainly deployed to different origins.
- **Concurrency**: `PUT /api/characters/:id` requires the pushed `version` to
  be strictly greater than whatever's currently stored (or nothing stored
  yet). A stale push gets `409` with the currently-stored document in the
  body, so the client can implement DESIGN §2.1's "a newer version exists on
  another device — reload?" prompt (or let the user force-overwrite by
  re-pushing with a bumped version).

## Routes

| Route                                           | Auth   | Notes                                                                                                                                    |
| ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/discord/start?redirect_uri=<origin>` | none   | 302 → Discord's OAuth consent screen. `redirect_uri` must match one of `ALLOWED_APP_ORIGINS` (origin match) or this 400s.                |
| `GET /auth/discord/callback?code&state`         | none   | Exchanges the code, mints a session, 302s to `<redirect_uri>#session=<token>`.                                                           |
| `POST /auth/logout`                             | bearer | Deletes the session.                                                                                                                     |
| `GET /api/me`                                   | bearer | `{ ownerId }` or 401.                                                                                                                    |
| `GET /api/characters`                           | bearer | `{ characters: [{ id, version, updatedAt }] }` — envelope only.                                                                          |
| `GET /api/characters/:id`                       | bearer | Full document JSON, or 404.                                                                                                              |
| `PUT /api/characters/:id`                       | bearer | Body = full `CharacterDoc`. 400 on bad JSON/shape, 413 over 2 MB, 409 on a stale `version`, 200 `{ id, version, updatedAt }` on success. |
| `DELETE /api/characters/:id`                    | bearer | 204, idempotent.                                                                                                                         |
| `POST /api/feedback`                            | none   | In-app feedback → opens a GitHub issue as the App bot. Turnstile-gated + per-IP rate-limited. 201 `{ ok, url, number }`. See below.     |

CORS: `ALLOWED_APP_ORIGINS` (comma-separated, exact origin match — never
`*`) gates both the OAuth `redirect_uri` and the `Access-Control-Allow-Origin`
reflected on every response.

## Local development

```bash
bun install                 # from the repo root
cd apps/api
cp .dev.vars.example .dev.vars   # then paste a real DISCORD_CLIENT_SECRET if testing OAuth end-to-end
bun run dev                 # wrangler dev — Miniflare, local KV, no account needed
```

Hitting the CRUD routes locally doesn't need a real Discord OAuth app — mint
a session directly against local KV (e.g. via `wrangler kv key put --local`)
or, easier, exercise the routes through the test suite below. Exercising the
`/auth/discord/*` routes end-to-end **does** need a real Discord Application
(see Deploy steps) since they call `discord.com` directly, even in local dev.

### Tests

```bash
bun run test                 # from apps/api/, or from the repo root: bun run test
```

This runs `vitest run` against `@cloudflare/vitest-pool-workers` — the
Worker's routes run for real inside Miniflare, not a plain Node mock. It is
**not** `bun test` (bun's runner doesn't know how to boot a Workers
runtime); the root `bun run test` script (`bun run --filter '*' test`) picks
this package's `test` script up automatically since it just shells out to
each workspace package's own script, so no root-level wiring was needed.

```bash
bun run typecheck            # tsc --noEmit; included automatically in the root's `bun run typecheck`
```

## Deploy steps

The Worker is already deployed and live. The KV namespaces,
`ALLOWED_APP_ORIGINS`, custom-domain route (`api.ledgermain.whizkid.dev`,
sibling to `apps/web`'s `ledgermain.whizkid.dev`), Discord Application, and
`DISCORD_CLIENT_SECRET` are all in place. This section records how the pieces
fit — for reference, a fresh redeploy, or a forker standing up their own copy.
Steps 1–2 are the Cloudflare-account/Discord setup (done once); a routine
redeploy is just `wrangler deploy`.

1. **Register a Discord Application** (discord.com/developers/applications →
   New Application → OAuth2 tab):
   - Add a redirect: `https://api.ledgermain.whizkid.dev/auth/discord/callback`
     (must match exactly, including scheme/host/path — Discord rejects any
     mismatch at the authorize step, not just the token exchange).
   - Copy the **Client ID** (not secret — OAuth client ids are public) and
     paste it into `wrangler.jsonc`'s `vars.DISCORD_CLIENT_ID`.
   - Copy the **Client Secret** and set it with
     `wrangler secret put DISCORD_CLIENT_SECRET` — run this yourself,
     interactively, from a terminal you trust; never paste the secret into
     a file, another CLI's argument list, or an agent transcript.
2. **Deploy**: `wrangler deploy` (from `apps/api/`).
3. **Wire the web app** — set `apps/web`'s API-base env var (`VITE_API_URL`,
   see `apps/web/src/sync/config.ts`) to `https://api.ledgermain.whizkid.dev`.
   This is a **build-time** value: Vite inlines `import.meta.env.VITE_API_URL`
   when `vite build` runs, so it must be present in the build environment, not
   the runtime one. For the auto-deploy (Workers Builds on push to `main`),
   set it as a **Build variable** in the Cloudflare dashboard: the
   `ledgermain` Worker → **Settings → Build → Build variables and secrets** →
   add `VITE_API_URL=https://api.ledgermain.whizkid.dev`, then re-run the
   latest build (or push a commit) so the next bundle picks it up. It is
   deliberately **not** committed and **not** in `wrangler.jsonc`: wrangler
   `vars` are runtime bindings (wrong layer — the bundle is already frozen by
   the time the Worker runs), and keeping it out of the repo means a forker's
   build defaults to safe local-only mode. Leaving it unset keeps the app in
   local-only mode — the intended default (see that module's doc comment).
   (For a one-off _manual_ deploy from a laptop, instead run
   `VITE_API_URL=https://api.ledgermain.whizkid.dev bun run --filter @pf1/web build`
   then `wrangler deploy` from `apps/web/`.)

## In-app feedback (`POST /api/feedback`)

Lets anyone using the app — no GitHub account, no exposed email — send feedback
(a missing feat, a wrong number, a bug) straight from the UI. The Worker opens a
GitHub issue **as a GitHub App bot**, so reports never appear authored by the
owner's account, and the only durable credential is the App's private key.

Defense in depth for the one public, unauthenticated write:

- **Cloudflare Turnstile** — the primary gate. The client mints a token from the
  widget; the Worker verifies it server-side (`src/turnstile.ts`) and asserts the
  solving `hostname` is one of `ALLOWED_APP_ORIGINS`. This is the strongest
  practical "came from our app" signal — a public browser endpoint can't _prove_
  its caller (anything the client holds is visible in devtools), but this makes
  scripted abuse defeat a CAPTCHA per submit rather than curl a URL.
- **Per-IP rate limit** (KV, coarse) — a burst backstop, not the main defense.
- **Envelope validation** — category enum, message length — before any of the
  above runs. Free text is mention-neutralized before it lands in the issue.

Until configured the endpoint fails closed (verification/issue creation error,
never a silent open), and the web app hides the feedback button entirely unless
both `VITE_API_URL` **and** `VITE_TURNSTILE_SITEKEY` are set at build time.

### One-time owner setup

1. **Create a Turnstile widget** (Cloudflare dashboard → Turnstile → Add):
   - Add the app's hostnames (`ledgermain.whizkid.dev`, and `localhost` for dev).
   - Copy the **Site Key** → set it as the web build var `VITE_TURNSTILE_SITEKEY`
     (same place as `VITE_API_URL`: Workers Builds → the `ledgermain` Worker →
     Settings → Build → Build variables). The site key is public.
   - Copy the **Secret Key** → `wrangler secret put TURNSTILE_SECRET` (from
     `apps/api/`), interactively, from a terminal you trust.
2. **Register a GitHub App** (github.com/settings/apps → New GitHub App):
   - Permissions: **Repository → Issues: Read & write** (nothing else).
   - Uncheck "Active" under Webhook (this App is pull-only; no events needed).
   - Note the **App ID** → `wrangler.jsonc` `vars.GITHUB_APP_ID`.
   - **Generate a private key** (downloads a PKCS#1 `.pem`). WebCrypto needs
     PKCS#8, so convert once:
     ```bash
     openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
       -in app-private-key.pem -out app-private-key-pkcs8.pem
     ```
     Then `wrangler secret put GITHUB_APP_PRIVATE_KEY` and paste the whole PKCS#8
     PEM (BEGIN/END lines included).
   - **Install the App** on `bjschafer/ledgermain` (App → Install App → pick the
     repo). Open the installation and copy the **installation id** from its URL
     (`.../installations/<id>`) → `wrangler.jsonc` `vars.GITHUB_APP_INSTALLATION_ID`.
3. _(Optional)_ Create a `feedback` label on the repo — the Worker tags issues
   with it best-effort; unknown labels are silently dropped on issue creation, so
   nothing breaks if it's absent, the label just won't stick until it exists.
4. **Deploy**: `wrangler deploy` (from `apps/api/`), then rebuild the web app so
   the new `VITE_TURNSTILE_SITEKEY` is inlined.

After `wrangler.jsonc` changes, regenerate the binding types with
`bun run cf-typegen` (from `apps/api/`) and commit the updated
`worker-configuration.d.ts`.

## Observability

Two separate Cloudflare Workers back this project, and only one of them runs
code worth instrumenting:

- **`ledgermain`** (`apps/web`) — a **static-assets Worker** (no `main`; serves
  the built SPA from `./dist`). No server logic executes, so there is nothing to
  log or trace beyond Cloudflare's free built-in HTTP metrics (requests, errors,
  bandwidth, cache) in the dashboard. App-level errors happen in the browser and
  never reach Cloudflare; seeing them would require shipping data off-device
  (i.e. client tracking), deliberately not done. If page-level numbers are ever
  wanted, **Cloudflare Web Analytics** (cookieless, first-party) is the
  privacy-respecting option — it reports page views / Core Web Vitals, not app
  errors.
- **`ledgermain-api`** (this Worker) — where all the logic and all the
  instrumentation live.

For this Worker:

- **Logs** — `observability.enabled` is on at 100% sampling in `wrangler.jsonc`,
  so invocation logs and exceptions are captured with no extra work. Live-tail
  with `wrangler tail` (from `apps/api/`), or browse/search them under
  **Workers → ledgermain-api → Observability** in the dashboard. Unhandled
  exceptions are logged as structured JSON (`{ level, event, route, method,
message, stack }`, see `src/index.ts`) so they filter by `event`/`route`
  instead of a free-text grep.
- **Usage / health metrics** — every request writes one PII-free
  [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
  data point (`src/analytics.ts`): route label, method, status, and duration.
  No `ownerId`, session token, document id, or body is ever recorded — the raw
  pathname (which carries the opaque docId) is never written. Query it with SQL
  via the [Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/),
  e.g. request volume and error rate per route:

  ```sql
  SELECT blob1 AS route, blob3 AS status, count() AS n, avg(double1) AS avg_ms
  FROM ledgermain_api_requests
  WHERE timestamp > NOW() - INTERVAL '1' DAY
  GROUP BY route, status
  ORDER BY n DESC
  ```

  The dataset (`ledgermain_api_requests`) is created on first write after
  deploy — no provisioning step. Sync-conflict rate falls out of this for free
  (`route = 'characters.put' AND status = '409'`).

## Deliberately out of scope for v1 (see DESIGN §2.1)

- **Live mirror (Level 2)** and **CRDT concurrent editing (Level 3)** — both
  deferred; they'd reuse a Durable Object per session rather than this
  request/response KV model, so this Worker's shape doesn't block them.
- **Party/GM real-time sync** — same DO-based follow-on.
- Any server-side game-rules logic. If a future change makes this Worker
  compute or interpret anything beyond the envelope fields above, that
  change violates the project's one non-negotiable rule (see root
  `CLAUDE.md` / DESIGN.md §2).

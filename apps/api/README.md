# @pf1/api — Stage 5 persistence Worker

Cloudflare Worker implementing DESIGN.md §2.1 ("Cross-device sync — Level 1
for v1"): an account-scoped cloud store for opaque `CharacterDoc` blobs, with
optimistic-concurrency conflict detection. It is **dumb persistence only** —
it never computes, validates, or interprets game data. The only fields it
ever reads are the three envelope fields `CharacterDoc` already carries for
this purpose (`id`, `version`, `updatedAt`), plus writing a server-assigned
`ownerId`.

Deployed and live at `api.ledgermain.whizkid.dev` (three KV namespaces, the
custom-domain route, the Discord Application, and the `DISCORD_CLIENT_SECRET`
are all in place). The remaining opt-in step is client-side: the web app only
talks to this API when built with `VITE_API_URL` set — unset (the default)
keeps it in local-only mode. See Deploy steps for how the pieces fit and how to
redeploy.

## Architecture

- **Storage**: three Workers KV namespaces (`kv_namespaces` in
  `wrangler.jsonc`), split by what the data _is_. `KV` holds only regenerable
  operational state and can be cleared wholesale in an incident; the other two
  hold data a user gave us, and can't.
  - `KV` — session tokens (`session:<token>` → `{ ownerId, createdAt }`,
    30-day TTL) and their reverse index
    (`ownersession::<ownerId>::<token>`, same TTL, empty value — the key name
    is the record), which is what makes "sign out everywhere" expressible at
    all: a token-keyed entry can only be revoked by whoever already holds the
    token. Short-lived Discord OAuth CSRF-state nonces
    live here too (`oauthstate:<nonce>` → `redirect_uri`, 10-minute TTL),
    along with the cached GitHub installation token and the rate-limit
    counters (`feedback:rl:<ip>`, `charput:rl:<ownerId>`).
  - `CHARACTERS` — one entry per document, keyed `<ownerId>::<docId>`, value
    = the raw `CharacterDoc` JSON. `version`/`updatedAt` are duplicated into
    the KV entry's `metadata` so listing a user's characters is a single
    `list({ prefix })` call — it never has to fetch/parse every blob.
  - `FEEDBACK_CONTACTS` — the contact handle a feedback submission opted to
    leave, keyed by the opaque `ref` printed in the public issue, 180-day TTL.
    The handle is deliberately **never** written into the issue: that tracker
    is public, and GitHub keeps issue-body edit history readable, so an address
    posted there could not be taken back by editing it out. Readable only by
    the account named in `vars.OWNER_ID` (see `src/feedbackContacts.ts`).
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
- **Limits**: three, all envelope-level. 2 MB per document; **100 live
  documents per owner** (checked only when a new id appears, so a player at
  the cap can still edit everything they already have); and **240 writes per
  owner per hour**, counted in KV before the body is read so a caller over
  budget never gets to stream at us. The window slides — a client that keeps
  hammering stays out until it goes quiet — and none of these is a security
  boundary, only a bound on what one account can cost. See `src/rateLimit.ts`.

## Routes

| Route                                           | Auth   | Notes                                                                                                                                                                                           |
| ----------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/discord/start?redirect_uri=<origin>` | none   | 302 → Discord's OAuth consent screen. `redirect_uri` must match one of `ALLOWED_APP_ORIGINS` (origin match) or this 400s.                                                                       |
| `GET /auth/discord/callback?code&state`         | none   | Exchanges the code, mints a session, 302s to `<redirect_uri>#session=<token>`.                                                                                                                  |
| `POST /auth/logout`                             | bearer | Deletes the session.                                                                                                                                                                            |
| `POST /auth/logout-all`                         | bearer | Sign out everywhere: revokes every session this owner holds, the caller's included. `{ revoked }`.                                                                                              |
| `GET /api/me`                                   | bearer | `{ ownerId }` or 401.                                                                                                                                                                           |
| `DELETE /api/me`                                | bearer | Account purge: deletes every document, tombstone and session. Bounded per call, so repeat until `complete`. `{ deleted, complete, sessionsRevoked }`.                                           |
| `GET /api/me/export`                            | bearer | Every owned document as one streamed JSON file (`{ ownerId, exportedAt, characters }`).                                                                                                         |
| `GET /api/characters`                           | bearer | `{ characters: [{ id, version, updatedAt }] }` — envelope only.                                                                                                                                 |
| `GET /api/characters/:id`                       | bearer | Full document JSON, or 404.                                                                                                                                                                     |
| `PUT /api/characters/:id`                       | bearer | Body = full `CharacterDoc`. 400 on bad JSON/shape, 413 over 2 MB, 429 over the write limit, 403 at the 100-document cap, 409 on a stale `version`, 200 `{ id, version, updatedAt }` on success. |
| `DELETE /api/characters/:id`                    | bearer | 204, idempotent.                                                                                                                                                                                |
| `POST /api/feedback`                            | none   | In-app feedback → opens a GitHub issue as the App bot. Turnstile-gated + per-IP rate-limited. 201 `{ ok, url, number }`. See below.                                                             |

CORS: `ALLOWED_APP_ORIGINS` (comma-separated, exact origin match — never
`*`) gates both the OAuth `redirect_uri` and the `Access-Control-Allow-Origin`
reflected on every response — and, via the bare hostnames, the Turnstile
"solved on our site" assertion.

Because that one list carries all three jobs, it holds **production origins
only**: a `localhost` entry would let anyone host a page on their own machine
with our public sitekey, solve the challenge, and pass the feedback endpoint's
hostname check — and would make a plain-HTTP origin a valid delivery target for
a real session token. Local dev supplies its own value in `.dev.vars`, which
replaces (not merges with) the deployed one; the test suite pins its own in
`vitest.config.ts`.

## Account operations

Two whole-account routes that the per-character CRUD can't express. Both are
scoped by the session alone: there is no admin path, no impersonation, and no
way to name another owner in a request.

- **`GET /api/me/export`** — every document the owner has, as one JSON file.
  Streamed rather than assembled: 100 documents of up to 2 MB each is well past
  what a Worker may hold at once. The stored blobs are already JSON _text_, so
  they're spliced in verbatim without a parse/re-serialize round trip — which
  also keeps this route from so much as looking at the data it copies.
- **`DELETE /api/me`** — the purge. Deletes documents, tombstones, and then
  every session. Sessions go last so the caller can finish their own purge, and
  no tombstones are written for the deletions: a tombstone exists to tell
  another _signed-in_ device that a character is gone, and there is nobody left
  to tell. Bounded at 300 keys per call (tombstones aren't capped the way live
  documents are, so the work can exceed one invocation's subrequest budget) and
  idempotent, so the client repeats until the response says `complete`.

Deleting a character deliberately does **not** cascade anywhere yet — there is
nothing else keyed to a document. Anything added later that is (read-only share
links, #174) has to be deleted by both the per-character delete and this purge.

## Local development

```bash
bun install                 # from the repo root
cd apps/api
cp .dev.vars.example .dev.vars   # then paste a real DISCORD_CLIENT_SECRET if testing OAuth end-to-end
bun run dev                 # wrangler dev — Miniflare, local KV, no account needed
```

The `.dev.vars` copy is no longer optional: it carries the localhost
`ALLOWED_APP_ORIGINS` that the deployed config deliberately omits, so without it
a browser calling this Worker from `localhost:5173` gets no CORS headers.

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
2. **Name the owner** — set `wrangler.jsonc`'s `vars.OWNER_ID` to your own
   `discord:<user id>` (Discord → Settings → Advanced → Developer Mode, then
   right-click your name → Copy User ID). This is the only account that can
   read a stored feedback contact handle via
   `GET /api/feedback/contact/<ref>`; an empty value fails closed, so a fork
   that skips this step exposes no handles rather than all of them. Not a
   secret, hence a `var` and not `wrangler secret put`: holding the id grants
   nothing without a session for that account.
3. **Deploy**: `wrangler deploy` (from `apps/api/`).
4. **Wire the web app** — set `apps/web`'s API-base env var (`VITE_API_URL`,
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

The submitter's side of that bargain: the optional contact handle they leave is
the one field that never reaches the issue. It goes to the `FEEDBACK_CONTACTS`
namespace and the issue carries only a ref, which the owner trades for the
handle at `GET /api/feedback/contact/<ref>`. Their character is attached only
when they tick the box, and the form says so.

Defense in depth for the one public, unauthenticated write:

- **Cloudflare Turnstile** — the primary gate. The client mints a token from the
  widget; the Worker verifies it server-side (`src/turnstile.ts`) and asserts the
  solving `hostname` is one of `ALLOWED_APP_ORIGINS`. This is the strongest
  practical "came from our app" signal — a public browser endpoint can't _prove_
  its caller (anything the client holds is visible in devtools), but this makes
  scripted abuse defeat a CAPTCHA per submit rather than curl a URL.
- **Per-IP rate limit** (KV, coarse) — a burst backstop, not the main defense.
- **Envelope validation** — category enum, message length, and a streamed body
  cap (never `content-length`, which a caller may omit or fake) — before any of
  the above runs. Free text is stripped of GitHub's autolink sigils (`@name`
  mentions, `#123` issue refs) so a submission can't make the bot notify people
  or repos it wasn't aimed at, and quoted text goes in a fence sized to be
  unclosable by its own content.

Until configured the endpoint fails closed (verification/issue creation error,
never a silent open), and the web app hides the feedback button entirely unless
both `VITE_API_URL` **and** `VITE_TURNSTILE_SITEKEY` are set at build time.

### One-time owner setup

1. **Create a Turnstile widget** (Cloudflare dashboard → Turnstile → Add):
   - Add `ledgermain.whizkid.dev`, and **only** that. Listing `localhost` would
     let anyone serve a page from their own machine under this sitekey, solve
     the challenge there, and produce a token whose reported hostname the Worker
     can't distinguish from a real one — which is the whole basis of the
     endpoint's "came from our app" check. Local dev doesn't need it: the
     feedback button is hidden unless `VITE_TURNSTILE_SITEKEY` is set at build
     time, which a dev build normally leaves unset.
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

### Alerting

Logs and metrics answer "what happened" once you go looking. Alerting is the
part that makes you look. It is **Cloudflare dashboard configuration, not repo
code** — there is nothing here to deploy, which is exactly why it's written
down:

1. **Error rate** — Cloudflare dashboard → **Notifications → Add** → _Workers_
   → **Worker Errors**. Scope it to `ledgermain-api` and pick the account
   owner's email as the destination. This fires on the Worker's own 5xx/exception
   rate, which is what `src/index.ts`'s catch-all turns every unhandled throw
   into, so it covers the whole route table without per-route wiring.
2. **Uptime** — dashboard → **Traffic → Health Checks** (or Notifications →
   _Health Check Status_) against `https://api.ledgermain.whizkid.dev/api/me`.
   That route needs no secrets, no KV write, and returns a flat `401` when
   unauthenticated, so an unauthenticated probe expecting `401` proves the
   Worker is routing and executing. Expecting `200` somewhere would need a
   live session in the probe, which is a credential nobody should mint for a
   health check.
3. **Client crashes** — deliberately **not** automatic. See below.

**Automatic client-side crash reporting is declined.** Shipping unattended
stack traces off a player's device is telemetry, and this project doesn't do
telemetry (same reasoning as `apps/web` above: app-level errors happen in the
browser and are never sent anywhere). What ships instead is a **Send a report**
button on the crash screen (`apps/web/src/components/ErrorBoundary.tsx`), which
opens the ordinary feedback form pre-filled with the error and the React
component stack. It goes through `POST /api/feedback` like any other
submission — Turnstile and all — because it _is_ one: a player read it and
pressed send. That keeps the white-screen report actionable without making the
app phone home.

## Deliberately out of scope for v1 (see DESIGN §2.1)

- **Short session TTLs with silent refresh.** A refresh-token dance buys a
  smaller revocation window, but `POST /auth/logout-all` already closes the
  window on demand, and the whole auth story here is "a random token in
  localStorage" precisely so there is nothing clever to get wrong. A
  single-player sheet doesn't earn a second credential lifecycle.
- **Automatic client crash reporting** — see the Alerting section above.
- **Live mirror (Level 2)** and **CRDT concurrent editing (Level 3)** — both
  deferred; they'd reuse a Durable Object per session rather than this
  request/response KV model, so this Worker's shape doesn't block them.
- **Party/GM real-time sync** — same DO-based follow-on.
- Any server-side game-rules logic. If a future change makes this Worker
  compute or interpret anything beyond the envelope fields above, that
  change violates the project's one non-negotiable rule (see root
  `CLAUDE.md` / DESIGN.md §2).

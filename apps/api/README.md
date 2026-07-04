# @pf1/api — Stage 5 persistence Worker

Cloudflare Worker implementing DESIGN.md §2.1 ("Cross-device sync — Level 1
for v1"): an account-scoped cloud store for opaque `CharacterDoc` blobs, with
optimistic-concurrency conflict detection. It is **dumb persistence only** —
it never computes, validates, or interprets game data. The only fields it
ever reads are the three envelope fields `CharacterDoc` already carries for
this purpose (`id`, `version`, `updatedAt`), plus writing a server-assigned
`ownerId`.

This package was built entirely with local `wrangler dev` / Miniflare
verification — **no Cloudflare account resources were created**, nothing
was deployed. Everything below marked "the owner must" is a step nobody but
the account owner should do from this worktree.

## Architecture

- **Storage**: two Workers KV namespaces (`kv_namespaces` in
  `wrangler.jsonc`):
  - `KV` — session tokens (`session:<token>` → `{ ownerId, createdAt }`,
    30-day TTL) and short-lived GitHub OAuth CSRF-state nonces
    (`oauthstate:<nonce>` → `redirect_uri`, 10-minute TTL).
  - `CHARACTERS` — one entry per document, keyed `<ownerId>::<docId>`, value
    = the raw `CharacterDoc` JSON. `version`/`updatedAt` are duplicated into
    the KV entry's `metadata` so listing a user's characters is a single
    `list({ prefix })` call — it never has to fetch/parse every blob.
- **Auth**: GitHub OAuth (DESIGN §2.1 named GitHub OAuth or email
  magic-link; GitHub was simpler — no email-sending infra, and the target
  users already have GitHub accounts). Auth is a **bearer token**, not a
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

| Route                                          | Auth   | Notes                                                                                                                                    |
| ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/github/start?redirect_uri=<origin>` | none   | 302 → GitHub's OAuth consent screen. `redirect_uri` must match one of `ALLOWED_APP_ORIGINS` (origin match) or this 400s.                 |
| `GET /auth/github/callback?code&state`         | none   | Exchanges the code, mints a session, 302s to `<redirect_uri>#session=<token>`.                                                           |
| `POST /auth/logout`                            | bearer | Deletes the session.                                                                                                                     |
| `GET /api/me`                                  | bearer | `{ ownerId }` or 401.                                                                                                                    |
| `GET /api/characters`                          | bearer | `{ characters: [{ id, version, updatedAt }] }` — envelope only.                                                                          |
| `GET /api/characters/:id`                      | bearer | Full document JSON, or 404.                                                                                                              |
| `PUT /api/characters/:id`                      | bearer | Body = full `CharacterDoc`. 400 on bad JSON/shape, 413 over 2 MB, 409 on a stale `version`, 200 `{ id, version, updatedAt }` on success. |
| `DELETE /api/characters/:id`                   | bearer | 204, idempotent.                                                                                                                         |

CORS: `ALLOWED_APP_ORIGINS` (comma-separated, exact origin match — never
`*`) gates both the OAuth `redirect_uri` and the `Access-Control-Allow-Origin`
reflected on every response.

## Local development

```bash
bun install                 # from the repo root
cd apps/api
cp .dev.vars.example .dev.vars   # then paste a real GITHUB_CLIENT_SECRET if testing OAuth end-to-end
bun run dev                 # wrangler dev — Miniflare, local KV, no account needed
```

Hitting the CRUD routes locally doesn't need a real GitHub OAuth app — mint
a session directly against local KV (e.g. via `wrangler kv key put --local`)
or, easier, exercise the routes through the test suite below. Exercising the
`/auth/github/*` routes end-to-end **does** need a real GitHub OAuth App
(see Deploy steps) since they call `github.com` directly, even in local dev.

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

## Deploy steps (the owner does these — never done from this worktree)

1. **Create the KV namespaces**:
   ```bash
   wrangler kv namespace create KV
   wrangler kv namespace create CHARACTERS
   ```
   Paste the returned ids into `wrangler.jsonc`'s `kv_namespaces[].id`
   (replacing the `REPLACE_ME_*` placeholders).
2. **Register a GitHub OAuth App** (github.com → Settings → Developer
   settings → OAuth Apps → New OAuth App):
   - Homepage URL: the deployed web app's origin.
   - Authorization callback URL: `https://<this-worker's-domain>/auth/github/callback`.
   - Paste the Client ID into `wrangler.jsonc`'s `vars.GITHUB_CLIENT_ID` (not
     secret — OAuth client ids are public).
   - Set the Client Secret: `wrangler secret put GITHUB_CLIENT_SECRET`
     (interactive prompt — never pass it as a CLI argument).
3. **Set `ALLOWED_APP_ORIGINS`** in `wrangler.jsonc` `vars` to the deployed
   web app's real origin(s) (comma-separated if more than one, e.g. a
   preview + production URL).
4. **Choose a domain/route** for this Worker — a `workers.dev` subdomain
   works out of the box; add a `routes`/custom-domain entry (mirroring
   `apps/web/wrangler.jsonc`'s pattern) if a custom domain is wanted.
5. **Deploy**: `wrangler deploy` (from `apps/api/`).
6. **Wire the web app**: set `apps/web`'s API-base env var (see
   `apps/web/src/sync/config.ts`) to this Worker's deployed URL, and rebuild/
   redeploy `apps/web`. Leaving it unset keeps the app in local-only mode —
   this is intentionally the default (see that module's doc comment).

## Deliberately out of scope for v1 (see DESIGN §2.1)

- **Live mirror (Level 2)** and **CRDT concurrent editing (Level 3)** — both
  deferred; they'd reuse a Durable Object per session rather than this
  request/response KV model, so this Worker's shape doesn't block them.
- **Party/GM real-time sync** — same DO-based follow-on.
- Any server-side game-rules logic. If a future change makes this Worker
  compute or interpret anything beyond the envelope fields above, that
  change violates the project's one non-negotiable rule (see root
  `CLAUDE.md` / DESIGN.md §2).

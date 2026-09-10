/**
 * KV listing helper. `KVNamespace.list` returns at most 1000 keys per call and
 * hands back a cursor for the rest; every caller here wants "all of them under
 * this prefix", so the pagination lives in one place rather than in each route.
 */

/** Every key name under `prefix`, following the list cursor to exhaustion. */
export async function listAllKeys(kv: KVNamespace, prefix: string): Promise<string[]> {
  const names: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- each page's cursor comes from the previous one
    const page = await kv.list({ prefix, cursor });
    for (const key of page.keys) names.push(key.name);
    if (page.list_complete) return names;
    cursor = page.cursor;
  }
}

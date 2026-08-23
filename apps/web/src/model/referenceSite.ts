/**
 * Where the companion reference site (`apps/reference`) lives: the only
 * place in `apps/web` that knows, mirroring `sync/config.ts`'s convention.
 * The env override is for pointing a local `apps/reference` dev server at a
 * local app.
 */
export function referenceSiteUrl(): string {
  const raw = import.meta.env.VITE_REFERENCE_URL as string | undefined;
  return raw?.trim() || "https://ref.ledgermain.whizkid.dev/";
}

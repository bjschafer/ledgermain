/**
 * Character portraits, stored inline in the document as a `data:` URL.
 *
 * Two rules shape everything here. The document is an opaque blob the server
 * caps at 2 MB, and a phone photo is bigger than that on its own — so nothing
 * the player picked is ever stored as-is: {@link encodePortrait} re-draws it
 * onto a small square canvas and re-encodes to JPEG, dropping quality until it
 * fits {@link PORTRAIT_MAX_BYTES}. And a portrait that arrives from a file
 * import or a hand-edited document is untrusted, so every render path goes
 * through {@link portraitSrc}, which passes only the raster image data URLs
 * this module writes (never `image/svg+xml`, which is a document with its own
 * script and link semantics, and never a non-image type wearing an image
 * extension).
 *
 * The canvas work is browser-only and lives at the bottom; the size, shape and
 * safety rules above it are pure and tested directly.
 */

/**
 * Edge of the stored square, in pixels. Four times the size the sheet draws it
 * at, so it stays sharp on a phone's display and has something to give a
 * printed sheet later.
 */
export const PORTRAIT_SIZE = 512;

/**
 * Ceiling on the encoded data URL, in characters. A real photograph at
 * {@link PORTRAIT_SIZE} lands well under this; the cap is here to bound the
 * pathological case, not to squeeze the common one. Characters are stored in a
 * KV namespace whose own value limit is 25 MiB, so what this is really sized
 * against is `apps/api`'s self-imposed 2 MB per-document cap (about an eighth
 * of it) and the fact that every sync push re-uploads the whole document.
 */
export const PORTRAIT_MAX_BYTES = 256 * 1024;

/** What the file picker accepts, and what {@link encodePortrait} will decode. */
export const PORTRAIT_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

const ALLOWED_STORED_PREFIX = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Whether `value` is a data URL this app could have written. Deliberately
 * stricter than "is an image": the stored form is always base64 raster data,
 * so anything else is either corruption or someone else's idea.
 */
export function isPortraitDataUrl(value: string): boolean {
  return value.length <= PORTRAIT_MAX_BYTES && ALLOWED_STORED_PREFIX.test(value);
}

/**
 * The `src` to hand an `<img>`, or `undefined` when the stored value isn't one
 * this app is willing to render. Every portrait render path calls this — an
 * imported document can carry anything in that field.
 */
export function portraitSrc(portrait: string | undefined): string | undefined {
  if (!portrait) return undefined;
  return isPortraitDataUrl(portrait) ? portrait : undefined;
}

/**
 * The source rectangle to draw for a centered square crop: the largest square
 * that fits inside a `width` x `height` image. Split out from the canvas work
 * so the arithmetic is testable without a DOM.
 */
export function squareCrop(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

/** JPEG quality steps tried in order until the encoded result fits the cap. */
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45, 0.3];

/**
 * Re-encode a picked image file into a stored portrait, or throw with a
 * message the UI can show. Browser-only: needs `createImageBitmap` and a
 * canvas.
 */
export async function encodePortrait(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That file isn't an image this browser can read.");
  });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = PORTRAIT_SIZE;
    canvas.height = PORTRAIT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser wouldn't give us a canvas to resize the image on.");
    const crop = squareCrop(bitmap.width, bitmap.height);
    ctx.drawImage(bitmap, crop.x, crop.y, crop.size, crop.size, 0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
    for (const quality of QUALITY_STEPS) {
      const url = canvas.toDataURL("image/jpeg", quality);
      if (isPortraitDataUrl(url)) return url;
    }
    throw new Error("Couldn't shrink that image down far enough. Try a smaller one.");
  } finally {
    bitmap.close();
  }
}

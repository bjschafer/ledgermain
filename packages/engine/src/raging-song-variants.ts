/**
 * Skald archetype raging-song variant defs — the skald counterpart of
 * `bardic-performance-variants/` (see that directory's `types.ts` for the def
 * shape and merge semantics). `removesTags` reference the base tag list in
 * `raging-song.ts`'s `BASE_RAGING_SONGS`; variant option ids come out as
 * `ragingSong:<archetype-slug>:<tag>`. Hand-authored from the published rules
 * and verified against the vendored archetype-feature text, same clean-room
 * posture as `raging-song.ts`.
 */

import type { ArchetypePerformanceVariant } from "./bardic-performance-variants/types.js";

export const RAGING_SONG_VARIANTS: ArchetypePerformanceVariant[] = [];

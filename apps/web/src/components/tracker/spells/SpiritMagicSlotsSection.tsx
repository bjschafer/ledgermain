/**
 * The shaman's spirit magic slot track: one bonus slot per spell level, its
 * contents fixed by the chosen spirit rather than prepared by the player.
 */

import { useMemo } from "react";

import type { RefData } from "@pf1/schema";

import {
  castSpiritMagicSlot,
  restoreSpiritMagicSlot,
  shamanSpiritMagicSlotStatus,
} from "../../../model/preparedSpells.js";
import { shamanSpiritSpellsKnown } from "../../../model/spellcasting.js";
import type { BuilderProps } from "../../builder/types.js";

/**
 * The shaman's Spirit Magic bonus pool (ACG): ONE bonus spontaneous slot per
 * spell level she can cast, castable only with a spell from her chosen
 * spirit's Spirit Magic list — a separate pool from her ordinary prepared
 * loadout above (`model/preparedSpells.ts`'s "Shaman Spirit Magic" section
 * has the full RAW citation). Each level is a single Cast/Recover pip, not a
 * counted slot pool, since RAW never grants more than one.
 */
export function SpiritMagicSlotsSection({
  doc,
  refData,
  update,
  shamanLevel,
  effectiveClassLevel,
}: {
  doc: BuilderProps["doc"];
  refData: RefData;
  update: BuilderProps["update"];
  /** RAW shaman class level — which spirit-magic spells are known is a class-feature grant, never advancement-accelerated. */
  shamanLevel: number;
  /** Advancement-aware class level — which slot LEVELS exist follows the same table lookup as her ordinary per-day slots. */
  effectiveClassLevel: number;
}) {
  const status = shamanSpiritMagicSlotStatus(doc, effectiveClassLevel);
  const spiritSpellsByLevel = useMemo(() => {
    const map = new Map<number, { id: string; name: string }[]>();
    for (const sp of shamanSpiritSpellsKnown(refData, doc.build.shamanSpirit, shamanLevel)) {
      (map.get(sp.level) ?? map.set(sp.level, []).get(sp.level)!).push(sp);
    }
    return map;
  }, [refData, doc.build.shamanSpirit, shamanLevel]);

  if (status.length === 0) return null;

  return (
    <div className="spirit-magic-slots">
      <header className="domain-slots-head">
        <h4 className="domain-slots-title">Spirit Magic</h4>
        <p className="hint domain-slots-hint">
          One bonus spontaneous slot per spell level you can cast, filled from your spirit's Spirit
          Magic list (see the Spirit picker in the builder); doesn't touch your prepared loadout
          above.
        </p>
      </header>
      {status.map(({ level, remaining }) => {
        const spells = spiritSpellsByLevel.get(level) ?? [];
        return (
          <section key={level} className="prep-level is-domain">
            <header className="prep-head">
              <span className="prep-head-label">Spirit Magic L{level}</span>
              <span className="prep-count">{remaining}/1 available</span>
            </header>
            {spells.length > 0 ? (
              <p className="hint">{spells.map((s) => s.name).join(", ")}</p>
            ) : (
              <p className="prep-none">No spirit chosen, or no spirit-magic spell at this level.</p>
            )}
            {remaining > 0 ? (
              <button
                type="button"
                className="pick-btn remove prep-cast"
                onClick={() => update((d) => castSpiritMagicSlot(d, effectiveClassLevel, level))}
              >
                Cast
              </button>
            ) : (
              <button
                type="button"
                className="pick-btn add prep-cast"
                onClick={() => update((d) => restoreSpiritMagicSlot(d, level))}
              >
                Recover
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prepared-caster (wizard) view
// ---------------------------------------------------------------------------

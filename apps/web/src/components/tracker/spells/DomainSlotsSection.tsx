/**
 * The cleric/druid domain slot track: one bonus slot per spell level, filled
 * from the chosen domains' own spell lists rather than the class list.
 */

import { useMemo } from "react";

import type { RefData } from "@pf1/schema";

import {
  domainSpellLevelMap,
  prepareDomainSpell,
  preparedSpells,
  removePreparedAt,
  setExpendedAt,
} from "../../../model/preparedSpells.js";
import { domainSecretMetamagicFor } from "../../../model/freeMetamagic.js";
import { spellSlotsByLevel } from "../../../model/spellcasting.js";
import type { BuilderProps } from "../../builder/types.js";
import { TipButton } from "../../InfoTip.js";
import { SpellDetail } from "../../SpellDetail.js";
import { ApplyBuffButton } from "./rowControls.js";

/**
 * The bonus domain-slot grid for a cleric with chosen domains, or a druid with
 * a nature-bond domain (`variant`). PF1 grants ONE domain spell slot per
 * accessible spell level (1–9); the chosen domain(s) determine which spells the
 * prepare-from picker offers (union, deduped by id across the chosen domains at
 * each level). Each domain-prepare instance stores `kind: "domain"` on the doc,
 * keeping it out of the class-slot capacity check in {@link PreparedView}.
 */
export function DomainSlotsSection({
  doc,
  refData,
  update,
  slots,
  abilityMod,
  casterLevel,
  classTag,
  variant = "cleric",
}: {
  doc: BuilderProps["doc"];
  refData: RefData;
  update: BuilderProps["update"];
  slots: ReturnType<typeof spellSlotsByLevel>;
  classLevel: number;
  abilityMod: number;
  casterLevel: number;
  /** Stored class tag (see `model/spellcasting.ts` `storedClassTag`) — the domain slots are always their own class's, but this scopes the bucketing correctly for a caster that isn't the document's primary caster class. */
  classTag?: string;
  /** Which caster's domain mechanic: `"cleric"` (two domains) or `"druid"` (one nature-bond domain). */
  variant?: "cleric" | "druid";
}) {
  const casterWord = variant === "druid" ? "druid" : "cleric";
  const domains = useMemo(
    () =>
      variant === "druid"
        ? doc.build.druidNatureBondDomain
          ? [doc.build.druidNatureBondDomain]
          : []
        : (doc.build.clericDomains ?? []),
    [doc, variant],
  );
  const domainMap = useMemo(
    () => domainSpellLevelMap(refData, domains, variant),
    [refData, domains, variant],
  );

  // Bucket domain-kind prepared instances by their domain spell level.
  type Row = { index: number; spellId: string; name: string; expended: boolean };
  const preparedByLevel = new Map<number, Row[]>();
  const prepared = preparedSpells(doc);
  prepared.forEach((p, index) => {
    if ((p.classTag ?? undefined) !== classTag) return;
    if ((p.kind ?? "normal") !== "domain") return;
    const lvl = domainMap.get(p.spellId);
    if (lvl === undefined) return;
    const row: Row = {
      index,
      spellId: p.spellId,
      name: refData.spells[p.spellId]?.name ?? p.spellId,
      expended: p.expended,
    };
    (preparedByLevel.get(lvl) ?? preparedByLevel.set(lvl, []).get(lvl)!).push(row);
  });
  for (const arr of preparedByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  // Per accessible spell level (1–9), build the union of domain spells the
  // chosen domains offer at that level (deduped by spell id).
  const pickableByLevel = useMemo(() => {
    const out = new Map<number, { id: string; name: string }[]>();
    for (const slot of slots) {
      if (slot.level < 1 || slot.base === null) continue;
      const ids = new Set<string>();
      for (const tag of domains) {
        const list =
          variant === "druid"
            ? refData.druidDomainSpellLists[tag]
            : (refData.domainSpellLists[tag] ?? refData.subdomainSpellLists[tag]);
        if (!list) continue;
        for (const id of list[slot.level] ?? []) ids.add(id);
      }
      const entries: { id: string; name: string }[] = [];
      for (const id of ids) {
        const sp = refData.spells[id];
        if (sp) entries.push({ id, name: sp.name });
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      out.set(slot.level, entries);
    }
    return out;
  }, [slots, domains, refData, variant]);

  const accessibleLevels = [...pickableByLevel.keys()].sort((a, b) => a - b);
  if (accessibleLevels.length === 0) return null;

  return (
    <div className="domain-slots">
      <header className="domain-slots-head">
        <h4 className="domain-slots-title">Domain Slots ({domains.join(", ")})</h4>
        <p className="hint domain-slots-hint">
          One bonus prepare-slot per accessible {casterWord} spell level. Fill it from the chosen
          domain{variant === "cleric" ? "s" : ""}' spell list (a domain-only spell not on the{" "}
          {casterWord} list may only be prepared here).
        </p>
      </header>

      {accessibleLevels.map((level) => {
        const rows = preparedByLevel.get(level) ?? [];
        const total = 1; // PF1: one domain slot per accessible level
        const full = rows.length >= total;
        const pickable = pickableByLevel.get(level) ?? [];

        return (
          <section key={level} className="prep-level is-domain">
            <header className="prep-head">
              <span className="prep-head-label">Domain L{level}</span>
              <span className={`prep-count${rows.length > total ? " is-over" : ""}`}>
                {rows.length}/{total} prepared
                {rows.length > 0 && ` · ${rows.filter((r) => !r.expended).length} ready`}
              </span>
            </header>

            {rows.length > 0 ? (
              <div className="prep-rows">
                {rows.map((r) => {
                  const spellData = refData.spells[r.spellId];
                  return (
                    <div key={r.index} className={`prep-row${r.expended ? " is-expended" : ""}`}>
                      <div className="prep-row-main">
                        <span className="prep-name">{r.name}</span>
                        {spellData && (
                          <SpellDetail
                            spell={spellData}
                            spellLevel={level}
                            abilityMod={abilityMod}
                            casterLevel={casterLevel}
                          />
                        )}
                      </div>
                      {spellData && (
                        <ApplyBuffButton
                          spell={spellData}
                          refData={refData}
                          doc={doc}
                          update={update}
                          casterLevel={casterLevel}
                          onCast={(d) => setExpendedAt(d, r.index, true)}
                        />
                      )}
                      {r.expended ? (
                        <button
                          type="button"
                          className="pick-btn add prep-cast"
                          onClick={() => update((d) => setExpendedAt(d, r.index, false))}
                        >
                          Recover
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="pick-btn remove prep-cast"
                          onClick={() => update((d) => setExpendedAt(d, r.index, true))}
                        >
                          Cast
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost prep-x"
                        aria-label={`unprepare ${r.name}`}
                        onClick={() => update((d) => removePreparedAt(d, r.index))}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="prep-none">Domain slot empty.</p>
            )}

            {pickable.length > 0 ? (
              <details className="prep-add">
                <summary>
                  Prepare from {domains.join(", ")} level-{level} list…
                  {full && <span className="prep-full"> domain slot filled</span>}
                </summary>
                <div className="prep-add-list">
                  {pickable.map((sp) => {
                    const count = rows.filter((r) => r.spellId === sp.id && !r.expended).length;
                    const spellData = refData.spells[sp.id];
                    return (
                      <div key={sp.id} className="prep-add-row">
                        <div className="prep-row-main">
                          <span className="prep-name">{sp.name}</span>
                          {spellData && (
                            <SpellDetail
                              spell={spellData}
                              spellLevel={level}
                              abilityMod={abilityMod}
                              casterLevel={casterLevel}
                            />
                          )}
                        </div>
                        {count > 0 && <span className="prep-have">prepared</span>}
                        <TipButton
                          className="pick-btn add"
                          aria-label={`prepare ${sp.name} in the domain slot`}
                          disabled={full}
                          disabledReason="Domain slot is filled. Unprepare the current spell first."
                          onClick={() =>
                            update((d) =>
                              prepareDomainSpell(
                                d,
                                sp.id,
                                classTag,
                                domainSecretMetamagicFor(d, sp.id),
                              ),
                            )
                          }
                        >
                          Prepare
                        </TipButton>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : (
              <p className="prep-none">No level-{level} spells in the chosen domains.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// School slots — bonus prepared slots for a specialist wizard.
// ---------------------------------------------------------------------------

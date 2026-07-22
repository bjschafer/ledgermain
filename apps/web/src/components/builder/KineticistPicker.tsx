import { useMemo, useState } from "react";

import {
  eligibleCompositeBlasts,
  KINETICIST_ELEMENTS,
  KINETICIST_ELEMENT_TAGS,
  KINETICIST_WILD_TALENTS,
  mergedCompositeBlastCatalog,
  mergedKineticistWildTalentCatalog,
} from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenKineticistTalentCount,
  EXPANDED_ELEMENT_LEVELS,
  expectedKineticistTalentCount,
  hasKineticistWildTalent,
  kineticistLevel,
  kineticistTalentBelowLevel,
  kineticistTalentsNeedWarning,
  knownKineticistElements,
  setKineticistElement,
  setKineticistExpandedElement,
  toggleKineticistWildTalent,
} from "../../model/kineticistBuild.js";
import { SKILL_NAMES } from "../../model/names.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface KineticistPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Kineticist Elemental Focus / Expanded Element / Wild Talents (issue #65).
 * Three sections mirroring `ImplementPicker`'s "multiple budgeted pools in
 * one picker" shape:
 *
 * - **Elemental Focus** — single-choice dropdowns (like `OrderPicker`) for
 *   the primary element (`build.kineticistElement`) and the two Expanded
 *   Element picks (`build.kineticistExpandedElements[0/1]`, shown once the
 *   character reaches 7th/15th level). Composite blasts currently unlocked
 *   (see `eligibleCompositeBlasts`) are previewed read-only — they're
 *   automatic, not a pick.
 * - **Infusions** / **Utility Wild Talents** — two independently budgeted
 *   toggle-lists (own cadence each — see `model/kineticistBuild.ts`), menu
 *   scoped to the character's known elements (primary + expanded) plus the
 *   always-available `universal:` entries.
 */
export function KineticistPicker({ doc, refData, update }: KineticistPickerProps) {
  const isKineticist = doc.identity.classes.some((c) => c.tag === "kineticist");
  if (!isKineticist) return null;

  return (
    <>
      <ElementalFocusSection doc={doc} refData={refData} update={update} />
      <WildTalentSection
        doc={doc}
        refData={refData}
        update={update}
        category="infusion"
        title="Infusions"
      />
      <WildTalentSection
        doc={doc}
        refData={refData}
        update={update}
        category="utility"
        title="Utility Wild Talents"
      />
    </>
  );
}

function ElementalFocusSection({
  doc,
  refData,
  update,
}: {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Elemental Focus", false);
  const level = kineticistLevel(doc);
  const primary = doc.build.kineticistElement;
  const expanded = doc.build.kineticistExpandedElements ?? [];
  const primaryDef = primary ? KINETICIST_ELEMENTS[primary] : undefined;

  const compositeCatalog = useMemo(() => mergedCompositeBlastCatalog(refData), [refData]);
  const composites = useMemo(
    () => eligibleCompositeBlasts(primary, expanded, compositeCatalog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [primary, expanded.join(","), compositeCatalog],
  );

  return (
    <div className="subsection order-picker">
      <div
        className="subsection-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleCollapsed();
        }}
        aria-expanded={!collapsed}
      >
        <h3>
          Elemental Focus
          {primaryDef ? <span className="hint"> · {primaryDef.name}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint order-picker-hint">
            Pick one primary element at 1st level (never changed thereafter). Determines your simple
            blast, 2 bonus class skills (display-only), Elemental Defense, and a bonus basic utility
            wild talent. Free-choice.
          </p>
          <select
            className="order-select"
            value={primary ?? ""}
            onChange={(e) => update((d) => setKineticistElement(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {KINETICIST_ELEMENT_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {KINETICIST_ELEMENTS[tag]!.name}
              </option>
            ))}
          </select>

          {primaryDef && (
            <div className="order-preview">
              <div className="hint" style={{ marginTop: 4 }}>
                Simple blast — {primaryDef.simpleBlast.name} ({primaryDef.simpleBlast.damageType},{" "}
                {primaryDef.simpleBlast.descriptor})
              </div>
              <div className="hint" style={{ marginTop: 2 }}>
                Bonus class skills —{" "}
                {primaryDef.classSkills.map((id) => SKILL_NAMES[id] ?? id).join(", ")}
              </div>
              <div className="hint" style={{ marginTop: 2 }}>
                Defense — {primaryDef.defense.name}: {primaryDef.defense.summary}
              </div>
              <div className="hint" style={{ marginTop: 2 }}>
                Basic utility — {primaryDef.basicUtility.name}: {primaryDef.basicUtility.summary}
              </div>
            </div>
          )}

          {EXPANDED_ELEMENT_LEVELS.map((threshold, idx) => {
            const reached = level >= threshold;
            const chosen = expanded[idx];
            const chosenDef = chosen ? KINETICIST_ELEMENTS[chosen] : undefined;
            return (
              <div key={threshold} style={{ marginTop: 10 }}>
                <div className="hint">
                  Expanded Element ({threshold}th level){!reached ? " — not yet reached" : ""}
                </div>
                <select
                  className="order-select"
                  value={chosen ?? ""}
                  disabled={!reached}
                  onChange={(e) =>
                    update((d) =>
                      setKineticistExpandedElement(d, idx as 0 | 1, e.target.value || null),
                    )
                  }
                >
                  <option value="">— none chosen —</option>
                  {KINETICIST_ELEMENT_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {KINETICIST_ELEMENTS[tag]!.name}
                    </option>
                  ))}
                </select>
                {chosenDef && (
                  <div className="hint" style={{ marginTop: 2 }}>
                    +{chosenDef.simpleBlast.name}, {chosenDef.basicUtility.name} (no defense wild
                    talent from an expanded element)
                  </div>
                )}
              </div>
            );
          })}

          {composites.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="hint">Composite blasts unlocked (automatic, not a pick)</div>
              <ul className="order-abilities">
                {composites.map((cb) => (
                  <li key={cb.id}>
                    <span className="cf-name">{cb.name}</span>
                    <p className="order-ability-summary">
                      {cb.summary} ({cb.burn} burn)
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {level <= 0 && (
            <div className="hint" style={{ marginTop: 4 }}>
              ⚠ No kineticist levels yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WildTalentSection({
  doc,
  refData,
  update,
  category,
  title,
}: {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
  category: "infusion" | "utility";
  title: string;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed(`subsection:${title}`, false);
  const knownTags = useMemo(() => new Set(knownKineticistElements(doc)), [doc]);
  const chosen = chosenKineticistTalentCount(doc, refData, category);
  const expected = expectedKineticistTalentCount(doc, category);
  const warn = kineticistTalentsNeedWarning(doc, refData, category);
  const countClass = warn ? "hint warn-over" : "hint";
  const level = kineticistLevel(doc);

  const catalog = useMemo(() => mergedKineticistWildTalentCatalog(refData), [refData]);

  const elementLabel = (tags: readonly string[]): string =>
    tags
      .map((tag) => (tag === "universal" ? "Universal" : (KINETICIST_ELEMENTS[tag]?.name ?? tag)))
      .join(", ");

  const talents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: {
      id: string;
      isModeled: boolean;
      elementName: string;
      name: string;
      nameSuffix?: string;
      burn: number;
      summary: string;
      description?: string;
    }[] = [];
    for (const talent of catalog) {
      if (talent.category !== category) continue;
      if (
        !talent.elements.includes("universal") &&
        !talent.elements.some((e) => knownTags.has(e))
      ) {
        continue;
      }
      const elementName = elementLabel(talent.elements);
      if (q && !talent.name.toLowerCase().includes(q) && !elementName.toLowerCase().includes(q)) {
        continue;
      }
      rows.push({
        id: talent.id,
        isModeled: !!KINETICIST_WILD_TALENTS[talent.id],
        elementName,
        name: talent.name,
        nameSuffix: talent.nameSuffix,
        burn: talent.burn,
        summary: talent.summary,
        description: talent.description,
      });
    }
    return rows.sort((a, b) => {
      const sa = hasKineticistWildTalent(doc, a.id) ? 0 : 1;
      const sb = hasKineticistWildTalent(doc, b.id) ? 0 : 1;
      return sa - sb || a.elementName.localeCompare(b.elementName) || a.name.localeCompare(b.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, query, knownTags, chosen, category]);

  return (
    <div className="subsection revelation-picker">
      <div
        className="subsection-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleCollapsed();
        }}
        aria-expanded={!collapsed}
      >
        <h3>
          {title}
          <span
            className={countClass}
            title={warn ? "More talents chosen than the class table grants" : undefined}
          >
            {" "}
            · {chosen} / {expected}
          </span>
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint revelation-picker-hint">
            {category === "infusion"
              ? "Gained at 1st, 3rd, 5th, 9th, 11th, 13th, 17th, and 19th level."
              : "Gained at 2nd, 4th, 6th, 8th, 10th, 12th, 14th, 16th, 18th, and 20th level."}{" "}
            Browses the full published catalog, scoped to known elements + universal talents;
            entries marked <span className="badge-modeled">M</span> carry a real, live mechanical
            effect — the rest are prose-only. Free-choice — never blocks.
          </p>
          {knownTags.size === 0 && (
            <div className="empty">
              Pick a primary element above to see element-specific talents.
            </div>
          )}
          <input
            className="search"
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {talents.map((t) => {
              const isSel = hasKineticistWildTalent(doc, t.id);
              const belowLevel = level > 0 && kineticistTalentBelowLevel(doc, refData, t.id);
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name}
                      {t.nameSuffix ? ` ${t.nameSuffix}` : ""}{" "}
                      <span className="hint">({t.elementName})</span>
                      {t.isModeled && (
                        <span
                          className="badge-modeled"
                          title="Carries a real, live mechanical effect"
                        >
                          {" "}
                          M
                        </span>
                      )}
                    </div>
                    <div className="preq">
                      <span className="desc-text">
                        {t.summary} ({t.burn} burn)
                      </span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Above your current effective-level gate
                      </div>
                    )}
                    {t.description ? <FeatureDescription html={t.description} /> : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleKineticistWildTalent(d, t.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {talents.length === 0 ? <div className="empty">No talents match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

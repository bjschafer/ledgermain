import { useMemo, useState } from "react";

import { casterClassesOf, casterModelFor, spellsPanelVisible } from "../../model/spellcasting.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";
import { SparklesIcon } from "../icons.js";
import { HybridView } from "./spells/HybridView.js";
import { PreparedView } from "./spells/PreparedView.js";
import { SpontaneousView } from "./spells/SpontaneousView.js";

/**
 * The daily spell tracking panel. For prepared casters (wizard) this is the
 * loadout loop; for spontaneous casters (sorcerer) it is the slot-pool view.
 *
 * Multiclass support: with 2+ caster classes on the document, a class switcher
 * lets the player pick which class's spells this panel shows — including which
 * preparation MODE applies, since a cleric/sorcerer multiclass needs the
 * prepared loop for one class's tab and the spontaneous slot-pool view for the
 * other. A single-caster document never renders the switcher, so its behavior
 * is unchanged from before multiclass support.
 *
 * This file is only the class switcher and the branch to one of the three
 * views, which share almost nothing below the spell row and so live in
 * `./spells/` alongside the row controls they do share.
 */
export function PreparedSpellsPanel({ doc, sheet, refData, update }: BuilderProps) {
  const casters = useMemo(() => casterClassesOf(doc, refData), [doc, refData]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const casterTag =
    (selectedTag && casters.some((c) => c.tag === selectedTag) ? selectedTag : casters[0]?.tag) ??
    undefined;
  const model = casterTag ? casterModelFor(casterTag) : undefined;

  if (!casterTag || !model) {
    // No caster class and no spell state to strand: show nothing rather than an
    // empty panel. An actual caster whose class isn't modelled yet keeps the
    // message — that's a gap worth surfacing, not an absent feature.
    if (!casterTag && !spellsPanelVisible(doc, refData)) return null;
    return (
      <Panel title="Spells" step="ps" icon={<SparklesIcon />} storageKey="panel:Prepared">
        <p className="empty">
          {casterTag
            ? "Spell tracking isn't modelled for this class yet."
            : "No spellcasting class selected."}
        </p>
      </Panel>
    );
  }

  const classSwitcher =
    casters.length > 1 ? (
      <div className="chips spell-class-switcher" role="tablist" aria-label="Caster class">
        {casters.map((c) => (
          <button
            key={c.tag}
            type="button"
            className="chip"
            role="tab"
            aria-selected={casterTag === c.tag}
            aria-pressed={casterTag === c.tag}
            onClick={() => setSelectedTag(c.tag)}
          >
            {refData.classes[c.tag]?.name ?? c.tag} {c.level}
          </button>
        ))}
      </div>
    ) : null;

  if (model.preparation === "spontaneous") {
    return (
      <SpontaneousView
        doc={doc}
        sheet={sheet}
        refData={refData}
        update={update}
        casterTag={casterTag}
        model={model}
        classSwitcher={classSwitcher}
      />
    );
  }

  if (model.preparation === "hybrid") {
    return (
      <HybridView
        doc={doc}
        sheet={sheet}
        refData={refData}
        update={update}
        casterTag={casterTag}
        model={model}
        classSwitcher={classSwitcher}
      />
    );
  }

  return (
    <PreparedView
      doc={doc}
      sheet={sheet}
      refData={refData}
      update={update}
      casterTag={casterTag}
      model={model}
      classSwitcher={classSwitcher}
    />
  );
}

import { useMemo, useState } from "react";

import { FeatEntry, useFeatRenderContext } from "./FeatEntry.js";
import { FeatManager } from "./FeatManager.js";
import { InfoTip } from "../InfoTip.js";
import { StarIcon } from "../icons.js";
import { FeatureDescription } from "./ClassFeaturesList.js";
import { HomebrewFeatEditor } from "./HomebrewFeatEditor.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function FeatsSection({ doc, sheet, refData, update }: BuilderProps) {
  const [managerOpen, setManagerOpen] = useState(false);
  const fx = useFeatRenderContext(doc, sheet, refData);

  // The character's chosen (non-granted) feats, shown here as a read list; all
  // browsing and adding happens in the full-screen FeatManager. Each row keeps
  // its remove button and choice dropdowns so quick tweaks don't need the modal.
  const taken = useMemo(
    () =>
      Object.values(refData.feats)
        .filter((f) => fx.selected.has(f.id) && !fx.grantedIds.has(f.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [refData.feats, fx.selected, fx.grantedIds],
  );

  const featCountClass =
    fx.chosen === fx.expected
      ? "hint"
      : fx.chosen > fx.expected
        ? "hint warn-over"
        : "hint warn-under";

  return (
    <Panel
      title="Feats"
      step="vii"
      icon={<StarIcon />}
      storageKey="panel:Feats"
      right={
        <>
          <span
            className={featCountClass}
            title={fx.chosen !== fx.expected ? "Feat count doesn't match expected" : undefined}
          >
            {fx.chosen} / {fx.expected} feats
          </span>
          {fx.unqualified.size > 0 && (
            <InfoTip
              className="hint warn-over"
              content="These feats' prerequisites are no longer met (a required feat was likely removed) — they're kept per the hybrid prereq policy, but verify manually"
            >
              {" "}
              · ⚠ {fx.unqualified.size} no longer qualif{fx.unqualified.size === 1 ? "ies" : "y"}
            </InfoTip>
          )}
        </>
      }
    >
      {fx.restrictedSlotGroups.length > 0 && (
        <div className="feat-slot-summary">
          {fx.restrictedSlotGroups.map((g) => (
            <InfoTip
              key={g.key}
              className={`slot-chip${g.filledFeatIds.length < g.total ? " slot-chip-warn" : ""}`}
              content={
                g.filledFeatIds.length < g.total
                  ? `${g.label}: ${g.total - g.filledFeatIds.length} unfilled — take a feat from this restricted list to fill it`
                  : `${g.label}: fully filled`
              }
            >
              {g.filledFeatIds.length < g.total ? "⚠ " : ""}
              {g.label}: {g.filledFeatIds.length}/{g.total}
            </InfoTip>
          ))}
          {fx.unassignedFeatNames.length > 0 && (
            <InfoTip
              className="slot-chip slot-chip-warn"
              content="These feats don't match any open feat slot for your class(es) — you may be over your feat budget, or they don't satisfy a class's feat-type restriction"
            >
              ⚠ doesn't fit an open slot: {fx.unassignedFeatNames.join(", ")}
            </InfoTip>
          )}
        </div>
      )}

      {fx.granted.length > 0 && (
        <div className="granted-feats">
          {fx.granted.map((g) => {
            const description = refData.feats[g.featId]?.description;
            return (
              <div key={g.featId} className="pick-row is-selected">
                <div className="pmain">
                  <div className="pname">{g.featName}</div>
                  <div className="preq">
                    <span className="soft">Granted by {g.classTag} — no feat slot used</span>
                  </div>
                  {description ? <FeatureDescription html={description} /> : null}
                </div>
                <button
                  type="button"
                  className="pick-btn"
                  disabled
                  title="Class feature grant — always on"
                >
                  Granted
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="spell-manager-launch">
        <button type="button" className="btn-gold" onClick={() => setManagerOpen(true)}>
          Choose feats
        </button>
        <span className="hint">search and add from {Object.keys(refData.feats).length} feats</span>
      </div>

      {managerOpen && (
        <FeatManager
          fx={fx}
          doc={doc}
          refData={refData}
          update={update}
          onClose={() => setManagerOpen(false)}
        />
      )}

      <div className="scroll">
        {taken.length === 0 ? (
          <div className="empty">No feats chosen yet — “Choose feats” to add some.</div>
        ) : (
          taken.map((feat) => (
            <FeatEntry
              key={feat.id}
              feat={feat}
              fx={fx}
              doc={doc}
              refData={refData}
              update={update}
            />
          ))
        )}
      </div>

      <HomebrewFeatEditor doc={doc} sheet={sheet} refData={refData} update={update} />
    </Panel>
  );
}

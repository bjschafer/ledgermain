import { useMemo, useState } from "react";

import type { AbilityId } from "@pf1/schema";

import { casterLevel } from "../../model/casterLevel.js";
import { toggleFeat } from "../../model/doc.js";
import { ABILITY_IDS } from "../../model/doc.js";
import {
  chosenFeatCount,
  expectedFeatCount,
  featChoiceDescriptor,
  featChoiceOptions,
  setFeatChoice,
} from "../../model/feats.js";
import {
  evaluatePrereqs,
  type PrereqContext,
  type PrereqResult,
} from "../../model/prereqs.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

const FEAT_CATEGORIES = [
  "Combat",
  "General",
  "Metamagic",
  "Item Creation",
  "Teamwork",
] as const;
type FeatCategory = (typeof FEAT_CATEGORIES)[number];

export function FeatsSection({ doc, sheet, refData, update }: BuilderProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FeatCategory | "All">("All");
  const [hideIneligible, setHideIneligible] = useState(false);
  const selected = useMemo(() => new Set(doc.build.feats), [doc.build.feats]);

  const ctx: PrereqContext = useMemo(() => {
    const abilityTotals = {} as Record<AbilityId, number>;
    for (const id of ABILITY_IDS) abilityTotals[id] = sheet.abilities[id].total;
    return {
      abilityTotals,
      bab: sheet.bab,
      casterLevel: casterLevel(doc),
      selectedFeats: selected,
      refData,
    };
  }, [sheet, doc, selected, refData]);

  const { feats, prereqMap } = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Compute prereq results once; reused for both filtering and rendering.
    const map = new Map<string, PrereqResult>();
    for (const feat of Object.values(refData.feats)) {
      map.set(feat.id, evaluatePrereqs(feat, ctx));
    }

    const list = Object.values(refData.feats)
      .filter((f) => {
        if (q && !f.name.toLowerCase().includes(q)) return false;
        if (category !== "All" && !f.tags.includes(category)) return false;
        // Never hide a feat the character has already taken.
        if (hideIneligible && !selected.has(f.id) && map.get(f.id)?.blocked) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });

    return { feats: list, prereqMap: map };
  }, [refData.feats, query, category, hideIneligible, selected, ctx]);

  // Skill options for Skill Focus and any other "skill" choice feats. Computed
  // once per render cycle — the list is static (all skills, alphabetically).
  const skillOptions = useMemo(
    () => featChoiceOptions("skill", refData),
    [refData],
  );

  const chosen = chosenFeatCount(doc);
  const expected = expectedFeatCount(doc, refData);
  const featCountClass =
    chosen === expected ? "hint" : chosen > expected ? "hint warn-over" : "hint warn-under";

  return (
    <Panel
      title="Feats"
      step="vi"
      storageKey="panel:Feats"
      right={
        <span className={featCountClass} title={chosen !== expected ? "Feat count doesn't match expected" : undefined}>
          {chosen} / {expected} feats
        </span>
      }
    >
      <input
        className="search"
        type="text"
        placeholder="Search feats…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="feat-filters">
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={category === "All"}
            onClick={() => setCategory("All")}
          >
            All
          </button>
          {FEAT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className="chip"
              aria-pressed={category === cat}
              onClick={() => setCategory(category === cat ? "All" : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Orthogonal toggle — visually separate from category filters */}
        <div className="feat-filter-toggle">
          <span className="hint" style={{ fontSize: 11 }}>FILTER</span>
          <button
            type="button"
            className="filter-toggle"
            aria-pressed={hideIneligible}
            onClick={() => setHideIneligible((v) => !v)}
          >
            {hideIneligible ? "▪ Hide ineligible" : "▫ Hide ineligible"}
          </button>
        </div>
      </div>
      <div className="scroll">
        {feats.slice(0, 150).map((feat) => {
          const isSel = selected.has(feat.id);
          const res = prereqMap.get(feat.id)!;
          const blocked = res.blocked && !isSel;
          // For selected feats: look up any player-choice descriptor and options.
          const choiceDesc = isSel ? featChoiceDescriptor(feat.name) : null;
          const choiceOpts =
            choiceDesc?.type === "skill"
              ? skillOptions
              : []; // weapon + future types have no options yet
          return (
            <div
              key={feat.id}
              className={`pick-row${isSel ? " is-selected" : ""}${blocked ? " is-blocked" : ""}`}
            >
              <div className="pmain">
                <div className="pname">{feat.name}</div>
                {/* Inline choice picker for feats that require a selection */}
                {choiceDesc && choiceOpts.length > 0 && (
                  <div className="feat-choice">
                    <label className="feat-choice-label">
                      {choiceDesc.label}:
                      <select
                        className="feat-choice-select"
                        value={doc.build.featChoices?.[feat.id] ?? ""}
                        onChange={(e) =>
                          update((d) =>
                            setFeatChoice(d, feat.id, e.target.value || null),
                          )
                        }
                      >
                        <option value="">— choose a {choiceDesc.type} —</option>
                        {choiceOpts.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                {(res.checks.length > 0 || res.softText) && (
                  <div className="preq">
                    {res.checks.map((c, i) => (
                      <span key={i} className={c.met ? "ck-met" : "ck-unmet"}>
                        {c.met ? "✓" : "✗"} {c.label}
                      </span>
                    ))}
                    {res.softText ? (
                      <span
                        className="soft"
                        title="Prerequisite text — verify manually (not auto-enforced)"
                      >
                        ⚠ {res.softText}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`pick-btn ${isSel ? "remove" : "add"}`}
                disabled={blocked}
                title={blocked ? "Prerequisites not met" : undefined}
                onClick={() => update((d) => toggleFeat(d, feat.id))}
              >
                {isSel ? "Remove" : blocked ? "Locked" : "Add"}
              </button>
            </div>
          );
        })}
        {feats.length > 150 ? (
          <div className="empty">Showing first 150 — refine your search.</div>
        ) : null}
      </div>
    </Panel>
  );
}

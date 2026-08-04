import { useMemo, useState } from "react";

import {
  type AbilityCatalogOption,
  type AbilityInfo,
  abilitySelectable,
  toggleAbilitySelection,
  totalBonusEquivalent,
} from "../../model/abilities.js";
import { TipButton } from "../InfoTip.js";

/** "+2" for an enhancement-equivalent ability, "1,000 gp" for a flat-gp one. */
function costLabel(opt: AbilityCatalogOption): string {
  if (opt.cost != null) return `+${opt.cost}`;
  if (opt.price != null) return `${opt.price.toLocaleString()} gp`;
  return "";
}

/** Selected-chip label stays compact: a gp-priced ability just reads "gp" rather than the full price. */
function chipCostLabel(opt: AbilityCatalogOption): string {
  if (opt.cost != null) return `+${opt.cost}`;
  if (opt.price != null) return "gp";
  return "";
}

/** Tooltip explaining a row's cost and, when relevant, why it can't be picked yet. */
function abilityRowTitle(
  opt: AbilityCatalogOption,
  current: string[],
  enhancement: number,
  options: AbilityCatalogOption[],
): string {
  const label = costLabel(opt);
  const base = opt.note ? `${opt.name} (${label}): ${opt.note}` : `${opt.name} (${label})`;
  if (current.includes(opt.id)) return base;
  if (enhancement < 1) return `${base}. Requires at least a +1 enhancement bonus.`;
  if (opt.requires && !current.includes(opt.requires)) {
    const reqName = options.find((o) => o.id === opt.requires)?.name ?? opt.requires;
    return `${base}. Requires ${reqName} to also be selected.`;
  }
  return `${base}. Over the +10 enhancement and abilities cap.`;
}

/** Rules-prose reveal for an ability, the same collapsible pattern SpellDetail/FeatDetail use. */
function AbilityDetail({ description }: { description: string }) {
  return (
    <details className="spell-detail">
      <summary className="spell-detail-summary">details</summary>
      <div className="spell-detail-body">
        <div
          className="spell-detail-desc"
          // Ability descriptions come from the vendored Foundry PF1 data (open
          // game content) and contain only formatting tags — no user input.
          // Same posture as SpellDetail/FeatDetail.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>
    </details>
  );
}

/**
 * Applies one {@link AbilityPicker} toggle to a `{abilities, abilityInfo}`
 * pair: adding an id stashes its catalog snapshot into `abilityInfo` when
 * `catalogInfo` has one (an imported pick — see `AbilityCatalog.info`);
 * removing an id (which may cascade to a dependent, e.g. turning off
 * "flaming" also turns off "flaming-burst" — see `toggleAbilitySelection`)
 * prunes any now-stale snapshot entries along with it. Hand-curated ids never
 * appear in `catalogInfo`, so they never gain a snapshot. A blocked add (over
 * budget, missing prereq, enhancement < 1) is a no-op, returned unchanged.
 *
 * The selectability check inside `toggleAbilitySelection` is run against
 * `catalogInfo` (the full catalog snapshot), not `abilityInfo` (the
 * instance's already-selected-only subset) — an unselected imported id has
 * no entry in `abilityInfo` yet, so checking against it would make every
 * not-yet-picked imported ability look unrecognized and always blocked.
 */
export function toggleAbilityPick(
  abilities: string[],
  abilityInfo: AbilityInfo,
  option: AbilityCatalogOption,
  enhancement: number,
  catalogInfo: AbilityInfo,
): { abilities: string[]; abilityInfo: AbilityInfo } {
  const next = toggleAbilitySelection(abilities, option.id, enhancement, catalogInfo);
  if (next === abilities) return { abilities, abilityInfo };
  if (next.length > abilities.length) {
    const snapshot = catalogInfo[option.id];
    return {
      abilities: next,
      abilityInfo: snapshot ? { ...abilityInfo, [option.id]: snapshot } : abilityInfo,
    };
  }
  return { abilities: next, abilityInfo: pruneAbilityInfo(abilityInfo, next) };
}

/** Drops any `abilityInfo` entry whose id is no longer in `keep`. */
export function pruneAbilityInfo(info: AbilityInfo, keep: string[]): AbilityInfo {
  const pruned: AbilityInfo = {};
  for (const id of keep) {
    const entry = info[id];
    if (entry) pruned[id] = entry;
  }
  return pruned;
}

/**
 * Selected-chips + searchable-catalog picker for weapon/armor/shield special
 * abilities (the ~187-entry published catalog, replacing the old fixed
 * 18-chip wall — see `model/abilities.ts`'s `buildAbilityCatalog`). `options`
 * is already filtered to the calling form's context (weapon, or armor/shield
 * depending on the armor form's slot); `onToggle` owns the actual add/remove
 * bookkeeping (typically via {@link toggleAbilityPick}), since only the
 * caller's state setters know how to commit both `abilities` and
 * `abilityInfo` together. `info` must be the catalog's full `info` (not the
 * instance's already-selected-only `abilityInfo`) — every row, selected or
 * not, needs its cost resolved to render correctly, and an unselected
 * imported ability has no entry yet in the narrower instance snapshot.
 *
 * `label`/`intro` let a caller reframe the section for its context (e.g. the
 * armor forms use "Magic special abilities" plus a one-line explainer, so the
 * list of enchantments never reads as the base-item picker itself); both
 * default to the plain weapon/armor-agnostic copy.
 */
export function AbilityPicker({
  options,
  selected,
  enhancement,
  info,
  onToggle,
  label = "Special abilities",
  intro,
}: {
  options: AbilityCatalogOption[];
  selected: string[];
  enhancement: number;
  info: AbilityInfo;
  onToggle: (option: AbilityCatalogOption) => void;
  label?: string;
  intro?: string;
}) {
  const [query, setQuery] = useState("");
  const abilitiesLocked = enhancement < 1;
  const usedBonus = totalBonusEquivalent(selected, info);

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const selectedOptions = selected
    .map((id) => byId.get(id))
    .filter((o): o is AbilityCatalogOption => o != null);

  const unselected = useMemo(
    () => options.filter((o) => !selected.includes(o.id)),
    [options, selected],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unselected.filter((o) => !q || o.name.toLowerCase().includes(q)).slice(0, 80);
  }, [unselected, query]);

  return (
    <div className="ability-chips-section">
      <span className="section-label">{label}</span>
      {intro && <p className="hint ability-picker-intro">{intro}</p>}
      <p className="hint">
        {abilitiesLocked
          ? "Requires at least a +1 enhancement bonus"
          : `Enhancement + abilities: ${enhancement + usedBonus}/10`}
      </p>
      {selectedOptions.length > 0 && (
        <div className="ability-chips">
          {selectedOptions.map((opt) => (
            <TipButton
              key={opt.id}
              className="chip"
              aria-pressed={true}
              title={abilityRowTitle(opt, selected, enhancement, options)}
              onClick={() => onToggle(opt)}
            >
              {opt.name} ({chipCostLabel(opt)})
            </TipButton>
          ))}
        </div>
      )}
      <input
        className="search"
        type="text"
        placeholder="Search special abilities…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="scroll">
        {filtered.length === 0 ? (
          <div className="empty">No abilities match.</div>
        ) : (
          filtered.map((opt) => {
            const canAdd = abilitySelectable(selected, opt.id, enhancement, info);
            const title = abilityRowTitle(opt, selected, enhancement, options);
            return (
              <div key={opt.id} className="pick-row">
                <div className="pmain">
                  <div className="pname">
                    {opt.name} <span className="ability-cost-badge">{costLabel(opt)}</span>
                  </div>
                  {(opt.note || opt.description) && (
                    <div className="preq">
                      {opt.note && <span>{opt.note}</span>}
                      {opt.description && <AbilityDetail description={opt.description} />}
                    </div>
                  )}
                </div>
                <TipButton
                  className="pick-btn add"
                  disabled={!canAdd}
                  disabledReason={title}
                  title={title}
                  onClick={() => onToggle(opt)}
                >
                  Add
                </TipButton>
              </div>
            );
          })
        )}
        {unselected.length > 80 && filtered.length === 80 ? (
          <div className="empty">Showing the first 80 results. Refine your search.</div>
        ) : null}
      </div>
    </div>
  );
}

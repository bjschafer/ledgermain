import { useEffect, useId, useMemo, useState } from "react";

import type { SavedRoll, SavedRollFeatRef, SavedRollRangerRef, SavedRollTwf } from "@pf1/schema";

import {
  addSavedRoll,
  addSavedRollFeat,
  addSavedRollRanger,
  attachableFeats,
  availableSavedRollSources,
  isAttackLikeSource,
  ownedFeatSlugs,
  removeSavedRoll,
  removeSavedRollFeat,
  removeSavedRollRanger,
  resolveSavedRoll,
  setSavedRollFeatOption,
  setSavedRollTwf,
  updateSavedRoll,
  type AttachableFeat,
  type ResolvedSavedRoll,
} from "../../model/savedRolls.js";
import { twfConfig } from "../../model/twf.js";
import { attachableRangerBonuses } from "../../model/ranger.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { BookmarkIcon } from "../icons.js";
import { CopyButton } from "../CopyButton.js";
import { Explainer } from "../Explainer.js";
import { Provenance } from "../Provenance.js";
import type { BuilderProps } from "../builder/types.js";
import { Caret } from "../Caret.js";

/**
 * Saved rolls (issue #2) — the owner-decided "no dice roller" answer: pin a
 * name to a number the sheet already computes (a full attack, a save, a
 * skill) so it's one glance away during play instead of scrolling the whole
 * character sheet. Every row re-resolves against the live `DerivedSheet` on
 * every render, so a saved roll never goes stale as buffs/feats/gear change.
 * A saved roll can carry attached feats (folded in from the engine's
 * situational-feat registry — Rapid Shot, Deadly Aim, Power Attack, ... — or
 * as reminder-only chips), a flat attack/damage adjustment, or point at
 * nothing at all (`source.kind === "custom"`) for one-off bookmarks.
 */
export function SavedRollsPanel({ doc, sheet, refData, update }: BuilderProps) {
  const [query, setQuery] = useState("");
  const [addCollapsed, toggleAddCollapsed] = useCollapsed("subsection:SavedRolls:add", true);

  const saved = useMemo(() => doc.build.savedRolls ?? [], [doc]);
  const owned = useMemo(() => ownedFeatSlugs(doc, refData), [doc, refData]);
  const resolved = useMemo(
    () => saved.map((r) => resolveSavedRoll(r, sheet, owned)),
    [saved, sheet, owned],
  );
  const attachable = useMemo(
    () => saved.map((r) => attachableFeats(doc, refData, r.source)),
    [saved, doc, refData],
  );
  const rangerAttachable = useMemo(() => attachableRangerBonuses(sheet), [sheet]);
  // Any melee weapon can be the off hand — including the one being swung in the
  // main hand (a matched pair of shortswords is one weapon entry, not two).
  const offHandWeapons = useMemo(
    () => sheet.attacks.filter((a) => a.category === "melee").map((a) => a.name),
    [sheet],
  );

  const options = useMemo(() => availableSavedRollSources(sheet), [sheet]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || o.label.toLowerCase().includes(q)).slice(0, 60);
  }, [options, query]);

  return (
    <Panel title="Saved Rolls" step="sr" icon={<BookmarkIcon />} storageKey="panel:SavedRolls">
      {saved.length === 0 ? (
        <div className="empty">No saved rolls yet — pin one below.</div>
      ) : (
        <div className="res-list">
          {saved.map((roll, i) => (
            <SavedRollRow
              key={roll.id}
              roll={roll}
              resolved={resolved[i]!}
              attachable={attachable[i]!}
              rangerAttachable={rangerAttachable}
              offHandWeapons={offHandWeapons}
              onUpdate={(patch) => update((d) => updateSavedRoll(d, roll.id, patch))}
              onSetTwf={(twf) => update((d) => setSavedRollTwf(d, roll.id, twf))}
              onRemove={() => update((d) => removeSavedRoll(d, roll.id))}
              onAddFeat={(ref) => update((d) => addSavedRollFeat(d, roll.id, ref))}
              onRemoveFeat={(slug) => update((d) => removeSavedRollFeat(d, roll.id, slug))}
              onSetFeatOption={(slug, option) =>
                update((d) => setSavedRollFeatOption(d, roll.id, slug, option))
              }
              onAddRanger={(ref) => update((d) => addSavedRollRanger(d, roll.id, ref))}
              onRemoveRanger={(kind, type) =>
                update((d) => removeSavedRollRanger(d, roll.id, kind, type))
              }
            />
          ))}
        </div>
      )}

      <div className="subsection saved-roll-add">
        <div
          className="subsection-header"
          onClick={toggleAddCollapsed}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleAddCollapsed();
          }}
          aria-expanded={!addCollapsed}
        >
          <h4 className="tracker-sub">Add a saved roll</h4>
          <Caret open={!addCollapsed} />
        </div>
        {!addCollapsed && (
          <>
            <Explainer title="How adding a saved roll works">
              <p className="hint">
                Pick a source below, then expand the saved row to attach feats (Rapid Shot, Deadly
                Aim, Power Attack fold in automatically), flag it as two-weapon fighting, or layer a
                manual adjustment — for "Custom", enter a value and damage note by hand.
              </p>
            </Explainer>
            <input
              className="search"
              type="text"
              placeholder="Search attacks, saves…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="scroll short">
              {matches.map((opt, i) => (
                <div className="pick-row" key={`${opt.source.kind}-${i}`}>
                  <div className="pmain">
                    <div className="pname">{opt.label}</div>
                  </div>
                  <button
                    type="button"
                    className="pick-btn add"
                    onClick={() => update((d) => addSavedRoll(d, opt.source, opt.label))}
                  >
                    Add
                  </button>
                </div>
              ))}
              {matches.length === 0 ? <div className="empty">No matches.</div> : null}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

/**
 * One saved roll: a name/value/damage/remove line with attached-feat chips +
 * feat notes underneath, expanding below (full row width) to its `Provenance`
 * breakdown plus feat attach/detach controls and editable attack/damage
 * adjustments — or, for a custom roll, a manual value + damage note.
 */
function SavedRollRow({
  roll,
  resolved,
  attachable,
  rangerAttachable,
  offHandWeapons,
  onUpdate,
  onSetTwf,
  onRemove,
  onAddFeat,
  onRemoveFeat,
  onSetFeatOption,
  onAddRanger,
  onRemoveRanger,
}: {
  roll: SavedRoll;
  resolved: ResolvedSavedRoll;
  attachable: AttachableFeat[];
  rangerAttachable: SavedRollRangerRef[];
  offHandWeapons: string[];
  onUpdate: (
    patch: Partial<Pick<SavedRoll, "label" | "attackModifier" | "damageModifier" | "customDamage">>,
  ) => void;
  onSetTwf: (twf: SavedRollTwf | undefined) => void;
  onRemove: () => void;
  onAddFeat: (ref: SavedRollFeatRef) => void;
  onRemoveFeat: (slug: string) => void;
  onSetFeatOption: (slug: string, option: string | undefined) => void;
  onAddRanger: (ref: SavedRollRangerRef) => void;
  onRemoveRanger: (kind: SavedRollRangerRef["kind"], type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const isCustom = roll.source.kind === "custom";
  const isWeapon = roll.source.kind === "weapon";
  const twf = twfConfig(roll);

  const attached = new Set((roll.feats ?? []).map((f) => f.slug));
  const addChoices = attachable.filter((f) => !attached.has(f.slug));
  /** Registry options for an attached chip's variant select, when the feat declares any. */
  const optionsFor = (slug: string) => attachable.find((f) => f.slug === slug)?.options;

  const rangerAttached = new Set((roll.rangerBonuses ?? []).map((b) => `${b.kind}:${b.type}`));
  const rangerAddChoices = rangerAttachable.filter(
    (b) => !rangerAttached.has(`${b.kind}:${b.type}`),
  );

  return (
    <div className="res-row saved-roll-row">
      <div className="saved-roll-head">
        <div className="saved-roll-title">
          <RenameField value={roll.label} onCommit={(label) => onUpdate({ label })} />
          {resolved.missing ? <div className="res-sub">source no longer available</div> : null}
        </div>
        <div className="saved-roll-values">
          <div className="saved-roll-value-line">
            <button
              type="button"
              className="res-count saved-roll-value-btn"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((o) => !o)}
            >
              <span className="caret">{open ? "▲" : "▼"}</span>
              {resolved.offHand ? <span className="saved-roll-hand-label">Main-hand</span> : null}
              <span className="saved-roll-value-num">{resolved.display}</span>
            </button>
            {resolved.formula ? (
              <CopyButton
                className="copy-btn--row"
                text={resolved.formula}
                label={resolved.offHand ? `${roll.label} (main-hand)` : roll.label}
              />
            ) : null}
            {resolved.damage ? (
              <span className="saved-roll-damage" title="Damage">
                {resolved.damage.display}
                {resolved.damage.crit ? ` (${resolved.damage.crit})` : ""}
              </span>
            ) : null}
            {resolved.damage ? (
              <CopyButton
                className="copy-btn--row"
                text={resolved.damage.formula}
                label={`${roll.label} damage`}
              />
            ) : null}
          </div>
          {resolved.offHand ? (
            <div
              className="saved-roll-value-line saved-roll-value-line--off"
              title="Off-hand attack sequence (two-weapon fighting)"
            >
              <span className="caret caret-ghost" aria-hidden="true">
                ▼
              </span>
              <span className="saved-roll-hand-label">Off-hand</span>
              <span className="saved-roll-value-num">{resolved.offHand}</span>
              {resolved.offHandFormula ? (
                <CopyButton
                  className="copy-btn--row"
                  text={resolved.offHandFormula}
                  label={`${roll.label} (off-hand)`}
                />
              ) : null}
              {resolved.offHandDamage ? (
                <span className="saved-roll-damage" title="Off-hand damage">
                  {resolved.offHandDamage.display}
                  {resolved.offHandDamage.crit ? ` (${resolved.offHandDamage.crit})` : ""}
                </span>
              ) : null}
              {resolved.offHandDamage ? (
                <CopyButton
                  className="copy-btn--row"
                  text={resolved.offHandDamage.formula}
                  label={`${roll.label} off-hand damage`}
                />
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="res-btns">
          <button
            type="button"
            className="btn-ghost"
            onClick={onRemove}
            aria-label={`remove ${roll.label}`}
          >
            ✕
          </button>
        </div>
      </div>
      {resolved.featChips.length > 0 || resolved.rangerChips.length > 0 ? (
        <div className="chips saved-roll-chips">
          {resolved.rangerChips.map((chip) => (
            <span
              key={`${chip.kind}:${chip.type}`}
              className={`chip feat-chip ranger-chip${!chip.applied ? " unowned" : ""}`}
              title={
                chip.applied
                  ? `${chip.name} — ${chip.kind === "favored-enemy" ? "favored enemy" : "favored terrain"} +${chip.bonus}`
                  : `${chip.name} — no longer a favored pick; not applied`
              }
            >
              {chip.name}
              {chip.applied ? ` +${chip.bonus}` : ""}
              {open ? (
                <button
                  type="button"
                  className="chip-x"
                  onClick={() => onRemoveRanger(chip.kind, chip.type)}
                  aria-label={`detach ${chip.name}`}
                >
                  ✕
                </button>
              ) : null}
            </span>
          ))}
          {resolved.featChips.map((chip) => (
            <span
              key={chip.slug}
              className={`chip feat-chip${!chip.owned ? " unowned" : ""}${chip.auto ? " auto" : ""}`}
              title={
                !chip.owned
                  ? `${chip.name} — not currently owned; not applied`
                  : chip.auto
                    ? `${chip.name} — ${chip.note}${chip.applied ? "" : " (prerequisite missing)"}`
                    : chip.modeled
                      ? undefined
                      : `${chip.name} — reminder only (no automatic numbers)`
              }
            >
              {chip.name}
              {open && !chip.auto && optionsFor(chip.slug) ? (
                <select
                  className="dur-unit"
                  value={chip.option ?? ""}
                  aria-label={`${chip.name} variant`}
                  onChange={(e) => onSetFeatOption(chip.slug, e.target.value || undefined)}
                >
                  {optionsFor(chip.slug)!.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : null}
              {open && !chip.auto ? (
                <button
                  type="button"
                  className="chip-x"
                  onClick={() => onRemoveFeat(chip.slug)}
                  aria-label={`detach ${chip.name}`}
                >
                  ✕
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      {resolved.notes.length > 0 ? (
        <div className="saved-roll-notes">{resolved.notes.join(" · ")}</div>
      ) : null}
      {open ? (
        <div id={panelId} className="saved-roll-detail">
          {resolved.components.length > 0 ? (
            <Provenance
              title={
                isCustom ? "Value breakdown" : `${roll.label} breakdown${twf ? " (main hand)" : ""}`
              }
              components={resolved.components}
            />
          ) : null}

          {resolved.offHandComponents && resolved.offHandComponents.length > 0 ? (
            <Provenance title="Off-hand breakdown" components={resolved.offHandComponents} />
          ) : null}

          {isAttackLikeSource(roll.source) ? (
            <div className="saved-roll-adjust saved-roll-twf">
              <label className="saved-roll-twf-toggle">
                <input
                  type="checkbox"
                  checked={twf !== undefined}
                  onChange={(e) => onSetTwf(e.target.checked ? { offHand: "light" } : undefined)}
                />
                Two-weapon fighting
              </label>
              {twf ? (
                <>
                  <select
                    value={twf.offHand}
                    aria-label="Off-hand grip"
                    onChange={(e) =>
                      onSetTwf({ ...twf, offHand: e.target.value as SavedRollTwf["offHand"] })
                    }
                  >
                    <option value="light">Light off-hand</option>
                    <option value="one-handed">One-handed off-hand</option>
                  </select>
                  <select
                    value={twf.offHandWeapon ?? ""}
                    aria-label="Off-hand weapon"
                    onChange={(e) =>
                      onSetTwf({ ...twf, offHandWeapon: e.target.value || undefined })
                    }
                  >
                    <option value="">Off-hand weapon…</option>
                    {offHandWeapons.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
          ) : null}

          {addChoices.length > 0 ? (
            <label className="saved-roll-adjust saved-roll-feat-add">
              + feat
              <select
                value=""
                aria-label={`attach a feat to ${roll.label}`}
                onChange={(e) => {
                  const feat = addChoices.find((f) => f.slug === e.target.value);
                  if (!feat) return;
                  onAddFeat({
                    slug: feat.slug,
                    name: feat.name,
                    option: feat.options?.[0]?.id,
                  });
                }}
              >
                <option value="">Attach a feat…</option>
                {addChoices.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.name}
                    {f.modeled ? " (auto)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {rangerAddChoices.length > 0 ? (
            <label className="saved-roll-adjust saved-roll-feat-add">
              + favored
              <select
                value=""
                aria-label={`attach a favored enemy or terrain to ${roll.label}`}
                onChange={(e) => {
                  const ref = rangerAddChoices.find(
                    (b) => `${b.kind}:${b.type}` === e.target.value,
                  );
                  if (ref) onAddRanger(ref);
                }}
              >
                <option value="">Favored enemy / terrain…</option>
                {rangerAddChoices.map((b) => (
                  <option key={`${b.kind}:${b.type}`} value={`${b.kind}:${b.type}`}>
                    {b.name} ({b.kind === "favored-enemy" ? "enemy" : "terrain"})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="saved-roll-adjust">
            {isCustom ? "Value" : "Attack adjustment"}
            <NumberField
              className="num"
              size={4}
              stepper={false}
              allowEmpty
              placeholder="0"
              value={roll.attackModifier}
              onCommit={(n) => onUpdate({ attackModifier: n })}
              aria-label={isCustom ? "Custom value" : "Attack adjustment"}
            />
          </label>

          {isCustom ? (
            <label className="saved-roll-adjust saved-roll-adjust--wide">
              Damage note
              <input
                type="text"
                placeholder="e.g. 2d6+4, x3 crit"
                value={roll.customDamage ?? ""}
                onChange={(e) => onUpdate({ customDamage: e.target.value || undefined })}
              />
            </label>
          ) : null}

          {isWeapon ? (
            <>
              {resolved.damage && resolved.damage.components.length > 0 ? (
                <Provenance title="Damage breakdown" components={resolved.damage.components} />
              ) : null}
              <label className="saved-roll-adjust">
                Damage adjustment
                <NumberField
                  className="num"
                  size={4}
                  stepper={false}
                  allowEmpty
                  placeholder="0"
                  value={roll.damageModifier}
                  onCommit={(n) => onUpdate({ damageModifier: n })}
                  aria-label="Damage adjustment"
                />
              </label>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Inline-editable label, committed on blur/Enter (mirrors NumberField's commit model). */
function RenameField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  return (
    <input
      className="res-name saved-roll-name"
      type="text"
      value={local}
      aria-label="Saved roll name"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const trimmed = local.trim();
        if (trimmed && trimmed !== value) onCommit(trimmed);
        else setLocal(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

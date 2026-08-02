/**
 * Settings section — shown when the user switches to the "Settings" mode tab.
 * Controls: HP mode, FCB rule toggle, max hero-point cap, and manual stat
 * overrides for the bounded allowlist. Each control calls a pure model
 * transition and delegates persistence to the parent's `update` callback.
 *
 * Panels are grouped and each wrapped in a `.settings-section` anchor whose
 * `data-nav-*` feed the sticky `SettingsNav` jump rail (rendered from
 * `App.tsx`'s layout) — same arrangement as the tracker column and PlayNav.
 */
import { useState, type ChangeEvent, type ReactNode } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import { absoluteLink, whatsNewHash } from "../../model/appLocation.js";
import { CHANGELOG, formatEntryDate } from "../../model/changelog.js";
import { COVERAGE_NOTES } from "../../model/coverageNotes.js";
import { characterExportFilename, characterExportJson } from "../../model/exportCharacter.js";
import {
  setClericWisdomHouserule,
  setEncumbranceEnabled,
  setFcbHouserule,
  setFractionalBonuses,
  setGmGrantFeatSlots,
  setGmGrantSkillRanks,
  setHeroPointsCap,
  setHeroPointsEnabled,
  setHpMode,
  setIgnoreClassAlignmentRestrictions,
  setPolymorphEnabled,
  setRestMode,
  setStatOverride,
  setXpEnabled,
  setXpTrack,
  STAT_OVERRIDE_KEYS,
  type StatOverrideKey,
} from "../../model/doc.js";
import type { ImportReport } from "../../model/externalImport.js";
import { HERO_POINT_CAP } from "../../model/heroPoints.js";
import { importCharacterFile } from "../../model/importExternalFile.js";
import { DEFAULT_XP_TRACK, type XpTrack } from "../../model/xp.js";
import { showToast } from "../../state/toast.js";
import { TEXT_SIZE_LABEL, TEXT_SIZES, type TextSize } from "../../state/useTextSize.js";
import { CopyButton } from "../CopyButton.js";
import { Explainer } from "../Explainer.js";
import { GearIcon, HeartIcon, SparklesIcon } from "../icons.js";
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

/**
 * "Fighter 8 / Rogue 2"-style compact class summary for the import toast.
 * `refData.classes` is keyed by compendium id, not by the slug stored in
 * `identity.classes[].tag` — has to be searched by each class's own `.tag`
 * field, same as every other class-name lookup in this codebase (e.g.
 * `model/feats.ts`, `ClassesSection.tsx`).
 */
function classSummary(parsed: CharacterDoc, refData: RefData): string {
  const classesByTag = Object.values(refData.classes);
  return parsed.identity.classes
    .map((c) => `${classesByTag.find((def) => def.tag === c.tag)?.name ?? c.tag} ${c.level}`)
    .join(" / ");
}

interface SettingsGroup {
  name: string;
  sections: { id: string; label: string; node: ReactNode }[];
}

/** Human-readable labels for the stat-override allowlist. */
const STAT_LABEL: Record<StatOverrideKey, string> = {
  "hp.max": "HP max",
  "ac.normal": "AC (normal)",
  "speeds.land": "Land speed",
  "initiative.total": "Initiative",
  bab: "BAB",
  cmd: "CMD",
  cmb: "CMB",
  "saves.fort.total": "Fort save",
  "saves.ref.total": "Ref save",
  "saves.will.total": "Will save",
};

export function SettingsSection({
  doc,
  sheet,
  refData,
  update,
  onImportCharacter,
  onResetAll,
  onDeleteCharacter,
  actionPending,
  onOpenPrint,
  textSize,
  onTextSizeChange,
}: BuilderProps & {
  onImportCharacter: (doc: CharacterDoc) => void;
  onResetAll: () => void;
  onDeleteCharacter: (id: string) => void;
  actionPending: boolean;
  onOpenPrint: () => void;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
}) {
  const settings = doc.build.settings ?? {};
  const hpMode = settings.hpMode ?? "average";
  const restMode = settings.restMode ?? "full";
  const fcbHouserule = settings.fcbHouserule ?? false;
  const clericWisdomHouserule = settings.clericWisdomHouserule ?? false;
  const heroEnabled = settings.heroPointsEnabled ?? true;
  const heroCap = settings.heroPointsCap ?? HERO_POINT_CAP;
  const xpEnabled = settings.xpEnabled ?? false;
  const xpTrack = settings.xpTrack ?? DEFAULT_XP_TRACK;
  const encumbranceEnabled = settings.encumbranceEnabled ?? false;
  const fractionalBonuses = settings.fractionalBonuses ?? false;
  const polymorphEnabled = settings.polymorphEnabled;
  const ignoreAlignmentRestrictions = settings.ignoreClassAlignmentRestrictions ?? false;
  const overrides = settings.statOverrides ?? {};
  const gmSkillRanks = doc.build.gmGrants?.skillRanks;
  const gmFeatSlots = doc.build.gmGrants?.featSlots;
  const [importError, setImportError] = useState<string>();
  const [importReport, setImportReport] = useState<ImportReport>();

  function handleExport() {
    const blob = new Blob([characterExportJson(doc)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = characterExportFilename(doc);
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Reads the file's text and auto-detects its format: a native Ledgermain
   * export (.json), a Pathbuilder 1e export (.json), or a Hero Lab classic
   * export (.xml) — see `model/importExternalFile.ts`. A native export
   * carries no `report` (nothing to map); the other two formats always
   * produce one so the player can see what did/didn't come across.
   *
   * Feedback (UX audit: "feedback: toasts + undo") — importing used to
   * silently swap the active character with no confirmation of what just
   * loaded. A native export preserves its original `id`, so re-importing the
   * same export while it's already the active character overwrites it in
   * place (Dexie `put` upserts by id) rather than adding a new one — that
   * case gets "Updated {name}" instead of "Imported {name} (...)". This only
   * compares against the CURRENTLY ACTIVE doc's id, not every saved
   * character on the device, so a native re-import that happens to collide
   * with some other (not-currently-open) saved character is still reported
   * as "Imported" even though it also updates in place — an accepted
   * approximation to avoid threading the full saved-character list into this
   * handler for a one-line toast.
   */
  async function handleImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { doc: parsed, report } = importCharacterFile(await file.text(), refData);
      setImportError(undefined);
      setImportReport(report);
      onImportCharacter(parsed);
      const isUpdateInPlace = !report && parsed.id === doc.id;
      showToast({
        message: isUpdateInPlace
          ? `Updated ${parsed.identity.name}`
          : `Imported ${parsed.identity.name} (${classSummary(parsed, refData)})`,
      });
    } catch (err) {
      setImportReport(undefined);
      setImportError(err instanceof Error ? err.message : "Couldn't read that file.");
    }
  }

  const groups: SettingsGroup[] = [
    {
      name: "Display",
      sections: [
        {
          id: "settings-text-size",
          label: "Text Size",
          node: (
            /* Device preference — not part of the character */
            <Panel title="Text Size" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Text size for this browser/device. Not saved with the character — every character on
                this device uses the same setting.
              </p>
              <div className="chips">
                {TEXT_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    aria-pressed={textSize === s}
                    onClick={() => onTextSizeChange(s)}
                  >
                    {TEXT_SIZE_LABEL[s]}
                  </button>
                ))}
              </div>
            </Panel>
          ),
        },
      ],
    },
    {
      name: "Rules",
      sections: [
        {
          id: "settings-hp-mode",
          label: "HP Mode",
          node: (
            <Panel title="HP Mode" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Controls how maximum HP is computed when levelling up.
              </p>
              <div className="chips">
                {(["average", "max", "rolled"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="chip"
                    aria-pressed={hpMode === m}
                    onClick={() => update((d) => setHpMode(d, m))}
                  >
                    {m === "average" ? "Average (default)" : m === "max" ? "Maximised" : "Rolled"}
                  </button>
                ))}
              </div>
              <p className="hint" style={{ marginTop: 10, fontSize: "0.75rem" }}>
                {hpMode === "average" && "L1 = max HD; each subsequent level = ⌊HD/2⌋ + 1."}
                {hpMode === "max" && "Every level equals the full die value."}
                {hpMode === "rolled" &&
                  "L1 = max HD; enter your rolls per level in the Hit Points panel."}
              </p>
            </Panel>
          ),
        },
        {
          id: "settings-rest",
          label: "Rest Healing",
          node: (
            <Panel title="Rest Healing" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Controls how much HP the "Rest" button and "New Day" action restore overnight.
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={restMode === "full"}
                  onClick={() => update((d) => setRestMode(d, "full"))}
                >
                  Full (house rule)
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={restMode === "natural"}
                  onClick={() => update((d) => setRestMode(d, "natural"))}
                >
                  Natural (1×level per night, RAW)
                </button>
              </div>
              <p className="hint" style={{ marginTop: 10, fontSize: "0.75rem" }}>
                {restMode === "full"
                  ? "Heals current HP straight to max — a common table simplification."
                  : "Heals 1 HP per character level per night, capped at max (PF1 RAW). Full bed rest (2×level/day) isn't modelled yet."}{" "}
                Nonlethal damage always clears fully on rest.
              </p>
            </Panel>
          ),
        },
        {
          id: "settings-fcb",
          label: "Favored Class",
          node: (
            <Panel title="Favored Class Bonus Rule" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Standard PF1: each favored-class level grants <em>one</em> of +1 HP, +1 skill rank,
                or alternate. House-rule: a "Both" option adds +1 HP AND +1 skill rank
                simultaneously.
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={!fcbHouserule}
                  onClick={() => update((d) => setFcbHouserule(d, false))}
                >
                  Standard PF1
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={fcbHouserule}
                  onClick={() => update((d) => setFcbHouserule(d, true))}
                >
                  House-rule (Both)
                </button>
              </div>
            </Panel>
          ),
        },
        {
          id: "settings-cleric-wis",
          label: "Cleric Wisdom",
          node: (
            <Panel title="Cleric Wisdom Rule" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Homebrew rule (issue #56): cleric class features — Channel Energy's uses/day and
                save DC — key off <em>Wisdom</em> instead of Charisma. The cleric's actual Charisma
                score, skills, and saves are unaffected; other Cha-driven classes (paladin,
                sorcerer, oracle, bard) are untouched either way.
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={!clericWisdomHouserule}
                  onClick={() => update((d) => setClericWisdomHouserule(d, false))}
                >
                  Standard PF1 (Cha)
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={clericWisdomHouserule}
                  onClick={() => update((d) => setClericWisdomHouserule(d, true))}
                >
                  House-rule (Wis)
                </button>
              </div>
            </Panel>
          ),
        },
        {
          id: "settings-hero",
          label: "Hero Points",
          node: (
            <Panel title="Hero Points" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Hero points are a PF1 optional rule — a small pool spent at the table for mechanical
                benefits. Disable if your table doesn't use them.
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={heroEnabled}
                  onClick={() => update((d) => setHeroPointsEnabled(d, true))}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={!heroEnabled}
                  onClick={() => update((d) => setHeroPointsEnabled(d, false))}
                >
                  Disabled
                </button>
              </div>
              {heroEnabled && (
                <div className="settings-row" style={{ marginTop: 12 }}>
                  <label className="hint" htmlFor="hero-cap-input">
                    Maximum hero points
                  </label>
                  <NumberField
                    className="num"
                    size={3}
                    value={heroCap}
                    min={1}
                    max={999}
                    onCommit={(n) => update((d) => setHeroPointsCap(d, n))}
                    aria-label="Hero point cap"
                  />
                  {settings.heroPointsCap != null && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => update((d) => setHeroPointsCap(d, null))}
                    >
                      reset to {HERO_POINT_CAP}
                    </button>
                  )}
                </div>
              )}
            </Panel>
          ),
        },
        {
          id: "settings-xp",
          label: "Experience",
          node: (
            <Panel title="Experience Points" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Some tables level up at milestones instead. Enable to log XP and see how far you are
                from the next level.
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={xpEnabled}
                  onClick={() => update((d) => setXpEnabled(d, true))}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={!xpEnabled}
                  onClick={() => update((d) => setXpEnabled(d, false))}
                >
                  Disabled
                </button>
              </div>
              {xpEnabled && (
                <div className="settings-row" style={{ marginTop: 12 }}>
                  <label className="hint" htmlFor="xp-track-select">
                    Advancement track
                  </label>
                  <select
                    id="xp-track-select"
                    value={xpTrack}
                    onChange={(e) => update((d) => setXpTrack(d, e.target.value as XpTrack))}
                  >
                    <option value="slow">Slow</option>
                    <option value="medium">Medium (default)</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              )}
            </Panel>
          ),
        },
        {
          id: "settings-encumbrance",
          label: "Encumbrance",
          node: (
            <Panel title="Encumbrance" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Carrying capacity is a PF1 OPTIONAL rule — many tables skip it. Enable to compute a
                Strength-based load tier (light/medium/heavy) from your total gear weight and apply
                its RAW penalties (max Dex to AC, armor check penalty, reduced land speed).
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={encumbranceEnabled}
                  onClick={() => update((d) => setEncumbranceEnabled(d, true))}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={!encumbranceEnabled}
                  onClick={() => update((d) => setEncumbranceEnabled(d, false))}
                >
                  Disabled (default)
                </button>
              </div>
              {encumbranceEnabled && (
                <p className="hint" style={{ marginTop: 10, fontSize: "0.75rem" }}>
                  See the Load readout on the Gear &amp; Inventory panel (Build tab) for your
                  current weight, thresholds, and tier.
                </p>
              )}
            </Panel>
          ),
        },
        {
          id: "settings-fractional",
          label: "Fractional Bonuses",
          node: (
            <Panel title="Fractional Base Bonuses" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                A Pathfinder Unchained optional rule for multiclass characters. Instead of rounding
                each class's base attack bonus and base saves down separately, it adds up the exact
                fractions (1, 3/4, or 1/2 BAB per level; 1/2 or 1/3 per save) and rounds down once
                at the end. A good save's +2 works like a class skill's +3: you get it once for each
                save, however many of your classes are good at it.
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={fractionalBonuses}
                  onClick={() => update((d) => setFractionalBonuses(d, true))}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={!fractionalBonuses}
                  onClick={() => update((d) => setFractionalBonuses(d, false))}
                >
                  Disabled (default)
                </button>
              </div>
              <p className="hint" style={{ marginTop: 10, fontSize: "0.75rem" }}>
                {doc.identity.classes.length > 1
                  ? "Usually raises your attack bonus and lowers a save two of your classes are both good at."
                  : "This character has one class, so the rule changes nothing until you multiclass."}
              </p>
            </Panel>
          ),
        },
        {
          id: "settings-polymorph",
          label: "Polymorph",
          node: (
            <Panel title="Polymorph / Wild Shape" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                By default the tracker only offers the Polymorph / Wild Shape panel when this
                character has a source for it — druid Wild Shape levels, the shifter class, or a
                known Beast Shape / Elemental Body / Plant Shape spell. Force it on if your access
                is off-sheet (a scroll, a potion, a GM handout).
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={polymorphEnabled === undefined}
                  onClick={() => update((d) => setPolymorphEnabled(d, null))}
                >
                  Auto (default)
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={polymorphEnabled === true}
                  onClick={() => update((d) => setPolymorphEnabled(d, true))}
                >
                  Always show
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={polymorphEnabled === false}
                  onClick={() => update((d) => setPolymorphEnabled(d, false))}
                >
                  Never show
                </button>
              </div>
              {polymorphEnabled === false && doc.live.activeForm ? (
                <p className="hint" style={{ marginTop: 10, fontSize: "0.75rem" }}>
                  This character is currently transformed, so the panel stays visible until the form
                  ends.
                </p>
              ) : null}
            </Panel>
          ),
        },
        {
          id: "settings-alignment",
          label: "Alignment",
          node: (
            <Panel title="Class Alignment Restrictions" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                PF1 RAW restricts a few classes (Barbarian, Monk, Paladin, Druid) to certain
                alignments. Ledgermain only ever warns on a mismatch in the Classes panel, never
                blocks — enable this for tables that don't use alignment restrictions at all.
              </p>
              <div className="chips">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={!ignoreAlignmentRestrictions}
                  onClick={() => update((d) => setIgnoreClassAlignmentRestrictions(d, false))}
                >
                  Warn on mismatch (default)
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={ignoreAlignmentRestrictions}
                  onClick={() => update((d) => setIgnoreClassAlignmentRestrictions(d, true))}
                >
                  Unrestricted (house rule)
                </button>
              </div>
            </Panel>
          ),
        },
      ],
    },
    {
      name: "Overrides",
      sections: [
        {
          id: "settings-gm-grants",
          label: "GM Grants",
          node: (
            <Panel title="GM Grants" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Homebrew adjustments to how many skill ranks and feats this character may spend.
                Additive to the rules-derived budget — negative values claw back. Leave blank to use
                the rules amount.
              </p>
              <div className="settings-row" style={{ marginBottom: 10 }}>
                <label className="hint" htmlFor="gm-skill-input">
                  Extra skill ranks
                </label>
                <NumberField
                  className="num"
                  size={5}
                  value={gmSkillRanks ?? undefined}
                  allowEmpty
                  placeholder="0"
                  min={-999}
                  max={999}
                  stepper={false}
                  onCommit={(n) =>
                    update((d) => setGmGrantSkillRanks(d, n == null || Number.isNaN(n) ? null : n))
                  }
                  aria-label="Extra skill ranks"
                />
                {gmSkillRanks != null && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => update((d) => setGmGrantSkillRanks(d, null))}
                  >
                    clear
                  </button>
                )}
              </div>
              <div className="settings-row">
                <label className="hint" htmlFor="gm-feat-input">
                  Extra feat slots
                </label>
                <NumberField
                  className="num"
                  size={5}
                  value={gmFeatSlots ?? undefined}
                  allowEmpty
                  placeholder="0"
                  min={-999}
                  max={999}
                  stepper={false}
                  onCommit={(n) =>
                    update((d) => setGmGrantFeatSlots(d, n == null || Number.isNaN(n) ? null : n))
                  }
                  aria-label="Extra feat slots"
                />
                {gmFeatSlots != null && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => update((d) => setGmGrantFeatSlots(d, null))}
                  >
                    clear
                  </button>
                )}
              </div>
            </Panel>
          ),
        },
        {
          id: "settings-stat-overrides",
          label: "Stat Overrides",
          node: (
            <Panel title="Manual Stat Overrides" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Force a derived stat to a specific value. Leave blank to use the computed value. The
                breakdown shows the override as a separate component.
              </p>
              <div className="stat-overrides-grid">
                {STAT_OVERRIDE_KEYS.map((key) => {
                  const override = overrides[key];
                  const computed = resolveComputed(key, sheet);
                  return (
                    <div key={key} className="stat-override-row">
                      <span className="hint stat-override-label">{STAT_LABEL[key]}</span>
                      <span className="hint num stat-override-computed">
                        {computed != null ? computed : "—"}
                      </span>
                      <NumberField
                        className="num"
                        size={5}
                        value={override ?? undefined}
                        allowEmpty
                        placeholder={computed != null ? String(computed) : undefined}
                        min={-999}
                        max={99999}
                        stepper={false}
                        onCommit={(n) =>
                          update((d) =>
                            setStatOverride(d, key, n == null || Number.isNaN(n) ? null : n),
                          )
                        }
                        aria-label={`Override ${STAT_LABEL[key]}`}
                      />
                      {override != null && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => update((d) => setStatOverride(d, key, null))}
                        >
                          clear
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          ),
        },
      ],
    },
    {
      name: "Data",
      sections: [
        {
          id: "settings-export-import",
          label: "Export / Import",
          node: (
            <Panel title="Export / Import" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                Export this character to a JSON file you can back up or move to another device. The
                importer auto-detects the file: a Ledgermain export (.json) makes the character
                active in place (re-importing the same export updates it; a different file adds a
                new one); a Pathbuilder 1e export (.json) or Hero Lab classic export (.xml) is added
                as a new character, best-effort — anything that couldn't be matched to this app's
                reference data is listed below so you can add it by hand.
              </p>
              <div className="settings-row">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={actionPending}
                  onClick={handleExport}
                >
                  Export character (.json)
                </button>
                <label
                  className={`btn-ghost${actionPending ? " btn-disabled" : ""}`}
                  style={{ cursor: actionPending ? "wait" : "pointer" }}
                >
                  Import character…
                  <input
                    type="file"
                    accept=".json,.xml,.html,application/json,text/xml,text/html"
                    disabled={actionPending}
                    style={{ display: "none" }}
                    onChange={(e) => void handleImportChange(e)}
                  />
                </label>
              </div>
              {importError && (
                <p className="hint" style={{ color: "var(--oxblood-ink)", marginTop: 8 }}>
                  {importError}
                </p>
              )}
              {importReport && <ImportReportPanel report={importReport} />}
            </Panel>
          ),
        },
        {
          id: "settings-print",
          label: "Print",
          node: (
            <Panel title="Print" step="⚙" icon={<GearIcon />}>
              <p className="hint" style={{ marginBottom: 12 }}>
                A dense, read-only reference layout of this character's current stats — abilities,
                saves, AC, attacks, skills, feats, class features, spell slots/known, and resources
                — sized for printing or saving to PDF from the browser's print dialog.
              </p>
              <div className="settings-row">
                <button type="button" className="btn-ghost" onClick={onOpenPrint}>
                  Print character sheet…
                </button>
              </div>
            </Panel>
          ),
        },
      ],
    },
    {
      // What's new, then what's not covered — added next to missing, in that order.
      name: "About",
      sections: [
        { id: "settings-whats-new", label: "What's New", node: <WhatsNewPanel /> },
        { id: "settings-coverage", label: "Not Covered", node: <CoverageNotesPanel /> },
        {
          id: "settings-about",
          label: "About & Legal",
          node: <AboutAndLegalPanel dataVersion={refData.meta.dataVersion} />,
        },
        { id: "settings-support", label: "Support", node: <SupportPanel /> },
      ],
    },
    {
      name: "Danger Zone",
      sections: [
        {
          id: "settings-danger",
          label: "Delete & Reset",
          node: (
            <DangerZonePanel
              characterId={doc.id}
              characterName={doc.identity.name}
              actionPending={actionPending}
              onDeleteCharacter={onDeleteCharacter}
              onResetAll={onResetAll}
            />
          ),
        },
      ],
    },
  ];

  return (
    <div className="settings-col">
      {groups.map((group) => (
        <section className="settings-group" data-group={group.name} key={group.name}>
          <h3 className="settings-group-head">{group.name}</h3>
          {group.sections.map((section) => (
            <div
              className="settings-section"
              id={section.id}
              data-nav-label={section.label}
              data-nav-group={group.name}
              key={section.id}
            >
              {section.node}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

const SOURCE_LABEL: Record<ImportReport["source"], string> = {
  pathbuilder: "Pathbuilder 1e",
  herolab: "Hero Lab classic",
};

/**
 * Renders the mapped/unmapped tally + full lists from a Pathbuilder/Hero Lab
 * import — a native Ledgermain export never produces a report (see
 * `handleImportChange` above), so this only ever appears after a best-effort
 * external import.
 */
function ImportReportPanel({ report }: { report: ImportReport }) {
  return (
    <div className="import-report">
      <p className="hint">
        Imported from {SOURCE_LABEL[report.source]}: {report.mapped.length} mapped,{" "}
        {report.unmapped.length} not recognized.
      </p>
      {report.unmapped.length > 0 && (
        <details open>
          <summary className="hint">Not recognized ({report.unmapped.length})</summary>
          <ul>
            {report.unmapped.map((line, i) => (
              <li key={i} className="hint">
                {line}
              </li>
            ))}
          </ul>
        </details>
      )}
      {report.mapped.length > 0 && (
        <details>
          <summary className="hint">Mapped ({report.mapped.length})</summary>
          <ul>
            {report.mapped.map((line, i) => (
              <li key={i} className="hint">
                {line}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * Static "About & Legal" panel — surfaces the repo's mixed-license notice so
 * the deployed app is compliant at runtime (OGL §10 requires the License to
 * accompany distributed Open Game Content; Paizo's Community Use Policy
 * requires attribution). The linked files are copied into `public/` by
 * `scripts/copy-refdata.ts`.
 */
/** How many entries show without expanding. The rest fold into an Explainer. */
const RECENT_CHANGE_COUNT = 4;

/**
 * Recent player-visible changes, newest first. The most recent few render
 * inline rather than behind the usual collapsed `Explainer`, because the
 * Settings tab's unseen cue is cleared by opening this tab — if the newest
 * entry needed a second click to reach, clearing the cue would be a lie.
 * Content lives in `model/changelog.ts`, maintained by hand.
 */
function WhatsNewPanel() {
  const recent = CHANGELOG.slice(0, RECENT_CHANGE_COUNT);
  const earlier = CHANGELOG.slice(RECENT_CHANGE_COUNT);
  if (recent.length === 0) return null;

  // Deep link straight to this panel, for pointing a table at what changed
  // without walking them through Settings first (`model/appLocation.ts`).
  const link = absoluteLink(window.location.href, whatsNewHash());

  return (
    <Panel
      title="What's New"
      step="✦"
      icon={<SparklesIcon />}
      right={<CopyButton text={link} label="link to What's New" />}
    >
      <ul className="changelog">
        {recent.map((e) => (
          <li key={e.id}>
            <b>{e.title}</b>
            <span className="changelog-date">{formatEntryDate(e.date)}</span>
            <p className="hint">{e.note}</p>
          </li>
        ))}
      </ul>
      {earlier.length > 0 && (
        <Explainer title="Earlier changes">
          <ul className="changelog">
            {earlier.map((e) => (
              <li key={e.id}>
                <b>{e.title}</b>
                <span className="changelog-date">{formatEntryDate(e.date)}</span>
                <p className="hint">{e.note}</p>
              </li>
            ))}
          </ul>
        </Explainer>
      )}
    </Panel>
  );
}

/**
 * A short, honest, player-language rundown of content that's deliberately not
 * covered yet — the Settings-tab counterpart to `SearchMiss` (which flags a
 * gap right where a player hits one, mid-search). Collapsed by default via
 * `Explainer`, matching the house convention that reference prose stays out of
 * the way until asked for. Content lives in `model/coverageNotes.ts`,
 * maintained by hand.
 */
function CoverageNotesPanel() {
  return (
    <Panel title="What's Not Covered" step="⚙" icon={<GearIcon />}>
      <Explainer title="A few things aren't built in yet">
        <p className="hint" style={{ marginBottom: 10 }}>
          Ledgermain covers the core rulebooks well, with a lot of later material besides, but some
          corners are still deliberately thin. If you hit one of these at the table, it's a known
          gap, not a bug.
        </p>
        <ul className="cond-notes">
          {COVERAGE_NOTES.map((n) => (
            <li key={n.category}>
              <b>{n.category}.</b> {n.note}
            </li>
          ))}
        </ul>
        <p className="hint" style={{ marginTop: 10 }}>
          Missing something else, or think one of these should move up the list? Use the Feedback
          button above, or see the project's{" "}
          <a
            href="https://github.com/bjschafer/ledgermain"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>{" "}
          for details.
        </p>
      </Explainer>
    </Panel>
  );
}

function AboutAndLegalPanel({ dataVersion }: { dataVersion: string }) {
  return (
    <Panel title="About & Legal" step="ℹ" icon={<GearIcon />}>
      <p className="hint" style={{ marginBottom: 10 }}>
        Ledgermain is a Pathfinder 1e character builder & tracker. Code is AGPL-3.0-or-later;
        compendium data is Open Game Content under the OGL v1.0a; Paizo Product Identity references
        are used under Paizo's Community Use Policy. Not affiliated with Paizo Inc., Foundry Gaming
        LLC, or Wizards of the Coast.
      </p>
      <p
        className="hint"
        style={{ fontFamily: "var(--mono)", fontSize: "0.6875rem", marginBottom: 10 }}
      >
        Compendium data {dataVersion.slice(0, 10)}
      </p>
      <p className="hint" style={{ marginBottom: 4 }}>
        <a href="/OGL.txt">Open Game License v1.0a</a>
        {" · "}
        <a href="/NOTICE.md">Full notice &amp; attribution</a>
        {" · "}
        <a href="/LICENSE">AGPL-3.0 (code)</a>
        {" · "}
        <a href="https://github.com/bjschafer/ledgermain">Source on GitHub</a>
      </p>
      <p className="hint" style={{ marginTop: 10 }}>
        Questions, bug reports, or licensing contact:{" "}
        <a
          href="https://github.com/bjschafer/ledgermain/issues"
          target="_blank"
          rel="noreferrer noopener"
        >
          github.com/bjschafer/ledgermain/issues
        </a>
      </p>
      <p className="hint" style={{ fontSize: "0.6875rem", marginTop: 10 }}>
        Ledgermain uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's
        Community Use Policy (paizo.com/licenses/communityuse). We are expressly prohibited from
        charging you to use or access this content. Ledgermain is not published, endorsed, or
        specifically approved by Paizo.
      </p>
    </Panel>
  );
}

/**
 * Donation links. Deliberately its own panel rather than a line inside
 * About & Legal: Paizo's Community Use Policy permits donations but requires
 * the project itself stay free and unaffiliated, and a "buy me a coffee"
 * button sitting against Paizo's trademark notice invites exactly the
 * misreading the policy forbids. Everything here must stay optional —
 * no supporter tier may unlock app features or Paizo material.
 */
function SupportPanel() {
  return (
    <Panel title="Support" step="♥" icon={<HeartIcon />}>
      <p className="hint" style={{ marginBottom: 10 }}>
        Ledgermain is free, open source, and always will be — nothing here is behind a paywall or a
        sign-up. If it's saved you time at the table and you'd like to chip in toward the coffee, it
        is very much appreciated and entirely optional.
      </p>
      <p className="hint" style={{ marginBottom: 4 }}>
        <a href="https://ko-fi.com/bjschafer" target="_blank" rel="noreferrer noopener">
          Buy me a coffee (Ko-fi)
        </a>
        {" · "}
        <a href="https://github.com/sponsors/bjschafer" target="_blank" rel="noreferrer noopener">
          GitHub Sponsors
        </a>
      </p>
    </Panel>
  );
}

/**
 * A destructive action gated behind a type-to-confirm input: the button stays
 * disabled until the user types `confirmWord` exactly.
 */
function ConfirmAction({
  description,
  confirmWord,
  buttonLabel,
  disabled,
  onConfirm,
}: {
  description: string;
  confirmWord: string;
  buttonLabel: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText.trim().toUpperCase() === confirmWord;

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        {description}
      </p>
      <div className="settings-row">
        <input
          type="text"
          className="danger-confirm"
          placeholder={`Type "${confirmWord}" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          aria-label={`Type ${confirmWord} to confirm`}
        />
        <button
          type="button"
          className="btn-ghost btn-danger"
          disabled={!canConfirm || disabled}
          onClick={() => {
            onConfirm();
            setConfirmText("");
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </>
  );
}

/**
 * Permanently deletes this character, or every saved character; each action
 * is gated behind its own type-to-confirm input.
 */
function DangerZonePanel({
  characterId,
  characterName,
  actionPending,
  onDeleteCharacter,
  onResetAll,
}: {
  characterId: string;
  characterName: string;
  actionPending: boolean;
  onDeleteCharacter: (id: string) => void;
  onResetAll: () => void;
}) {
  return (
    <Panel title="Delete & Reset" step="⚙" icon={<GearIcon />}>
      <ConfirmAction
        description={`Permanently deletes this character ("${characterName || "Unnamed"}"). This cannot be undone.`}
        confirmWord="DELETE"
        buttonLabel="Delete this character"
        disabled={actionPending}
        onConfirm={() => onDeleteCharacter(characterId)}
      />
      <div style={{ marginTop: 16 }}>
        <ConfirmAction
          description="Permanently deletes every saved character on this device, including this one, and starts over with a single blank character. This cannot be undone."
          confirmWord="RESET"
          buttonLabel="Reset everything"
          disabled={actionPending}
          onConfirm={onResetAll}
        />
      </div>
    </Panel>
  );
}

/** Look up the current computed value for a stat-override key from the sheet. */
function resolveComputed(key: StatOverrideKey, sheet: BuilderProps["sheet"]): number | null {
  switch (key) {
    case "hp.max":
      return sheet.hp.max;
    case "ac.normal":
      return sheet.ac.normal;
    case "speeds.land":
      return sheet.speeds.land ?? null;
    case "initiative.total":
      return sheet.initiative.total;
    case "bab":
      return sheet.bab;
    case "cmd":
      return sheet.cmd;
    case "cmb":
      return sheet.cmb;
    case "saves.fort.total":
      return sheet.saves.fort.total;
    case "saves.ref.total":
      return sheet.saves.ref.total;
    case "saves.will.total":
      return sheet.saves.will.total;
    default:
      return null;
  }
}

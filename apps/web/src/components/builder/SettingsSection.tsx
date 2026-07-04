/**
 * Settings section — shown when the user switches to the "Settings" mode tab.
 * Controls: HP mode, FCB rule toggle, max hero-point cap, and manual stat
 * overrides for the bounded allowlist. Each control calls a pure model
 * transition and delegates persistence to the parent's `update` callback.
 */
import { useState, type ChangeEvent } from "react";

import type { CharacterDoc } from "@pf1/schema";

import { characterExportFilename, characterExportJson } from "../../model/exportCharacter.js";
import {
  setEncumbranceEnabled,
  setFcbHouserule,
  setGmGrantFeatSlots,
  setGmGrantSkillRanks,
  setHeroPointsCap,
  setHeroPointsEnabled,
  setHpMode,
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
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

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
}: BuilderProps & {
  onImportCharacter: (doc: CharacterDoc) => void;
  onResetAll: () => void;
  onDeleteCharacter: (id: string) => void;
  actionPending: boolean;
}) {
  const settings = doc.build.settings ?? {};
  const hpMode = settings.hpMode ?? "average";
  const restMode = settings.restMode ?? "full";
  const fcbHouserule = settings.fcbHouserule ?? false;
  const heroEnabled = settings.heroPointsEnabled ?? true;
  const heroCap = settings.heroPointsCap ?? HERO_POINT_CAP;
  const xpEnabled = settings.xpEnabled ?? false;
  const xpTrack = settings.xpTrack ?? DEFAULT_XP_TRACK;
  const encumbranceEnabled = settings.encumbranceEnabled ?? false;
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
    } catch (err) {
      setImportReport(undefined);
      setImportError(err instanceof Error ? err.message : "Couldn't read that file.");
    }
  }

  return (
    <>
      {/* HP mode */}
      <Panel title="HP Mode" step="⚙">
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
        <p className="hint" style={{ marginTop: 10, fontSize: 12 }}>
          {hpMode === "average" && "L1 = max HD; each subsequent level = ⌊HD/2⌋ + 1."}
          {hpMode === "max" && "Every level equals the full die value."}
          {hpMode === "rolled" &&
            "L1 = max HD; enter your rolls per level in the Hit Points panel."}
        </p>
      </Panel>

      {/* Rest healing mode */}
      <Panel title="Rest Healing" step="⚙">
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
        <p className="hint" style={{ marginTop: 10, fontSize: 12 }}>
          {restMode === "full"
            ? "Heals current HP straight to max — a common table simplification."
            : "Heals 1 HP per character level per night, capped at max (PF1 RAW). Full bed rest (2×level/day) isn't modelled yet."}{" "}
          Nonlethal damage always clears fully on rest.
        </p>
      </Panel>

      {/* FCB rule toggle */}
      <Panel title="Favored Class Bonus Rule" step="⚙">
        <p className="hint" style={{ marginBottom: 12 }}>
          Standard PF1: each favored-class level grants <em>one</em> of +1 HP, +1 skill rank, or
          alternate. House-rule: a "Both" option adds +1 HP AND +1 skill rank simultaneously.
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

      {/* Hero points */}
      <Panel title="Hero Points" step="⚙">
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

      {/* XP tracking */}
      <Panel title="Experience Points" step="⚙">
        <p className="hint" style={{ marginBottom: 12 }}>
          Some tables level up at milestones instead. Enable to log XP and see how far you are from
          the next level.
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

      {/* Encumbrance (issue #16) */}
      <Panel title="Encumbrance" step="⚙">
        <p className="hint" style={{ marginBottom: 12 }}>
          Carrying capacity is a PF1 OPTIONAL rule — many tables skip it. Enable to compute a
          Strength-based load tier (light/medium/heavy) from your total gear weight and apply its
          RAW penalties (max Dex to AC, armor check penalty, reduced land speed).
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
          <p className="hint" style={{ marginTop: 10, fontSize: 12 }}>
            See the Load readout on the Gear &amp; Inventory panel (Build tab) for your current
            weight, thresholds, and tier.
          </p>
        )}
      </Panel>

      {/* GM grants */}
      <Panel title="GM Grants" step="⚙">
        <p className="hint" style={{ marginBottom: 12 }}>
          Homebrew adjustments to how many skill ranks and feats this character may spend. Additive
          to the rules-derived budget — negative values claw back. Leave blank to use the rules
          amount.
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

      {/* Stat overrides */}
      <Panel title="Manual Stat Overrides" step="⚙">
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
                    update((d) => setStatOverride(d, key, n == null || Number.isNaN(n) ? null : n))
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

      {/* Export / import */}
      <Panel title="Export / Import" step="⚙">
        <p className="hint" style={{ marginBottom: 12 }}>
          Export this character to a JSON file you can back up or move to another device. The
          importer auto-detects the file: a Ledgermain export (.json) makes the character active in
          place (re-importing the same export updates it; a different file adds a new one); a
          Pathbuilder 1e export (.json) or Hero Lab classic export (.xml) is added as a new
          character, best-effort — anything that couldn't be matched to this app's reference data is
          listed below so you can add it by hand.
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
              accept=".json,.xml,application/json,text/xml"
              disabled={actionPending}
              style={{ display: "none" }}
              onChange={(e) => void handleImportChange(e)}
            />
          </label>
        </div>
        {importError && (
          <p className="hint" style={{ color: "var(--oxblood)", marginTop: 8 }}>
            {importError}
          </p>
        )}
        {importReport && <ImportReportPanel report={importReport} />}
      </Panel>

      {/* About & legal */}
      <AboutAndLegalPanel />

      {/* Danger zone */}
      <DangerZonePanel
        characterId={doc.id}
        characterName={doc.identity.name}
        actionPending={actionPending}
        onDeleteCharacter={onDeleteCharacter}
        onResetAll={onResetAll}
      />
    </>
  );
}

const SOURCE_LABEL: Record<ImportReport["source"], string> = {
  pathbuilder: "Pathbuilder 1e",
  herolab: "Hero Lab classic",
};

/**
 * Renders the mapped/unmapped tally + full lists from a Pathbuilder/Hero Lab
 * import (issue #3) — a native Ledgermain export never produces a report
 * (see `handleImportChange` above), so this only ever appears after a
 * best-effort external import.
 */
function ImportReportPanel({ report }: { report: ImportReport }) {
  return (
    <div className="import-report" style={{ marginTop: 12 }}>
      <p className="hint" style={{ marginBottom: 6 }}>
        Imported from {SOURCE_LABEL[report.source]}: {report.mapped.length} mapped,{" "}
        {report.unmapped.length} not recognized.
      </p>
      {report.unmapped.length > 0 && (
        <details open>
          <summary className="hint">Not recognized ({report.unmapped.length})</summary>
          <ul style={{ margin: "6px 0 10px", paddingLeft: 20 }}>
            {report.unmapped.map((line, i) => (
              <li key={i} className="hint" style={{ fontSize: 12 }}>
                {line}
              </li>
            ))}
          </ul>
        </details>
      )}
      {report.mapped.length > 0 && (
        <details>
          <summary className="hint">Mapped ({report.mapped.length})</summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
            {report.mapped.map((line, i) => (
              <li key={i} className="hint" style={{ fontSize: 12 }}>
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
function AboutAndLegalPanel() {
  return (
    <Panel title="About & Legal" step="ℹ">
      <p className="hint" style={{ marginBottom: 10 }}>
        Ledgermain is a Pathfinder 1e character builder & tracker. Code is MIT; compendium data is
        Open Game Content under the OGL v1.0a; Paizo Product Identity references are used under
        Paizo's Community Use Policy. Not affiliated with Paizo Inc., Foundry Gaming LLC, or Wizards
        of the Coast.
      </p>
      <p className="hint" style={{ marginBottom: 4 }}>
        <a href="/OGL.txt">Open Game License v1.0a</a>
        {" · "}
        <a href="/NOTICE.md">Full notice &amp; attribution</a>
        {" · "}
        <a href="/LICENSE">MIT (code)</a>
        {" · "}
        <a href="https://github.com/bjschafer/ledgermain">Source on GitHub</a>
      </p>
      <p className="hint" style={{ fontSize: 11, marginTop: 10 }}>
        This product uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's
        Community Use Policy. We are expressly prohibited from charging you to use or access this
        product.
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
    <Panel title="Danger Zone" step="⚙">
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

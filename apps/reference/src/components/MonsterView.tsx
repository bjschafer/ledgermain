import type { Monster, MonsterTemplate } from "@pf1/schema";
import { useMemo, useState } from "react";

import { applyAdjustments } from "../model/adjust/apply.js";
import { AUGMENT_SUMMONING, STATBLOCK_TEMPLATES } from "../model/adjust/templates.js";
import type { AdjustNote, StatblockAdjustment } from "../model/adjust/types.js";
import { AdjustmentNotes, AdjustmentPicker } from "./AdjustPanel.js";
import { Chip, Description, Row, Sources } from "./parts.js";

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_LABEL: Record<(typeof ABILITY_ORDER)[number], string> = {
  str: "Str",
  dex: "Dex",
  con: "Con",
  int: "Int",
  wis: "Wis",
  cha: "Cha",
};

/** `Str 10, Dex 17, Con —, Int 2, Wis 13, Cha 4` — a missing score is the printed em dash. */
function abilityLine(monster: Monster): string | null {
  if (!monster.abilityScores) return null;
  return ABILITY_ORDER.map(
    (key) => `${ABILITY_LABEL[key]} ${monster.abilityScores?.[key] ?? "—"}`,
  ).join(", ");
}

/** `N Small animal (air, extraplanar)` — the printed type line. */
function typeLine(monster: Monster): string | null {
  const head = [monster.alignment, monster.size, monster.creatureType].filter(Boolean).join(" ");
  const subtypes = monster.subtypes?.length ? ` (${monster.subtypes.join(", ")})` : "";
  return head || subtypes ? `${head}${subtypes}` : null;
}

/**
 * Statblock fields are display strings, so every line is declared as a plain
 * `monster -> text` getter. Rendering the same getter against the printed
 * statblock and the adjusted one is what makes the before/after diff fall out
 * for free: what the reader sees change is exactly what changed.
 */
interface StatLine {
  label: string;
  get: (m: Monster) => string | null;
}

const text = (value: string | number | undefined): string | null =>
  value === undefined || value === "" ? null : String(value);

/** The stat strip: the numbers a template moves most, kept above the fold. */
const STAT_CHIPS: ReadonlyArray<StatLine & { key: string; tone?: "save" | "damage" }> = [
  { key: "cr", label: "CR", get: (m) => text(m.cr) },
  { key: "mr", label: "MR", get: (m) => text(m.mythicRank) },
  {
    key: "xp",
    label: "XP",
    get: (m) => (m.xp === undefined ? null : m.xp.toLocaleString("en-US")),
  },
  {
    key: "ac",
    label: "AC",
    get: (m) =>
      m.ac === undefined ? null : `${m.ac}, touch ${m.touchAc}, flat-footed ${m.flatFootedAc}`,
  },
  {
    key: "hp",
    label: "hp",
    tone: "damage",
    get: (m) =>
      m.hp === undefined
        ? null
        : `${m.hp}${m.hd ? ` (${m.hd})` : ""}${m.hpNote ? `; ${m.hpNote}` : ""}`,
  },
  { key: "fort", label: "Fort", tone: "save", get: (m) => text(m.fort) },
  { key: "ref", label: "Ref", tone: "save", get: (m) => text(m.ref) },
  { key: "will", label: "Will", tone: "save", get: (m) => text(m.will) },
];

const STAT_ROWS: readonly StatLine[] = [
  { label: "Type", get: typeLine },
  { label: "Init", get: (m) => text(m.init) },
  { label: "Senses", get: (m) => text(m.senses) },
  { label: "Aura", get: (m) => text(m.aura) },
  { label: "AC mods", get: (m) => text(m.acMods) },
  { label: "Defensive", get: (m) => text(m.defensiveAbilities) },
  { label: "DR", get: (m) => text(m.dr) },
  { label: "Immune", get: (m) => text(m.immune) },
  { label: "Resist", get: (m) => text(m.resist) },
  { label: "SR", get: (m) => text(m.sr) },
  { label: "Weaknesses", get: (m) => text(m.weaknesses) },
  { label: "Speed", get: (m) => text(m.speed) },
  { label: "Melee", get: (m) => text(m.melee) },
  { label: "Ranged", get: (m) => text(m.ranged) },
  {
    label: "Space/Reach",
    get: (m) =>
      m.space || m.reach ? `${m.space ?? "5 ft."}${m.reach ? `, reach ${m.reach}` : ""}` : null,
  },
  { label: "Special Attacks", get: (m) => text(m.specialAttacks) },
  { label: "Abilities", get: abilityLine },
  { label: "Ability note", get: (m) => text(m.statNote) },
  { label: "Base Atk", get: (m) => text(m.bab) },
  { label: "CMB", get: (m) => text(m.cmb) },
  { label: "CMD", get: (m) => text(m.cmd) },
  { label: "Feats", get: (m) => text(m.feats) },
  { label: "Skills", get: (m) => text(m.skills) },
  { label: "Racial Mods", get: (m) => text(m.racialModifiers) },
  { label: "Languages", get: (m) => text(m.languages) },
  { label: "SQ", get: (m) => text(m.sq) },
  { label: "Environment", get: (m) => text(m.environment) },
  { label: "Organization", get: (m) => text(m.organization) },
  { label: "Treasure", get: (m) => text(m.treasure) },
];

/**
 * The adjusted value with the printed one still readable beside it. A pure
 * append (the common case: a template bolting text onto `specialAttacks`)
 * highlights only the tail, so the reader isn't asked to re-read the line to
 * find the new words.
 */
function DiffValue({ before, after }: { before: string | null; after: string }) {
  if (before === null || before === after) return <>{after}</>;
  if (after.startsWith(before)) {
    return (
      <>
        {before}
        <span className="diff-add">{after.slice(before.length)}</span>
      </>
    );
  }
  if (after.endsWith(before)) {
    return (
      <>
        <span className="diff-add">{after.slice(0, after.length - before.length)}</span>
        {before}
      </>
    );
  }
  return (
    <>
      <span className="diff-was">{before}</span>
      <span className="diff-arrow" aria-hidden="true">
        →
      </span>
      {after}
    </>
  );
}

export function MonsterView({
  monster,
  base,
  appliedLabels,
  notes,
}: {
  monster: Monster;
  /** The printed statblock, when `monster` is an adjusted copy of it: drives the diff. */
  base?: Monster;
  /** Labels of the applied adjustments; an empty array still prints the "printed statblock" caption. */
  appliedLabels?: readonly string[];
  /** Caveats from `applyAdjustments`, shown under the statblock rather than above it. */
  notes?: readonly AdjustNote[];
}) {
  const adjusted = (appliedLabels?.length ?? 0) > 0;
  const printed = adjusted ? base : undefined;
  return (
    <>
      <div className={adjusted ? "statblock is-adjusted" : "statblock"}>
        {appliedLabels && (
          <div className="statblock-caption">
            <span className="statblock-caption-label">
              {adjusted ? "Adjusted" : "Printed statblock"}
            </span>
            {appliedLabels.map((label) => (
              <span key={label} className="statblock-caption-chip">
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="stat-strip">
          {STAT_CHIPS.map((chip) => {
            const value = chip.get(monster);
            if (value === null) return null;
            const before = printed ? chip.get(printed) : null;
            const changed = before !== null && before !== value;
            return (
              <Chip key={chip.key} tone={chip.tone} changed={changed}>
                <span className="stat-chip-label">{chip.label}</span>
                <span>
                  {changed ? (
                    <>
                      <span className="diff-was">{before}</span>
                      <span className="diff-arrow" aria-hidden="true">
                        →
                      </span>
                      {value}
                    </>
                  ) : (
                    value
                  )}
                </span>
              </Chip>
            );
          })}
        </div>

        {STAT_ROWS.map((line) => {
          const value = line.get(monster);
          const before = printed ? line.get(printed) : null;
          if (value === null) {
            // A template can only ever remove a line by emptying it, but say so
            // rather than letting the row vanish out from under the reader.
            if (before === null) return null;
            return (
              <Row key={line.label} label={line.label} changed status="removed">
                <span className="diff-was">{before}</span>
              </Row>
            );
          }
          const changed = printed !== undefined && before !== value;
          return (
            <Row
              key={line.label}
              label={line.label}
              changed={changed}
              status={changed && before === null ? "added" : undefined}
            >
              {changed ? <DiffValue before={before} after={value} /> : value}
            </Row>
          );
        })}
      </div>

      {notes && <AdjustmentNotes notes={notes} />}

      <Description html={monster.spellsHtml} />
      {monster.specialAbilitiesHtml && (
        <Description
          html={`<p><strong>Special Abilities</strong></p>\n${monster.specialAbilitiesHtml}`}
        />
      )}
      <Description html={monster.description} />
      <Sources sources={monster.sources} />
    </>
  );
}

/** Every togglable adjustment, in the fixed order `applyAdjustments` should see them applied in. */
const ADJUSTMENT_OPTIONS: readonly StatblockAdjustment[] = [
  ...STATBLOCK_TEMPLATES,
  AUGMENT_SUMMONING,
];

/**
 * Wraps `MonsterView` with the "Adjust statblock" picker: readers stack any of
 * the seven simple templates plus Augment Summoning against the printed
 * statblock, entirely client-side and without touching the route.
 */
export function MonsterDetail({ monster }: { monster: Monster }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  function toggle(key: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const applied = useMemo(
    () => ADJUSTMENT_OPTIONS.filter((option) => selected.has(option.key)),
    [selected],
  );

  const result = useMemo(
    () => (applied.length > 0 ? applyAdjustments(monster, applied) : null),
    [monster, applied],
  );

  return (
    <>
      <section className="adjust-section">
        <div className="adjust-section-head">
          <h2 className="adjust-section-title">Adjust statblock</h2>
          <button
            type="button"
            className="adjust-reset"
            disabled={applied.length === 0}
            onClick={() => setSelected(new Set())}
          >
            Reset
          </button>
        </div>
        <AdjustmentPicker
          options={STATBLOCK_TEMPLATES}
          selected={selected}
          onToggle={toggle}
          title="Templates"
          hint="stack freely"
        />
        <AdjustmentPicker
          options={[AUGMENT_SUMMONING]}
          selected={selected}
          onToggle={toggle}
          title="Feats"
        />
      </section>
      <MonsterView
        monster={result?.monster ?? monster}
        base={monster}
        appliedLabels={applied.map((option) => option.label)}
        notes={result?.notes}
      />
    </>
  );
}

export function MonsterTemplateView({ template }: { template: MonsterTemplate }) {
  return (
    <>
      <div className="stat-strip">
        {template.cr && <Chip>CR {template.cr}</Chip>}
        {template.simple && <Chip>simple</Chip>}
        {template.acquired && <Chip>acquired</Chip>}
        {template.inherited && <Chip>inherited</Chip>}
        {(template.summonable || template.maybeSummonable) && <Chip>summonable</Chip>}
      </div>
      <Description html={template.description} />
      <Sources sources={template.sources} />
    </>
  );
}

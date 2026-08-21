import type { Monster, MonsterTemplate } from "@pf1/schema";
import { useMemo } from "react";

import { useTrackState } from "../hooks/useTrackState.js";
import { applyAdjustments } from "../model/adjust/apply.js";
import { conditionAdjustments } from "../model/adjust/conditions.js";
import { AUGMENT_SUMMONING, STATBLOCK_TEMPLATES } from "../model/adjust/templates.js";
import type { AdjustNote, StatblockAdjustment } from "../model/adjust/types.js";
import { AdjustmentNotes, AdjustmentPicker } from "./AdjustPanel.js";
import { Chip, Description, Sources } from "./parts.js";
import { TrackPanel } from "./TrackPanel.js";

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_LABEL: Record<(typeof ABILITY_ORDER)[number], string> = {
  str: "Str",
  dex: "Dex",
  con: "Con",
  int: "Int",
  wis: "Wis",
  cha: "Cha",
};

function abilityMod(score: number): string {
  const mod = Math.floor(score / 2) - 5;
  return mod >= 0 ? `+${mod}` : String(mod);
}

/** `N Small animal (air, extraplanar)` — the printed type line. */
function typeLine(monster: Monster): string | null {
  const head = [monster.alignment, monster.size, monster.creatureType].filter(Boolean).join(" ");
  const subtypes = monster.subtypes?.length ? ` (${monster.subtypes.join(", ")})` : "";
  return head || subtypes ? `${head}${subtypes}` : null;
}

const text = (value: string | number | undefined): string | null =>
  value === undefined || value === "" ? null : String(value);

/**
 * One bold-label segment of a statblock line. Statblock fields are display
 * strings, so every segment is a plain `monster -> text` getter; segments on
 * the same line render semicolon-separated, exactly as the books print them.
 */
interface Seg {
  label: string;
  get: (m: Monster) => string | null;
}

type Line = readonly Seg[];

const INTRO_LINES: readonly Line[] = [
  [
    { label: "Init", get: (m) => text(m.init) },
    { label: "Senses", get: (m) => text(m.senses) },
  ],
  [{ label: "Aura", get: (m) => text(m.aura) }],
];

const DEFENSE_LINES: readonly Line[] = [
  [{ label: "AC", get: (m) => (m.acMods ? `(${m.acMods})` : null) }],
  [
    { label: "Defensive Abilities", get: (m) => text(m.defensiveAbilities) },
    { label: "DR", get: (m) => text(m.dr) },
    { label: "Immune", get: (m) => text(m.immune) },
    { label: "Resist", get: (m) => text(m.resist) },
    { label: "SR", get: (m) => text(m.sr) },
  ],
  [{ label: "Weaknesses", get: (m) => text(m.weaknesses) }],
];

const OFFENSE_LINES: readonly Line[] = [
  [{ label: "Speed", get: (m) => text(m.speed) }],
  [{ label: "Melee", get: (m) => text(m.melee) }],
  [{ label: "Ranged", get: (m) => text(m.ranged) }],
  [
    { label: "Space", get: (m) => text(m.space) },
    { label: "Reach", get: (m) => text(m.reach) },
  ],
  [{ label: "Special Attacks", get: (m) => text(m.specialAttacks) }],
];

const STATISTICS_LINES: readonly Line[] = [
  [
    { label: "Base Atk", get: (m) => text(m.bab) },
    { label: "CMB", get: (m) => text(m.cmb) },
    { label: "CMD", get: (m) => text(m.cmd) },
  ],
  [{ label: "Feats", get: (m) => text(m.feats) }],
  [{ label: "Skills", get: (m) => text(m.skills) }],
  [{ label: "Racial Modifiers", get: (m) => text(m.racialModifiers) }],
  [{ label: "Languages", get: (m) => text(m.languages) }],
  [{ label: "SQ", get: (m) => text(m.sq) }],
];

const ECOLOGY_LINES: readonly Line[] = [
  [{ label: "Environment", get: (m) => text(m.environment) }],
  [{ label: "Organization", get: (m) => text(m.organization) }],
  [{ label: "Treasure", get: (m) => text(m.treasure) }],
];

function StatLine({ monster, segs }: { monster: Monster; segs: Line }) {
  const present = segs
    .map((seg) => ({ seg, value: seg.get(monster) }))
    .filter((x): x is { seg: Seg; value: string } => x.value !== null);
  if (present.length === 0) return null;
  return (
    <p className="sb-line">
      {present.map(({ seg, value }, i) => (
        <span key={seg.label}>
          {i > 0 && "; "}
          <b className="sb-label">{seg.label}</b> {value}
        </span>
      ))}
    </p>
  );
}

/** Mono-uppercase legend with the gold tick and hairline rule, the sheet's stat-group idiom. */
function SectionHead({ title }: { title: string }) {
  return (
    <div className="sb-section-head">
      <span className="sb-section-legend">{title}</span>
      <span className="sb-section-rule" aria-hidden="true" />
    </div>
  );
}

function StatSection({
  monster,
  title,
  lines,
  children,
}: {
  monster: Monster;
  title: string;
  lines: readonly Line[];
  /** Extra content rendered after the lines (the offense spell blocks, the ability pips). */
  children?: React.ReactNode;
}) {
  const hasLines = lines.some((line) => line.some((seg) => seg.get(monster) !== null));
  if (!hasLines && !children) return null;
  return (
    <section className="sb-section">
      <SectionHead title={title} />
      {lines.map((line, i) => (
        <StatLine key={line[0]?.label ?? i} monster={monster} segs={line} />
      ))}
      {children}
    </section>
  );
}

/** The headline numbers as sheet-style seal tiles: AC, hp, and the three saves. */
function SealRow({ monster }: { monster: Monster }) {
  const seals: Array<{ label: string; value: string; foot?: string }> = [];
  if (monster.ac !== undefined) {
    seals.push({
      label: "AC",
      value: String(monster.ac),
      foot: `touch ${monster.touchAc ?? "?"} · ff ${monster.flatFootedAc ?? "?"}`,
    });
  }
  if (monster.hp !== undefined) {
    seals.push({
      label: "HP",
      value: String(monster.hp),
      foot: [monster.hd, monster.hpNote].filter(Boolean).join("; ") || undefined,
    });
  }
  for (const [label, value] of [
    ["Fort", monster.fort],
    ["Ref", monster.ref],
    ["Will", monster.will],
  ] as const) {
    if (value !== undefined) seals.push({ label, value });
  }
  if (seals.length === 0) return null;
  return (
    <div className="sb-seals">
      {seals.map((seal) => (
        <div key={seal.label} className="sb-seal">
          <span className="sb-seal-label">{seal.label}</span>
          <span className="sb-seal-value num">{seal.value}</span>
          {seal.foot && <span className="sb-seal-foot num">{seal.foot}</span>}
        </div>
      ))}
    </div>
  );
}

/** Str through Cha as the sheet's ability-pip strip; a missing score is the printed em dash. */
function AbilityPips({ monster }: { monster: Monster }) {
  const scores = monster.abilityScores;
  if (!scores) return null;
  return (
    <div className="sb-pips">
      {ABILITY_ORDER.map((key) => {
        const score = scores[key];
        return (
          <div key={key} className="sb-pip">
            <span className="sb-pip-abbr">{ABILITY_LABEL[key]}</span>
            <span className="sb-pip-mod num">{score === undefined ? "—" : abilityMod(score)}</span>
            <span className="sb-pip-score num">{score ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MonsterView({
  monster,
  appliedLabels,
  notes,
}: {
  monster: Monster;
  /** Labels of applied templates/feats/conditions, shown as a quiet reminder line. */
  appliedLabels?: readonly string[];
  /** Caveats from `applyAdjustments`, shown under the statblock rather than above it. */
  notes?: readonly AdjustNote[];
}) {
  const crParts = [
    monster.cr ? `CR ${monster.cr}` : null,
    monster.mythicRank !== undefined ? `MR ${monster.mythicRank}` : null,
    monster.xp !== undefined ? `XP ${monster.xp.toLocaleString("en-US")}` : null,
  ].filter(Boolean);

  return (
    <>
      <div className="statblock">
        {appliedLabels && appliedLabels.length > 0 && (
          <p className="sb-applied">{appliedLabels.join(" · ")} applied</p>
        )}

        <div className="sb-typeline">
          <span>{typeLine(monster)}</span>
          {crParts.length > 0 && <span className="sb-cr num">{crParts.join(" · ")}</span>}
        </div>

        {INTRO_LINES.map((line, i) => (
          <StatLine key={line[0]?.label ?? i} monster={monster} segs={line} />
        ))}

        <SealRow monster={monster} />

        <StatSection monster={monster} title="Defense" lines={DEFENSE_LINES} />

        <StatSection monster={monster} title="Offense" lines={OFFENSE_LINES}>
          <Description html={monster.spellsHtml} />
        </StatSection>

        {(monster.abilityScores || monster.statNote) && (
          <section className="sb-section">
            <SectionHead title="Statistics" />
            <AbilityPips monster={monster} />
            {monster.statNote && <p className="sb-line sb-stat-note">{monster.statNote}</p>}
            {STATISTICS_LINES.map((line, i) => (
              <StatLine key={line[0]?.label ?? i} monster={monster} segs={line} />
            ))}
          </section>
        )}

        <StatSection monster={monster} title="Ecology" lines={ECOLOGY_LINES} />
      </div>

      {notes && <AdjustmentNotes notes={notes} />}

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
 * Wraps `MonsterView` with the "Adjust statblock" picker and the encounter
 * tracker: templates and Augment Summoning stack against the printed
 * statblock, and marked conditions move the printed numbers too, all
 * client-side and without touching the route. Selections persist per browser
 * tab alongside the tracker's hp and conditions (`useTrackState`), so a
 * reload mid-fight brings the whole worksheet back.
 */
export function MonsterDetail({ monster }: { monster: Monster }) {
  const [track, updateTrack] = useTrackState(monster.id);
  const selected = useMemo(() => new Set(track.adjustments), [track.adjustments]);

  function toggle(key: string): void {
    updateTrack({
      adjustments: selected.has(key)
        ? track.adjustments.filter((k) => k !== key)
        : [...track.adjustments, key],
    });
  }

  const applied = useMemo(
    () => ADJUSTMENT_OPTIONS.filter((option) => selected.has(option.key)),
    [selected],
  );
  const condAdjs = useMemo(() => conditionAdjustments(track.conditions), [track.conditions]);
  const adjustments = useMemo(() => [...applied, ...condAdjs], [applied, condAdjs]);

  const result = useMemo(
    () => (adjustments.length > 0 ? applyAdjustments(monster, adjustments) : null),
    [monster, adjustments],
  );
  const shown = result?.monster ?? monster;

  return (
    <>
      <section className="rpanel">
        <header className="rpanel-header">
          <h2>Adjust statblock</h2>
          <button
            type="button"
            className="btn-ghost"
            disabled={applied.length === 0}
            onClick={() => updateTrack({ adjustments: [] })}
          >
            Reset
          </button>
        </header>
        <div className="rpanel-body">
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
        </div>
      </section>
      <TrackPanel monster={shown} state={track} update={updateTrack} />
      <MonsterView
        monster={shown}
        appliedLabels={adjustments.map((option) => option.label)}
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

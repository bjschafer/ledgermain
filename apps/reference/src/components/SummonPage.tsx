/**
 * The `#/summon` helper: pick a summon spell and level, see the printed
 * creature list (plus the lower-level lists you're also allowed to draw
 * from), and open a creature with your feats and its template pre-applied.
 * No dice are ever rolled here -- counts render as the printed notation
 * ("1d3", "1d4+1") and the player rolls at the table.
 *
 * All interactive state (feats, caster level, template, selected creature)
 * lives in the URL per useHashRoute's deep-link contract, so every view is
 * bookmarkable and shareable. The one exception is the feat toggles' first
 * load: with no query string at all (a fresh "#/summon/sm/3" link), they
 * seed from localStorage instead of defaulting to "no feats", since a
 * player's feats don't change spell to spell.
 */

import type { Monster } from "@pf1/schema";
import { useEffect, useMemo, useState } from "react";

import { loadEntry } from "../data/loader.js";
import {
  detailHref,
  summonHref,
  type Route,
  type SummonRouteParams,
} from "../hooks/useHashRoute.js";
import { applyAdjustments } from "../model/adjust/apply.js";
import {
  AUGMENT_SUMMONING,
  statblockTemplate,
  SUMMON_TEMPLATE_KEYS,
} from "../model/adjust/templates.js";
import type { StatblockAdjustment } from "../model/adjust/types.js";
import {
  SUMMON_COUNTS,
  SUMMON_LISTS,
  SUMMON_SPELL_LABEL,
  type SummonListEntry,
  type SummonSpell,
} from "../model/summonLists.js";
import type { RefIndex } from "../shared/indexCodec.js";
import { AdjustmentPicker } from "./AdjustPanel.js";
import { MonsterView } from "./MonsterView.js";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

function romanLevel(level: number): string {
  return ROMAN[level - 1] ?? String(level);
}

const STORAGE_KEY = "summon-feats";

function loadStoredFeats(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveStoredFeats(feats: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feats));
  } catch {
    // Private browsing / blocked storage: feats just won't persist across visits.
  }
}

const AUGMENT_SUMMONING_SLUG = AUGMENT_SUMMONING.key;

/**
 * Superior Summoning (feat). Pathfinder RPG Ultimate Magic. Prerequisites:
 * Augment Summoning, caster level 3rd. "Benefit: Each time you cast a
 * summoning spell that conjures more than one creature, add one to the
 * total number of creatures summoned." Confirmed via aonprd.com FeatDisplay
 * for Superior Summoning. Represented as a count-rules note only, not a
 * StatblockAdjustment: the effect changes how many creatures you get, not
 * any one creature's statblock, and this app never rolls the dice for you.
 */
const SUPERIOR_SUMMONING_SLUG = "superior-summoning";

const FEAT_OPTIONS: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: AUGMENT_SUMMONING_SLUG, label: "Augment Summoning" },
  { slug: SUPERIOR_SUMMONING_SLUG, label: "Superior Summoning" },
];

export function SummonPage({
  index,
  route,
}: {
  index: RefIndex;
  route: Extract<Route, { kind: "summon" }>;
}) {
  if (!route.spell) return <SummonLanding />;
  if (!route.level) return <SummonSpellLanding spell={route.spell} />;
  return (
    <SummonLevelPage index={index} spell={route.spell} level={route.level} params={route.params} />
  );
}

function SummonLanding() {
  return (
    <div className="summon-page">
      <p className="summon-intro">
        Pick a summoning spell and level. Statblocks come pre-adjusted for templates and your feats.
      </p>
      {(["sm", "sna"] as const).map((spell) => (
        <SpellLevelPicker key={spell} spell={spell} />
      ))}
    </div>
  );
}

function SummonSpellLanding({ spell }: { spell: SummonSpell }) {
  return (
    <div className="summon-page">
      <a className="back-link" href="#/summon">
        ← Summons
      </a>
      <SpellLevelPicker spell={spell} />
    </div>
  );
}

function SpellLevelPicker({ spell }: { spell: SummonSpell }) {
  const levels = Array.from({ length: 9 }, (_, i) => i + 1);
  return (
    <section className="summon-spell-block">
      <h2 className="summon-spell-title">{SUMMON_SPELL_LABEL[spell]}</h2>
      <div className="summon-level-links">
        {levels.map((level) => (
          <a key={level} className="summon-level-link" href={summonHref(spell, level)}>
            {romanLevel(level)}
          </a>
        ))}
      </div>
    </section>
  );
}

function SummonLevelPage({
  index,
  spell,
  level,
  params,
}: {
  index: RefIndex;
  spell: SummonSpell;
  level: number;
  params: SummonRouteParams;
}) {
  // No query string at all means a fresh link -- seed feats from localStorage
  // rather than the URL. Any query at all (even just ?cl=5) means the URL is
  // already the source of truth for feats too.
  const hasQuery = window.location.hash.includes("?");
  const feats = useMemo(
    () => (hasQuery ? params.feats : loadStoredFeats()),
    [hasQuery, params.feats],
  );
  const featSet = useMemo(() => new Set(feats), [feats]);
  const augmentOn = featSet.has(AUGMENT_SUMMONING_SLUG);
  const superiorOn = featSet.has(SUPERIOR_SUMMONING_SLUG);

  function navigate(patch: Partial<SummonRouteParams>): void {
    location.hash = summonHref(spell, level, {
      feats,
      template: params.template,
      creature: params.creature,
      cl: params.cl,
      ...patch,
    });
  }

  function toggleFeat(slug: string): void {
    const next = featSet.has(slug) ? feats.filter((f) => f !== slug) : [...feats, slug];
    saveStoredFeats(next);
    navigate({ feats: next });
  }

  function hrefFor(creatureId: string): string {
    return summonHref(spell, level, {
      feats,
      template: params.template,
      cl: params.cl,
      creature: creatureId,
    });
  }

  const entries = SUMMON_LISTS[spell][level] ?? [];
  const lowerLevels = Array.from({ length: level - 1 }, (_, i) => level - 1 - i);
  const durationLine = params.cl ? `Duration: ${params.cl} rounds` : "1 round per caster level";

  return (
    <div className="summon-page">
      <a className="back-link" href="#/summon">
        ← Summons
      </a>
      <h2 className="summon-spell-title">
        {SUMMON_SPELL_LABEL[spell]} {romanLevel(level)}
      </h2>

      <div className="summon-feats adjust-picker-grid" role="group" aria-label="Feats">
        {FEAT_OPTIONS.map((opt) => {
          const on = featSet.has(opt.slug);
          return (
            <label key={opt.slug} className={on ? "adjust-option is-on" : "adjust-option"}>
              <input type="checkbox" checked={on} onChange={() => toggleFeat(opt.slug)} />
              <span className="adjust-option-box" aria-hidden="true" />
              <span className="adjust-option-label">{opt.label}</span>
            </label>
          );
        })}
      </div>

      <label className="cl-input">
        CL
        <input
          type="number"
          min={1}
          max={40}
          value={params.cl ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              navigate({ cl: undefined });
              return;
            }
            const n = Number.parseInt(raw, 10);
            navigate({ cl: Number.isFinite(n) ? Math.max(1, Math.min(40, n)) : undefined });
          }}
        />
        <span className="cl-hint">caster level (optional), sets the duration below</span>
      </label>

      <p className="summon-duration">{durationLine}</p>

      <p className="summon-count-rules">
        This level: {SUMMON_COUNTS.sameLevel}. One level lower: {SUMMON_COUNTS.oneLower} of the same
        kind. Two or more levels lower: {SUMMON_COUNTS.twoOrMoreLower} of the same kind.
        {superiorOn && (
          <span className="summon-superior-note">
            {" "}
            Superior Summoning: +1 creature whenever you summon more than one.
          </span>
        )}
      </p>

      <SummonEntryList entries={entries} hrefFor={hrefFor} selectedId={params.creature} />

      {lowerLevels.map((lvl) => {
        const stepsDown = level - lvl;
        const countLabel =
          stepsDown === 1
            ? `${SUMMON_COUNTS.oneLower} of the same kind`
            : `${SUMMON_COUNTS.twoOrMoreLower} of the same kind`;
        return (
          <details key={lvl} className="summon-lower-level">
            <summary>
              {SUMMON_SPELL_LABEL[spell]} {romanLevel(lvl)} list ({countLabel})
            </summary>
            <SummonEntryList
              entries={SUMMON_LISTS[spell][lvl] ?? []}
              hrefFor={hrefFor}
              selectedId={params.creature}
            />
          </details>
        );
      })}

      {params.creature && (
        <SummonCreaturePanel
          index={index}
          spell={spell}
          uptoLevel={level}
          creatureId={params.creature}
          templateKey={params.template}
          augmentOn={augmentOn}
          onSetTemplate={(key) => navigate({ template: key })}
        />
      )}
    </div>
  );
}

function SummonEntryList({
  entries,
  hrefFor,
  selectedId,
}: {
  entries: readonly SummonListEntry[];
  hrefFor: (id: string) => string;
  selectedId: string | undefined;
}) {
  return (
    <ul className="summon-entry-list">
      {entries.map((entry, i) => (
        <li key={`${entry.label}-${i}`}>
          <SummonEntryRow entry={entry} hrefFor={hrefFor} selectedId={selectedId} />
        </li>
      ))}
    </ul>
  );
}

function SummonEntryRow({
  entry,
  hrefFor,
  selectedId,
}: {
  entry: SummonListEntry;
  hrefFor: (id: string) => string;
  selectedId: string | undefined;
}) {
  if (entry.variants && entry.variants.length > 0) {
    return (
      <div className="summon-entry-body">
        <span className="summon-entry-label">{entry.label}</span>
        {entry.note && <span className="summon-entry-note">{entry.note}</span>}
        <span className="summon-variant-list">
          {entry.variants.map((v) => (
            <a
              key={v.monsterId}
              className={`summon-variant-link${selectedId === v.monsterId ? " is-selected" : ""}`}
              href={hrefFor(v.monsterId)}
            >
              {v.label}
            </a>
          ))}
        </span>
      </div>
    );
  }

  if (entry.monsterId) {
    const id = entry.monsterId;
    return (
      <a
        className={`summon-entry-link${selectedId === id ? " is-selected" : ""}`}
        href={hrefFor(id)}
      >
        <span className="summon-entry-label">{entry.label}</span>
        {entry.note && <span className="summon-entry-note">{entry.note}</span>}
      </a>
    );
  }

  // Shouldn't happen (every row has a monsterId or variants) -- render the
  // label rather than a dead click target if a future row breaks the rule.
  return (
    <span className="summon-entry-body summon-entry-inert">
      <span className="summon-entry-label">{entry.label}</span>
      {entry.note && <span className="summon-entry-note">{entry.note}</span>}
    </span>
  );
}

interface SummonEntryMatch {
  entry: SummonListEntry;
}

/** Search every list from level 1 up to the chosen level for the row (or variant) matching this id. */
function findSummonEntry(
  spell: SummonSpell,
  uptoLevel: number,
  creatureId: string,
): SummonEntryMatch | undefined {
  for (let lvl = 1; lvl <= uptoLevel; lvl++) {
    for (const entry of SUMMON_LISTS[spell][lvl] ?? []) {
      if (entry.monsterId === creatureId) return { entry };
      if (entry.variants?.some((v) => v.monsterId === creatureId)) return { entry };
    }
  }
  return undefined;
}

type CreatureState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; monster: Monster };

function SummonCreaturePanel({
  index,
  spell,
  uptoLevel,
  creatureId,
  templateKey,
  augmentOn,
  onSetTemplate,
}: {
  index: RefIndex;
  spell: SummonSpell;
  uptoLevel: number;
  creatureId: string;
  templateKey: string | undefined;
  augmentOn: boolean;
  onSetTemplate: (key: string | undefined) => void;
}) {
  const [state, setState] = useState<CreatureState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    loadEntry(index, "monsters", creatureId).then(
      (monster) => {
        if (!live) return;
        setState(monster ? { status: "ready", monster } : { status: "missing" });
      },
      (err: unknown) => {
        if (!live) return;
        setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => {
      live = false;
    };
  }, [index, creatureId]);

  const found = useMemo(
    () => findSummonEntry(spell, uptoLevel, creatureId),
    [spell, uptoLevel, creatureId],
  );
  const entry = found?.entry;
  const offerTemplate = Boolean(entry?.templated);
  const templateAdjustment =
    offerTemplate && templateKey ? statblockTemplate(templateKey) : undefined;

  const adjustments = useMemo<StatblockAdjustment[]>(() => {
    const list: StatblockAdjustment[] = [];
    if (templateAdjustment) list.push(templateAdjustment);
    if (augmentOn) list.push(AUGMENT_SUMMONING);
    return list;
  }, [templateAdjustment, augmentOn]);

  if (state.status === "loading") return <p className="notice">Loading…</p>;
  if (state.status === "missing") {
    return (
      <p className="notice is-error">
        No monster with id <code>{creatureId}</code>.
      </p>
    );
  }
  if (state.status === "error") {
    return <p className="notice is-error">Could not load that creature: {state.message}</p>;
  }

  const templateOptions = SUMMON_TEMPLATE_KEYS.map((key) => statblockTemplate(key)).filter(
    (t): t is StatblockAdjustment => t !== undefined,
  );

  const result = applyAdjustments(state.monster, adjustments);

  return (
    <section className="summon-creature-panel">
      <h3 className="summon-creature-title">
        {state.monster.name}
        {entry?.note && <span className="summon-entry-note"> · {entry.note}</span>}
      </h3>
      <a className="summon-open-link" href={detailHref("monsters", creatureId)}>
        Open in the bestiary
      </a>

      {offerTemplate && (
        <>
          <AdjustmentPicker
            options={templateOptions}
            selected={templateKey ? new Set([templateKey]) : new Set()}
            onToggle={(key) => onSetTemplate(templateKey === key ? undefined : key)}
            title="Template"
            hint="pick one"
          />
          <p className="summon-template-footnote">
            Core Rulebook table footnote: summoned with the celestial template if you are good, or
            the fiendish template if you are evil. If you are neutral, you may choose either.
          </p>
        </>
      )}

      <MonsterView
        monster={result.monster}
        base={state.monster}
        appliedLabels={adjustments.map((adj) => adj.label)}
        notes={result.notes}
      />
    </section>
  );
}

/**
 * The `#/summon` helper: pick a summon spell and level, see the printed
 * creature list (plus the lower-level lists you're also allowed to draw
 * from), and open a creature with your feats and its template pre-applied.
 * No dice are ever rolled here -- counts render as the printed notation
 * ("1d3", "1d4+1") and the player rolls at the table.
 *
 * All interactive state (feats, caster level, template, selected creature,
 * evolutions) lives in the URL per useHashRoute's deep-link contract, so every
 * view is bookmarkable and shareable. The one exception is the feat toggles'
 * first load: with no query string at all (a fresh "#/summon/sm/3" link), they
 * seed from localStorage instead of defaulting to "no feats", since a
 * player's feats don't change spell to spell.
 *
 * Feats come in three shapes here. Statblock feats (Augment Summoning,
 * Moonlight/Starlight Summons) are `StatblockAdjustment`s the adjust module
 * applies. List feats (Summon Good/Neutral/Evil Monster) unlock an extra
 * creature table per level and carry a rider for creatures taken from it.
 * Note feats (Superior Summoning, Sacred Summons, Evolved Summoned Monster)
 * change how the spell is cast or what the creature can do in ways the
 * statblock can't honestly absorb, so they print as notes.
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
import { useTrackGroup } from "../hooks/useTrackState.js";
import { applyAdjustments } from "../model/adjust/apply.js";
import { conditionAdjustments } from "../model/adjust/conditions.js";
import {
  AUGMENT_SUMMONING,
  COUNTERPOISED_KEY,
  MOONLIGHT_SUMMONS,
  STARLIGHT_SUMMONS,
  statblockTemplate,
  SUMMON_GOOD_DIEHARD,
  SUMMON_NEUTRAL_WILL,
  SUMMON_TEMPLATE_KEYS,
  templateIneligibility,
  VERSATILE_SM_TEMPLATE_KEYS,
  VERSATILE_SNA_TEMPLATE_KEYS,
} from "../model/adjust/templates.js";
import type { AdjustNote, StatblockAdjustment } from "../model/adjust/types.js";
import { attackEvolutionsAllowed, evolutionBySlug, EVOLUTIONS } from "../model/evolutions.js";
import {
  ALTERNATIVE_SUMMONING_OPTIONS_SLUG,
  SUMMON_ALT_LIST_ORDER,
  SUMMON_ALT_LISTS,
  SUMMON_COUNTS,
  SUMMON_LISTS,
  SUMMON_SPELL_LABEL,
  type SummonAltList,
  type SummonListEntry,
  type SummonSpell,
} from "../model/summonLists.js";
import type { RefIndex } from "../shared/indexCodec.js";
import { AdjustmentPicker } from "./AdjustPanel.js";
import { MonsterView } from "./MonsterView.js";
import { TrackPanel } from "./TrackPanel.js";

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

/**
 * Sacred Summons (feat). Ultimate Magic pg. 155. Prerequisites: aura class
 * feature, ability to cast summon monster. "When using summon monster to
 * summon creatures whose alignment subtype or subtypes exactly match your
 * aura, you may cast the spell as a standard action instead of with a
 * casting time of 1 round." A casting-time note; nothing on the statblock.
 */
const SACRED_SUMMONS_SLUG = "sacred-summons";

/** Versatile Summon Monster (Monster Summoner's Handbook pg. 18): swap the alignment template for an elemental-plane one. */
const VERSATILE_SM_SLUG = "versatile-summon-monster";

/**
 * Versatile Summon Nature's Ally (Monster Summoner's Handbook pg. 18):
 * "When you summon one or more animals, humanoids, or vermin using a summon
 * nature's ally spell ..., instead of granting them the benefit from Augment
 * Summoning, you can instead apply one of the following templates to them:
 * aerial, aqueous, chthonic, fiery, or primordial." Slug matches the sheet's
 * featNameSlug of the feat name (the apostrophe becomes "-s-").
 */
const VERSATILE_SNA_SLUG = "versatile-summon-nature-s-ally";
const VERSATILE_SNA_TYPES = new Set(["animal", "humanoid", "vermin"]);

/**
 * Evolved Summoned Monster (Advanced Class Guide pg. 146): "Each time you
 * cast a summon monster spell, you can select a 1-point evolution other than
 * pounce or reach from those available to a summoner's eidolon. ... If you
 * summon more than one creature with a single spell, only one creature gains
 * this evolution." Taken more than once, more picks. Note-tier: see
 * model/evolutions.ts.
 */
const EVOLVED_SLUG = "evolved-summoned-monster";

interface FeatOption {
  slug: string;
  label: string;
}

const FEAT_OPTIONS: Record<SummonSpell, readonly FeatOption[]> = {
  sm: [
    { slug: AUGMENT_SUMMONING_SLUG, label: "Augment Summoning" },
    { slug: SUPERIOR_SUMMONING_SLUG, label: "Superior Summoning" },
    { slug: SUMMON_ALT_LISTS.good.toggleSlug, label: SUMMON_ALT_LISTS.good.label },
    { slug: SUMMON_ALT_LISTS.neutral.toggleSlug, label: SUMMON_ALT_LISTS.neutral.label },
    { slug: SUMMON_ALT_LISTS.evil.toggleSlug, label: SUMMON_ALT_LISTS.evil.label },
    { slug: VERSATILE_SM_SLUG, label: "Versatile Summon Monster" },
    { slug: EVOLVED_SLUG, label: "Evolved Summoned Monster" },
    { slug: SACRED_SUMMONS_SLUG, label: "Sacred Summons" },
  ],
  sna: [
    { slug: AUGMENT_SUMMONING_SLUG, label: "Augment Summoning" },
    { slug: SUPERIOR_SUMMONING_SLUG, label: "Superior Summoning" },
    { slug: MOONLIGHT_SUMMONS.key, label: MOONLIGHT_SUMMONS.label },
    { slug: STARLIGHT_SUMMONS.key, label: STARLIGHT_SUMMONS.label },
    { slug: VERSATILE_SNA_SLUG, label: "Versatile Summon Nature's Ally" },
  ],
};

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

/** The alternate lists this spell's ticked feats and toggles unlock, in table order. */
function activeAltLists(spell: SummonSpell, featSet: ReadonlySet<string>): SummonAltList[] {
  return SUMMON_ALT_LIST_ORDER.filter((key) => {
    const def = SUMMON_ALT_LISTS[key];
    return def.spell === spell && featSet.has(def.toggleSlug);
  });
}

/** Not a feat: a campaign-level switch for the Adventure Path alternative lists, kept in the same URL slot. */
const LIST_OPTIONS: readonly FeatOption[] = [
  { slug: ALTERNATIVE_SUMMONING_OPTIONS_SLUG, label: "Alternative Summoning Options" },
];

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
  const superiorOn = featSet.has(SUPERIOR_SUMMONING_SLUG);
  const altLists = useMemo(() => activeAltLists(spell, featSet), [spell, featSet]);

  function navigate(patch: Partial<SummonRouteParams>): void {
    location.hash = summonHref(spell, level, {
      feats,
      template: params.template,
      creature: params.creature,
      cl: params.cl,
      evo: params.evo,
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
      evo: params.evo,
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
        {FEAT_OPTIONS[spell].map((opt) => {
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

      <div className="summon-feats adjust-picker-grid" role="group" aria-label="Lists">
        {LIST_OPTIONS.map((opt) => {
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

      {featSet.has(SACRED_SUMMONS_SLUG) && spell === "sm" && (
        <p className="summon-cast-note">
          Sacred Summons: a creature whose alignment subtypes exactly match your aura is cast as a
          standard action instead of 1 round.
        </p>
      )}
      {altLists.includes("evil") && (
        <p className="summon-cast-note">
          Summon Evil Monster: a creature from that list is cast as a standard action. It appears as
          normal but cannot act until your next turn; it is not flat-footed and may make attacks of
          opportunity.
        </p>
      )}

      <SummonLevelLists
        level={level}
        entries={entries}
        altLists={altLists}
        hrefFor={hrefFor}
        selectedId={params.creature}
      />

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
            <SummonLevelLists
              level={lvl}
              entries={SUMMON_LISTS[spell][lvl] ?? []}
              altLists={altLists}
              hrefFor={hrefFor}
              selectedId={params.creature}
            />
          </details>
        );
      })}

      {params.creature && (
        <SummonCreaturePanel
          // Keyed so per-creature tracker state resets when the selection changes.
          key={params.creature}
          index={index}
          spell={spell}
          uptoLevel={level}
          creatureId={params.creature}
          templateKey={params.template}
          featSet={featSet}
          altLists={altLists}
          evo={params.evo}
          onSetTemplate={(key) => navigate({ template: key })}
          onSetEvo={(slugs) => navigate({ evo: slugs })}
        />
      )}
    </div>
  );
}

/** One level's standard rows, followed by each unlocked alignment list's rows for that level. */
function SummonLevelLists({
  level,
  entries,
  altLists,
  hrefFor,
  selectedId,
}: {
  level: number;
  entries: readonly SummonListEntry[];
  altLists: readonly SummonAltList[];
  hrefFor: (id: string) => string;
  selectedId: string | undefined;
}) {
  return (
    <>
      <SummonEntryList entries={entries} hrefFor={hrefFor} selectedId={selectedId} />
      {altLists.map((key) => {
        const def = SUMMON_ALT_LISTS[key];
        const rows = def.levels[level] ?? [];
        return (
          <section key={key} className="summon-alt-section">
            <h4 className="summon-alt-heading">
              {def.label} {romanLevel(level)}
              <span className="summon-alt-source">{def.source}</span>
            </h4>
            <SummonEntryList entries={rows} hrefFor={hrefFor} selectedId={selectedId} />
          </section>
        );
      })}
    </>
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

  // A printed row with no statblock behind it (the bestiary data lacks the
  // creature): the label stays, with its note, as an inert line rather than a
  // dead click target or a stand-in creature.
  return (
    <span className="summon-entry-body summon-entry-inert">
      <span className="summon-entry-label">{entry.label}</span>
      {entry.note && <span className="summon-entry-note">{entry.note}</span>}
    </span>
  );
}

interface SummonEntryMatch {
  entry: SummonListEntry;
  /** Which table the row came from: the standard one, or an unlocked alignment list. */
  list: "standard" | SummonAltList;
}

/**
 * Search every list from level 1 up to the chosen level for the row (or
 * variant) matching this id. Unlocked alignment lists are searched first: a
 * creature printed on both (lantern archon, say) is taken from the feat's
 * list, since that is what earns it the feat's rider.
 */
function findSummonEntry(
  spell: SummonSpell,
  uptoLevel: number,
  creatureId: string,
  altLists: readonly SummonAltList[],
): SummonEntryMatch | undefined {
  for (const key of altLists) {
    for (let lvl = 1; lvl <= uptoLevel; lvl++) {
      for (const entry of SUMMON_ALT_LISTS[key].levels[lvl] ?? []) {
        if (entry.monsterId === creatureId) return { entry, list: key };
      }
    }
  }
  for (let lvl = 1; lvl <= uptoLevel; lvl++) {
    for (const entry of SUMMON_LISTS[spell][lvl] ?? []) {
      if (entry.monsterId === creatureId) return { entry, list: "standard" };
      if (entry.variants?.some((v) => v.monsterId === creatureId)) {
        return { entry, list: "standard" };
      }
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
  featSet,
  altLists,
  evo,
  onSetTemplate,
  onSetEvo,
}: {
  index: RefIndex;
  spell: SummonSpell;
  uptoLevel: number;
  creatureId: string;
  templateKey: string | undefined;
  featSet: ReadonlySet<string>;
  altLists: readonly SummonAltList[];
  evo: readonly string[];
  onSetTemplate: (key: string | undefined) => void;
  onSetEvo: (slugs: string[]) => void;
}) {
  const [state, setState] = useState<CreatureState>({ status: "loading" });
  const group = useTrackGroup(creatureId);
  const track = group.states[group.activeIndex] ?? group.states[0]!;

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
    () => findSummonEntry(spell, uptoLevel, creatureId, altLists),
    [spell, uptoLevel, creatureId, altLists],
  );
  const entry = found?.entry;
  const monster = state.status === "ready" ? state.monster : undefined;

  const augmentOn = featSet.has(AUGMENT_SUMMONING_SLUG);
  const neutralOn = altLists.includes("neutral");
  const versatileSmOn = spell === "sm" && featSet.has(VERSATILE_SM_SLUG);
  const versatileSnaOn = spell === "sna" && featSet.has(VERSATILE_SNA_SLUG);
  const evolvedOn = spell === "sm" && featSet.has(EVOLVED_SLUG);

  // The row is printed with its template ("Celestial dog", "Young frost
  // giant"): applied, not picked. An asterisk on the same row still offers
  // the alignment picker on top.
  const forcedTemplate = entry?.template ? statblockTemplate(entry.template) : undefined;

  // Which templates this row may pick from, gated by each template's own rules.
  const templateOptions = useMemo<StatblockAdjustment[]>(() => {
    const keys: string[] = [];
    if (entry?.templated) {
      keys.push(...SUMMON_TEMPLATE_KEYS);
      if (spell === "sm" && neutralOn) keys.push(COUNTERPOISED_KEY);
      if (versatileSmOn) keys.push(...VERSATILE_SM_TEMPLATE_KEYS);
    }
    if (
      versatileSnaOn &&
      monster &&
      VERSATILE_SNA_TYPES.has((monster.creatureType ?? "").toLowerCase())
    ) {
      keys.push(...VERSATILE_SNA_TEMPLATE_KEYS);
    }
    return keys
      .map((key) => statblockTemplate(key))
      .filter((t): t is StatblockAdjustment => t !== undefined);
  }, [spell, entry, neutralOn, versatileSmOn, versatileSnaOn, monster]);

  const disabledTemplates = useMemo(() => {
    const map = new Map<string, string>();
    if (!monster) return map;
    for (const option of templateOptions) {
      const why = templateIneligibility(option.key, monster);
      if (why) map.set(option.key, why);
    }
    return map;
  }, [templateOptions, monster]);

  const pickedTemplate =
    templateKey && !disabledTemplates.has(templateKey)
      ? templateOptions.find((t) => t.key === templateKey)
      : undefined;

  // Versatile Summon Nature's Ally trades the Augment Summoning benefit for the template.
  const versatileSnaSwap = versatileSnaOn && pickedTemplate !== undefined;

  const adjustments = useMemo<StatblockAdjustment[]>(() => {
    const list: StatblockAdjustment[] = [];
    if (forcedTemplate) list.push(forcedTemplate);
    if (pickedTemplate) list.push(pickedTemplate);
    if (augmentOn && !versatileSnaSwap) list.push(AUGMENT_SUMMONING);
    if (found?.list === "good") list.push(SUMMON_GOOD_DIEHARD);
    if (found?.list === "neutral" || pickedTemplate?.key === COUNTERPOISED_KEY) {
      list.push(SUMMON_NEUTRAL_WILL);
    }
    if (spell === "sna") {
      if (featSet.has(MOONLIGHT_SUMMONS.key)) list.push(MOONLIGHT_SUMMONS);
      if (featSet.has(STARLIGHT_SUMMONS.key)) list.push(STARLIGHT_SUMMONS);
    }
    list.push(...conditionAdjustments(track.conditions));
    return list;
  }, [
    forcedTemplate,
    pickedTemplate,
    augmentOn,
    versatileSnaSwap,
    found,
    spell,
    featSet,
    track.conditions,
  ]);

  const evolutions = useMemo(
    () =>
      evolvedOn ? evo.map((slug) => evolutionBySlug(slug)).filter((e) => e !== undefined) : [],
    [evolvedOn, evo],
  );

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

  const result = applyAdjustments(state.monster, adjustments);

  const extraNotes: AdjustNote[] = [];
  if (versatileSnaSwap) {
    extraNotes.push({
      severity: "info",
      text: "Versatile Summon Nature's Ally: the template replaces the Augment Summoning benefit, so the +4 Str/Con is not applied.",
    });
  }
  if (found?.list === "evil") {
    extraNotes.push({
      severity: "info",
      text: "Summon Evil Monster: cast as a standard action; the creature cannot act until your next turn but is not flat-footed and may make attacks of opportunity.",
    });
  }
  const attacksAllowed = attackEvolutionsAllowed(state.monster.size);
  for (const evolution of evolutions) {
    const parts = [evolution.text];
    if (evolution.requires) parts.push(`Requires ${evolution.requires}.`);
    extraNotes.push({
      severity: evolution.attack && !attacksAllowed ? "manual" : "info",
      text:
        `Evolution (${evolution.name}): ${parts.join(" ")}` +
        (evolution.attack && !attacksAllowed
          ? " Attack evolutions need a Medium or larger creature; this one is smaller."
          : ""),
    });
  }
  if (evolutions.length > 0) {
    extraNotes.push({
      severity: "info",
      text: "When one casting summons several creatures, only one of them gains the evolutions (or they are split between creatures).",
    });
  }

  const appliedLabels = [
    ...adjustments.map((adj) => adj.label),
    ...evolutions.map((e) => `Evolution: ${e.name}`),
  ];

  return (
    <section className="summon-creature-panel">
      <h3 className="summon-creature-title">
        {state.monster.name}
        {entry?.note && <span className="summon-entry-note"> · {entry.note}</span>}
      </h3>
      <a className="summon-open-link" href={detailHref("monsters", creatureId)}>
        Open in the bestiary
      </a>

      {forcedTemplate && found && found.list !== "standard" && (
        <p className="summon-template-footnote">
          Printed on the {SUMMON_ALT_LISTS[found.list].label} list as a{" "}
          {forcedTemplate.label.toLowerCase()}; the template is applied.
        </p>
      )}

      {templateOptions.length > 0 && (
        <>
          <AdjustmentPicker
            options={templateOptions}
            selected={pickedTemplate ? new Set([pickedTemplate.key]) : new Set()}
            onToggle={(key) => onSetTemplate(templateKey === key ? undefined : key)}
            title="Template"
            hint="pick one"
            disabled={disabledTemplates}
          />
          {entry?.templated && (
            <p className="summon-template-footnote">
              Core Rulebook table footnote: summoned with the celestial template if you are good, or
              the fiendish template if you are evil. If you are neutral, you may choose either.
              {found?.list.startsWith("ap-") &&
                " The Adventure Path compilation reads the asterisk as celestial if good, entropic if chaotic, fiendish if evil, resolute if lawful."}
              {neutralOn &&
                " Summon Neutral Monster: counterpoised may stand in for either, with +2 on Will."}
              {versatileSmOn &&
                " Versatile Summon Monster: an aerial, aqueous, chthonic, dark, fiery, or primordial creature instead (you chose two of these when you took the feat)."}
            </p>
          )}
          {versatileSnaOn && (
            <p className="summon-template-footnote">
              Versatile Summon Nature's Ally: an animal, humanoid, or vermin can take one of these
              templates instead of the Augment Summoning benefit. Several creatures from one casting
              all take the same template.
            </p>
          )}
        </>
      )}

      {evolvedOn && (
        <EvolutionPicker
          selected={evo}
          attacksAllowed={attacksAllowed}
          onToggle={(slug) =>
            onSetEvo(evo.includes(slug) ? evo.filter((s) => s !== slug) : [...evo, slug])
          }
        />
      )}

      <TrackPanel monster={result.monster} group={group} />

      <MonsterView
        monster={result.monster}
        appliedLabels={appliedLabels}
        notes={[...result.notes, ...extraNotes]}
      />
    </section>
  );
}

/** Evolved Summoned Monster's 1-point evolution picks, one tick per feat taken. */
function EvolutionPicker({
  selected,
  attacksAllowed,
  onToggle,
}: {
  selected: readonly string[];
  attacksAllowed: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="adjust-picker">
      <div className="adjust-picker-head">
        <span className="adjust-picker-title">Evolution</span>
        <span className="adjust-picker-hint">one per Evolved Summoned Monster feat you have</span>
      </div>
      <div className="adjust-picker-grid">
        {EVOLUTIONS.map((evolution) => {
          const on = selected.includes(evolution.slug);
          const blocked = evolution.attack === true && !attacksAllowed;
          const classes = ["adjust-option"];
          if (on) classes.push("is-on");
          if (blocked) classes.push("is-disabled");
          return (
            <label
              key={evolution.slug}
              className={classes.join(" ")}
              title={
                blocked
                  ? `${evolution.name}: attack evolutions need a Medium or larger creature.`
                  : evolution.text
              }
            >
              <input
                type="checkbox"
                checked={on}
                disabled={blocked && !on}
                onChange={() => onToggle(evolution.slug)}
              />
              <span className="adjust-option-box" aria-hidden="true" />
              <span className="adjust-option-label">{evolution.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

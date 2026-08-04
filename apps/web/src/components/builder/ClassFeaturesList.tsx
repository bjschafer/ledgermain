import type {
  DerivedArchetypeFeature,
  DerivedClassFeature,
  DerivedSheet,
  RefData,
} from "@pf1/schema";

import { abilityTypeTag } from "../../model/abilityTypes.js";
import { useInlineRolls } from "../../state/rollData.js";
import { InfoTip } from "../InfoTip.js";

/**
 * The statblock (Ex)/(Su)/(Sp) suffix on a feature's name, tipped with what
 * the tag costs you at the table (see `model/abilityTypes.ts`). Renders
 * nothing for a feature the dataset leaves untagged, which is a real share of
 * them: silence is correct there, a guessed tag is not.
 */
export function AbilityTypeTag({ abilityType }: { abilityType?: string }) {
  const tag = abilityTypeTag(abilityType);
  if (!tag) return null;
  return (
    <InfoTip className="cf-ability-type" content={tag.tip}>
      ({tag.label})
    </InfoTip>
  );
}

/**
 * Collapsible HTML description, same pattern as `SpellDetail` (reuses its CSS
 * classes — visually it's the same "prose reveal" element, just for an
 * archetype feature instead of a spell).
 */
export function FeatureDescription({ html }: { html: string }) {
  const resolve = useInlineRolls();
  return (
    <details className="spell-detail">
      <summary className="spell-detail-summary">description</summary>
      <div
        className="spell-detail-desc"
        // Archetype feature descriptions come from the vendored third-party
        // dataset (open game content) and contain only formatting tags
        // (<p>, <i>, <strong>) — no user input.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: resolve(html) }}
      />
    </details>
  );
}

/**
 * One granted class feature's row: name (struck through + "replaced by" when
 * an archetype swapped it out), its (Ex)/(Su)/(Sp) tag, mechanical `detail`,
 * origin label (e.g. "Hex", "Fire Domain" — omit via `showOrigin={false}`
 * when the caller already groups by origin and repeating it would be
 * redundant), non-mechanical `contextNotes` (save DC/duration/activation
 * shape, rendered as plain reference lines: they describe how the ability
 * works rather than warning about anything), and the vendored prose
 * description. Shared by {@link ClassFeaturesList} (the builder, grouped
 * by level) and the Play tab's `ClassFeaturesPanel` (grouped by origin) so
 * the row itself never diverges between the two.
 *
 * `layout` picks which of those two jobs the row is doing. `"inline"` (the
 * builder) keeps the whole feature on one line, with `detail` as a trailing
 * parenthetical — right for base-class grants, whose detail is a number like
 * "3d6" and whose value is a scannable level-by-level list. `"block"` (the
 * play tab) gives the name its own line and drops `detail` below it as a
 * sentence, because the subsystem picks that panel is mostly made of (hexes,
 * rage powers, talents) carry a full sentence there, and a sentence in
 * parentheses after a name reads as one undifferentiated paragraph.
 */
export function ClassFeatureRow({
  feature,
  refData,
  showOrigin = true,
  layout = "inline",
}: {
  feature: DerivedClassFeature;
  refData: RefData;
  showOrigin?: boolean;
  layout?: "inline" | "block";
}) {
  const vendored = refData.classFeatures[feature.featureId];
  const description = vendored?.description;
  const block = layout === "block";
  return (
    <div className={`cf-archetype-feature${block ? " cf-block" : ""}`}>
      <span
        className={`cf-name${feature.applied ? "" : " struck"}`}
        title={feature.replacedBy ? `Replaced by ${feature.replacedBy}` : undefined}
      >
        {feature.name}
        <AbilityTypeTag abilityType={vendored?.abilityType} />
        {feature.detail && !block ? <span className="cf-detail"> ({feature.detail})</span> : null}
        {showOrigin && feature.origin ? (
          <span className="cf-origin"> ({feature.origin.label})</span>
        ) : null}
        {feature.replacedBy ? <span className="cf-replaced"> → {feature.replacedBy}</span> : null}
      </span>
      {feature.detail && block ? <p className="cf-summary">{feature.detail}</p> : null}
      {feature.contextNotes?.map((n, i) => (
        <div key={i} className="hint feature-note">
          {n.text}
        </div>
      ))}
      {description ? <FeatureDescription html={description} /> : null}
    </div>
  );
}

/**
 * One active archetype's granted feature: the archetype counterpart to
 * {@link ClassFeatureRow}, sharing its `.cf-name`/`.cf-detail`/`.cf-origin`
 * visual language so an interleaved level group in {@link ClassFeaturesList}
 * reads as one timeline rather than two parallel systems. `archetypeName`
 * fills the slot `ClassFeatureRow` uses for a subsystem origin ("Hex", "Fire
 * Domain"), since an archetype feature's "origin" IS the archetype; omit it
 * via `showOrigin={false}` when the caller already groups by archetype and
 * repeating the name would be redundant.
 *
 * A slice of archetype features carry a real numeric effect, hand-verified
 * (`@pf1/engine` `archetype-effects.ts`) or machine-extracted
 * (`archetype-effects-extracted.ts`); those show a `detail` summary next to
 * the name, and an extracted one additionally gets a visible "extracted" text
 * note (not a hover-only tooltip) so a lower-confidence number is never
 * mistaken for a hand-verified one at a glance. `replacesText` prints the
 * rules' own words for what this feature trades away ("replaces: hex gained
 * at 2nd level"); when the feature instead resolved a base-feature pairing,
 * that struck-through base row already tells the story, so nothing extra
 * prints here. Only a genuinely `ambiguous` feature, one with no pairing, no
 * `replacesText`, and no `replacesSlot`, gets the soft warning: the dataset
 * simply doesn't say what it trades away, so the player has to check the
 * book. `layout` mirrors `ClassFeatureRow`'s: `"inline"` (the builder) keeps
 * `detail` as a trailing parenthetical; `"block"` (the Play tab panel) drops
 * it below the name as its own line.
 */
export function ArchetypeFeatureRow({
  feature,
  archetypeName,
  showOrigin = true,
  layout = "inline",
}: {
  feature: DerivedArchetypeFeature;
  archetypeName: string;
  showOrigin?: boolean;
  layout?: "inline" | "block";
}) {
  const block = layout === "block";
  return (
    <div className={`cf-archetype-feature${block ? " cf-block" : ""}`}>
      <span className="cf-name">
        {feature.name}
        <AbilityTypeTag abilityType={feature.abilityType} />
        {feature.detail && !block ? <span className="cf-detail"> ({feature.detail})</span> : null}
        {showOrigin ? <span className="cf-origin"> ({archetypeName})</span> : null}
        {feature.effectSource === "extracted" ? (
          <InfoTip
            className="badge-modeled badge-modeled--extracted badge-modeled--inline"
            content="Machine-extracted from the vendored prose, not yet hand-verified"
          >
            {" "}
            extracted
          </InfoTip>
        ) : null}
        {feature.ambiguous ? (
          <InfoTip
            className="soft"
            content="The rules text doesn't say clearly what this trades away: check the book"
          >
            {" "}
            ⚠
          </InfoTip>
        ) : null}
      </span>
      {feature.detail && block ? <p className="cf-summary">{feature.detail}</p> : null}
      {feature.replacesText ? (
        <div className="hint feature-note">replaces: {feature.replacesText}</div>
      ) : null}
      {feature.description ? <FeatureDescription html={feature.description} /> : null}
    </div>
  );
}

/** One entry in the merged base-feature + archetype-feature timeline. */
type TimelineEntry =
  | { kind: "base"; feature: DerivedClassFeature }
  | { kind: "archetype"; feature: DerivedArchetypeFeature; archetypeName: string };

function timelineName(entry: TimelineEntry): string {
  return entry.feature.name;
}

function timelineKey(entry: TimelineEntry, i: number): string {
  return entry.kind === "base"
    ? `${entry.feature.featureId}-${i}`
    : `${entry.archetypeName}-${entry.feature.name}-${i}`;
}

function TimelineRow({ entry, refData }: { entry: TimelineEntry; refData: RefData }) {
  return entry.kind === "base" ? (
    <ClassFeatureRow feature={entry.feature} refData={refData} />
  ) : (
    <ArchetypeFeatureRow feature={entry.feature} archetypeName={entry.archetypeName} />
  );
}

/**
 * Displays every granted base-class feature (struck through when an active
 * archetype swaps it out, same visual language as `Provenance`'s `applied`
 * flag) interleaved with each active archetype's own features at the level
 * each is gained, so the result reads as one class-feature timeline rather
 * than a base list followed by a separate per-archetype list. A level-0
 * archetype feature is not a level at all: it is a class-table alteration
 * (a hex chassis row, a patron, a proficiency) rather than something gained
 * at a specific level, so those group together under a plain "Baseline
 * changes" heading ahead of the leveled groups instead of printing a
 * meaningless "Lv 0". Within a level, entries sort by name so a base feature
 * and an archetype feature gained at the same level interleave rather than
 * clustering by kind. The dataset has at least one verified copy-paste error
 * in archetype-feature prose (Two-Handed Fighter's Shattering Strike row
 * carries Bravery's text) — display-only, never a mechanics source. Entries
 * granted by a chosen cleric domain or wizard arcane school (rather than the
 * class itself) carry an `origin` label (e.g. "— Fire Domain") — see
 * `collectGrantedFeatures` in `@pf1/engine`. Base features carry the
 * statblock (Ex)/(Su)/(Sp) tag via {@link AbilityTypeTag}; archetype features
 * carry their own resolved `abilityType`, when the vendored entry states one.
 */
export function ClassFeaturesList({ sheet, refData }: { sheet: DerivedSheet; refData: RefData }) {
  if (sheet.classFeatures.length === 0 && sheet.activeArchetypes.length === 0) return null;

  const baseline: TimelineEntry[] = [];
  const byLevel = new Map<number, TimelineEntry[]>();
  const push = (level: number, entry: TimelineEntry) => {
    const list = byLevel.get(level) ?? [];
    list.push(entry);
    byLevel.set(level, list);
  };

  for (const f of sheet.classFeatures) {
    push(f.level, { kind: "base", feature: f });
  }
  for (const a of sheet.activeArchetypes) {
    for (const f of a.features) {
      const entry: TimelineEntry = { kind: "archetype", feature: f, archetypeName: a.name };
      if (f.level === 0) baseline.push(entry);
      else push(f.level, entry);
    }
  }

  baseline.sort((a, b) => timelineName(a).localeCompare(timelineName(b)));
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  for (const list of byLevel.values()) {
    list.sort((a, b) => timelineName(a).localeCompare(timelineName(b)));
  }

  return (
    <div className="subsection class-features">
      <h4 className="tracker-sub">Class Features</h4>
      <div className="cf-levels">
        {baseline.length > 0 && (
          <div className="cf-level-row">
            <span className="cf-level">Baseline changes</span>
            <div className="cf-archetype-features">
              {baseline.map((entry, i) => (
                <TimelineRow key={timelineKey(entry, i)} entry={entry} refData={refData} />
              ))}
            </div>
          </div>
        )}
        {levels.map((level) => (
          <div className="cf-level-row" key={level}>
            <span className="cf-level">Lv {level}</span>
            <div className="cf-archetype-features">
              {byLevel.get(level)!.map((entry, i) => (
                <TimelineRow key={timelineKey(entry, i)} entry={entry} refData={refData} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

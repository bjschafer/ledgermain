import type { DerivedClassFeature, DerivedSheet, RefData } from "@pf1/schema";

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
 */
export function ClassFeatureRow({
  feature,
  refData,
  showOrigin = true,
}: {
  feature: DerivedClassFeature;
  refData: RefData;
  showOrigin?: boolean;
}) {
  const vendored = refData.classFeatures[feature.featureId];
  const description = vendored?.description;
  return (
    <div className="cf-archetype-feature">
      <span
        className={`cf-name${feature.applied ? "" : " struck"}`}
        title={feature.replacedBy ? `Replaced by ${feature.replacedBy}` : undefined}
      >
        {feature.name}
        <AbilityTypeTag abilityType={vendored?.abilityType} />
        {feature.detail ? <span className="cf-detail"> ({feature.detail})</span> : null}
        {showOrigin && feature.origin ? (
          <span className="cf-origin"> ({feature.origin.label})</span>
        ) : null}
        {feature.replacedBy ? <span className="cf-replaced"> → {feature.replacedBy}</span> : null}
      </span>
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
 * Displays every granted base-class feature (struck through when an active
 * archetype swaps it out, same visual language as `Provenance`'s `applied`
 * flag), followed by each active archetype's own feature list with its prose
 * description. Archetype features with no unambiguous base-feature match get a
 * soft warning ("may replace an existing ability — see description") rather
 * than a swap, per the project's hybrid-prereqs posture; the description is
 * the "see" part of that warning, not just a decoration. The dataset has at
 * least one verified copy-paste error in this prose (Two-Handed Fighter's
 * Shattering Strike row carries Bravery's text) — display-only, never a
 * mechanics source. Entries granted by a chosen cleric domain or wizard arcane
 * school (rather than the class itself) carry an `origin` label (e.g. "— Fire
 * Domain") — see `collectGrantedFeatures` in `@pf1/engine`. A slice of
 * archetype features carry a real numeric effect — hand-verified
 * (`@pf1/engine` `archetype-effects.ts`) or machine-extracted
 * (`archetype-effects-extracted.ts`) — those show a `detail` summary next to
 * the name (e.g. "DR 5/—"), same visual language as a base class feature's
 * `detail`. An extracted entry additionally gets a visible "(extracted)" text
 * note — not a hover-only tooltip, since hover-only affordances are
 * discouraged here — so a lower-confidence number is never mistaken for a
 * hand-verified one just from a glance at the sheet. Base features carry the
 * statblock (Ex)/(Su)/(Sp) tag via {@link AbilityTypeTag}; archetype features
 * never show one, since the vendored archetype-feature pack has no
 * `abilityType` field at all (an absent tag there is missing data, not an
 * untyped ability).
 */
export function ClassFeaturesList({ sheet, refData }: { sheet: DerivedSheet; refData: RefData }) {
  if (sheet.classFeatures.length === 0) return null;

  const byLevel = new Map<number, typeof sheet.classFeatures>();
  for (const f of sheet.classFeatures) {
    const list = byLevel.get(f.level) ?? [];
    list.push(f);
    byLevel.set(f.level, list);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="subsection class-features">
      <h4 className="tracker-sub">Class Features</h4>
      <div className="cf-levels">
        {levels.map((level) => (
          <div className="cf-level-row" key={level}>
            <span className="cf-level">Lv {level}</span>
            <div className="cf-archetype-features">
              {byLevel.get(level)!.map((f, i) => (
                <ClassFeatureRow key={`${f.featureId}-${i}`} feature={f} refData={refData} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {sheet.activeArchetypes.map((a) => (
        <div className="cf-archetype" key={a.id}>
          <span className="hint">{a.name}</span>
          <div className="cf-archetype-features">
            {a.features.map((f, i) => (
              <div className="cf-archetype-feature" key={`${a.id}-${i}`}>
                <span className="cf-name">
                  Lv {f.level} · {f.name}
                  {f.detail ? <span className="cf-detail"> ({f.detail})</span> : null}
                  {f.effectSource === "extracted" ? (
                    <InfoTip
                      className="badge-modeled badge-modeled--extracted badge-modeled--inline"
                      content="Machine-extracted from the vendored prose, not yet hand-verified"
                    >
                      {" "}
                      extracted
                    </InfoTip>
                  ) : null}
                  {f.ambiguous ? (
                    <InfoTip
                      className="soft"
                      content="No unambiguous base-feature match: verify manually"
                    >
                      {" "}
                      ⚠ may replace an existing ability
                    </InfoTip>
                  ) : null}
                </span>
                {f.description ? <FeatureDescription html={f.description} /> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

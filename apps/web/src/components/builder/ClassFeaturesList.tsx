import type { DerivedSheet, RefData } from "@pf1/schema";

/**
 * Collapsible HTML description, same pattern as `SpellDetail` (reuses its CSS
 * classes — visually it's the same "prose reveal" element, just for an
 * archetype feature instead of a spell).
 */
export function FeatureDescription({ html }: { html: string }) {
  return (
    <details className="spell-detail">
      <summary className="spell-detail-summary">description</summary>
      <div
        className="spell-detail-desc"
        // Archetype feature descriptions come from the vendored third-party
        // dataset (open game content) and contain only formatting tags
        // (<p>, <i>, <strong>) — no user input.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </details>
  );
}

/**
 * Displays every granted base-class feature (struck through when an active
 * archetype swaps it out, same visual language as `Provenance`'s `applied`
 * flag), followed by each active archetype's own feature list with its prose
 * description. Archetype features with no unambiguous base-feature match get
 * a soft warning ("may replace an existing ability — see description") rather
 * than a swap, per the project's hybrid-prereqs posture; the description is
 * the "see" part of that warning, not just a decoration. The dataset has at
 * least one verified copy-paste error in this prose (Two-Handed Fighter's
 * Shattering Strike row carries Bravery's text) — display-only, never a
 * mechanics source. Entries granted by a chosen cleric domain or wizard
 * arcane school (rather than the class itself) carry an `origin` label
 * (e.g. "— Fire Domain") — see `collectGrantedFeatures` in `@pf1/engine`.
 * A small hand-authored slice of archetype features carry a real numeric
 * effect (issue #7, `@pf1/engine` `archetype-effects.ts`) — those show a
 * `detail` summary next to the name (e.g. "DR 5/—"), same visual language as
 * a base class feature's `detail`.
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
              {byLevel.get(level)!.map((f, i) => {
                const description = refData.classFeatures[f.featureId]?.description;
                return (
                  <div className="cf-archetype-feature" key={`${f.featureId}-${i}`}>
                    <span
                      className={`cf-name${f.applied ? "" : " struck"}`}
                      title={f.replacedBy ? `Replaced by ${f.replacedBy}` : undefined}
                    >
                      {f.name}
                      {f.detail ? <span className="cf-detail"> ({f.detail})</span> : null}
                      {f.origin ? <span className="cf-origin"> — {f.origin.label}</span> : null}
                      {f.replacedBy ? <span className="cf-replaced"> → {f.replacedBy}</span> : null}
                    </span>
                    {description ? <FeatureDescription html={description} /> : null}
                  </div>
                );
              })}
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
                  {f.ambiguous ? (
                    <span
                      className="soft"
                      title="No unambiguous base-feature match — verify manually"
                    >
                      {" "}
                      ⚠ may replace an existing ability
                    </span>
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

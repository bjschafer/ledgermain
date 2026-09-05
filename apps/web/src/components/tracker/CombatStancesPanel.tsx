import { useMemo } from "react";

import { COMBAT_STANCES } from "@pf1/engine";

import { Explainer } from "../Explainer.js";
import { InfoTip } from "../InfoTip.js";
import { SwordIcon } from "../icons.js";
import { Panel } from "../builder/Panel.js";
import {
  activeCombatStanceId,
  activeCombatStyleTags,
  ownedCombatStyles,
  toggleCombatStance,
  toggleCombatStyle,
} from "../../model/combatStances.js";
import type { BuilderProps } from "../builder/types.js";

/** Universal player-side combat actions, applied through live buff modifiers. */
export function CombatStancesPanel({ doc, refData, update }: BuilderProps) {
  const activeId = activeCombatStanceId(doc);
  const active = COMBAT_STANCES.find((stance) => stance.id === activeId);
  const styles = useMemo(() => ownedCombatStyles(doc, refData, activeId), [doc, refData, activeId]);
  const activeStyleTags = activeCombatStyleTags(doc);
  const activeStyles = styles.filter((style) => activeStyleTags.has(style.effectTag));

  return (
    <Panel title="Stances" icon={<SwordIcon />} storageKey="panel:CombatStances">
      <div className="stance-groups">
        <section>
          <div className="stance-group-head">
            <h4 className="tracker-sub">Combat action</h4>
            <span className="hint">{active?.name ?? "None"}</span>
          </div>
          <div className="chips stance-chips">
            {COMBAT_STANCES.map((stance) => (
              <span key={stance.id} className="chip-wrap">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={stance.id === activeId}
                  onClick={() => update((d) => toggleCombatStance(d, stance))}
                >
                  {stance.name}
                </button>
                <InfoTip className="chip-info" content={stance.summary}>
                  ⓘ
                </InfoTip>
              </span>
            ))}
          </div>
        </section>

        <section>
          <div className="stance-group-head">
            <h4 className="tracker-sub">Style feats</h4>
            <span className="hint">
              {activeStyles.length > 0 ? `${activeStyles.length} active` : "None active"}
            </span>
          </div>
          {styles.length > 0 ? (
            <>
              <div className="chips stance-chips">
                {styles.map((style) => (
                  <button
                    type="button"
                    className={`chip stance-style${style.movesNumbers ? "" : " display-only"}`}
                    key={style.effectTag}
                    aria-pressed={activeStyleTags.has(style.effectTag)}
                    title={
                      style.movesNumbers
                        ? undefined
                        : "Reference only: switching this on shows its rules and changes no numbers."
                    }
                    onClick={() => update((d) => toggleCombatStyle(d, style))}
                  >
                    {style.name}
                    {style.movesNumbers ? null : (
                      <span className="dot" aria-hidden="true">
                        °
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {activeStyles.map((style) => (
                <Explainer key={style.effectTag} title={`${style.name} rules`}>
                  <div
                    className="stance-style-description"
                    // Vendored open-game-content formatting only, matching FeatsPanel.
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: style.description }}
                  />
                </Explainer>
              ))}
            </>
          ) : (
            <p className="hint stance-empty">Your combat Style feats appear here.</p>
          )}
        </section>
      </div>
      <Explainer title="How combat stances work">
        <p className="hint">
          Pick the combat action you are taking this round. Choosing another replaces it, and
          choosing the active one turns it off. Three Acrobatics ranks improve both defensive
          actions, and Total Defense prevents attacks even though the sheet keeps their reference
          numbers visible. Style feats toggle separately and stay on until you change them. Most
          characters can use one at a time, while features such as Fuse Style allow more, so the
          sheet leaves that limit to you. Dashed + ° = reference only, the same marker a condition
          uses: the style shows its rules and changes no numbers. Attack and Armor Class breakdowns
          name every applied source.
        </p>
      </Explainer>
    </Panel>
  );
}

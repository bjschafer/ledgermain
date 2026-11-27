import { useMemo } from "react";

import { COMBAT_STANCES } from "@pf1/engine";

import { Explainer } from "../Explainer.js";
import { RulesProse } from "../RulesProse.js";
import { SwordIcon } from "../icons.js";
import { Panel } from "../builder/Panel.js";
import {
  activeCombatStanceId,
  activeCombatStyleTags,
  maxActiveCombatStyles,
  availableCombatStyles,
  toggleCombatStance,
  toggleCombatStyle,
} from "../../model/combatStances.js";
import type { BuilderProps } from "../builder/types.js";

/** Universal player-side combat actions, applied through live buff modifiers. */
export function CombatStancesPanel({ doc, refData, update }: BuilderProps) {
  const activeId = activeCombatStanceId(doc);
  const active = COMBAT_STANCES.find((stance) => stance.id === activeId);
  const styles = useMemo(
    () => availableCombatStyles(doc, refData, activeId),
    [doc, refData, activeId],
  );
  const activeStyleTags = activeCombatStyleTags(doc);
  const activeStyles = styles.filter((style) => activeStyleTags.has(style.effectTag));
  const styleLimit = maxActiveCombatStyles(doc);

  return (
    <Panel resizable={false} title="Stances" icon={<SwordIcon />} storageKey="panel:CombatStances">
      <div className="stance-groups">
        <section>
          <div className="stance-group-head">
            <h4 className="tracker-sub">Combat action</h4>
            <span className="hint">{active?.name ?? "None"}</span>
          </div>
          <div className="chips stance-chips">
            {COMBAT_STANCES.map((stance) => (
              <button
                key={stance.id}
                type="button"
                className="chip"
                aria-pressed={stance.id === activeId}
                title={stance.summary}
                onClick={() => update((d) => toggleCombatStance(d, stance))}
              >
                {stance.name}
              </button>
            ))}
          </div>
          {active ? <p className="hint stance-summary">{active.summary}</p> : null}
        </section>

        <section>
          <div className="stance-group-head">
            <h4 className="tracker-sub">Style feats</h4>
            <span className="hint">
              {styleLimit > 1
                ? `${activeStyles.length} of ${styleLimit} active`
                : (activeStyles[0]?.name ?? "None active")}
            </span>
          </div>
          {styles.length > 0 ? (
            <>
              <div className="chips stance-chips">
                {styles.map((style) => (
                  <button
                    type="button"
                    className="chip"
                    key={style.effectTag}
                    aria-pressed={activeStyleTags.has(style.effectTag)}
                    title={
                      style.movesNumbers
                        ? undefined
                        : "Reminder only: switching this on shows its rules and changes no numbers."
                    }
                    onClick={() => update((d) => toggleCombatStyle(d, style))}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
              {activeStyles.map((style) => (
                <Explainer key={style.effectTag} title={`${style.name} rules`}>
                  {style.movesNumbers ? null : (
                    <p className="hint">Reminder only: the sheet's numbers don't change.</p>
                  )}
                  <RulesProse className="stance-style-description" html={style.description} />
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
          Pick the combat action you take this round; picking another replaces it, and picking the
          active one turns it off.
        </p>
        <ul className="cond-notes cond-glossary">
          {COMBAT_STANCES.map((stance) => (
            <li key={stance.id}>
              <div className="cond-note-text">
                <b>{stance.name}.</b> {stance.summary}
              </div>
            </li>
          ))}
        </ul>
        <p className="hint">
          Style feats are a separate layer that stays on until you change it. Entering one is a
          swift action and you hold a single style, so picking another replaces it. A monk's Master
          of Many Styles holds more as levels rise, and the count above tracks the limit.
        </p>
      </Explainer>
    </Panel>
  );
}

import { MEDIUM_SPIRIT_TAGS, MEDIUM_SPIRITS, mediumSpiritBonus } from "@pf1/engine";

import { Panel } from "../builder/Panel.js";
import { Explainer } from "../Explainer.js";
import { CandleIcon } from "../icons.js";
import {
  currentMediumSpirit,
  endSeance,
  gainMediumInfluence,
  hasInfluencePenalty,
  isMedium,
  loseMediumInfluence,
  MEDIUM_INFLUENCE_MAX,
  mediumInfluence,
  mediumLevel,
  performSeance,
  spiritHasTakenOver,
} from "../../model/mediumSpirits.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Medium séance panel (issue #65) — the in-play counterpart to a shaman's
 * spirit or an occultist's implements, except the spirit itself is chosen
 * fresh each day (`live.mediumSpirit`), so it lives entirely in the tracker,
 * not the builder (see `model/mediumSpirits.ts`'s doc comment). Clicking a
 * spirit performs a fresh séance: channels that spirit AND resets Influence
 * to 0, matching PF1 RAW's "each morning" ritual — re-clicking the currently
 * channeled spirit is a deliberate way to "renew" the séance and zero out
 * Influence without switching spirits.
 *
 * Spirit Powers granted by medium level + the chosen spirit show up in the
 * Classes tab's Class Features list (`origin.kind: "spiritPower"`) — this
 * panel doesn't duplicate that list, only the day-to-day bookkeeping
 * (spirit choice + Influence) and each spirit's own rules text.
 */
export function MediumSpiritPanel({ doc, update }: BuilderProps) {
  if (!isMedium(doc)) return null;

  const level = mediumLevel(doc);
  const spiritTag = currentMediumSpirit(doc);
  const spirit = spiritTag ? MEDIUM_SPIRITS[spiritTag] : undefined;
  const influence = mediumInfluence(doc);
  const bonus = mediumSpiritBonus(level);

  return (
    <Panel
      title="Séance"
      icon={<CandleIcon />}
      storageKey="panel:Medium Séance"
      right={
        spirit ? (
          <span className="hint">
            {spirit.name} · +{bonus}
          </span>
        ) : undefined
      }
    >
      <div className="chips">
        {MEDIUM_SPIRIT_TAGS.map((tag) => {
          const def = MEDIUM_SPIRITS[tag]!;
          const active = tag === spiritTag;
          return (
            <button
              key={tag}
              type="button"
              className={`chip${active ? " is-selected" : ""}`}
              aria-pressed={active}
              title={active ? `Renew séance with ${def.name}` : `Channel ${def.name}`}
              onClick={() => update((d) => performSeance(d, tag))}
            >
              {def.name}
            </button>
          );
        })}
      </div>
      {spirit ? (
        <button type="button" className="btn-ghost" onClick={() => update((d) => endSeance(d))}>
          End séance
        </button>
      ) : (
        <p className="hint">No séance performed today — choose a spirit above.</p>
      )}

      {spirit ? (
        <>
          <h4 className="tracker-sub">Influence</h4>
          <div className="hero-display">
            <div
              className="hero-pips"
              aria-label={`${influence} of ${MEDIUM_INFLUENCE_MAX} influence`}
            >
              {Array.from({ length: MEDIUM_INFLUENCE_MAX }, (_, i) => (
                <span key={i} className={i < influence ? "hero-pip filled" : "hero-pip empty"}>
                  {i < influence ? "◆" : "◇"}
                </span>
              ))}
            </div>
            <span className="hero-count num">
              {influence} / {MEDIUM_INFLUENCE_MAX}
            </span>
          </div>
          <div className="hero-controls">
            <button
              type="button"
              className="btn-act"
              disabled={influence <= 0}
              onClick={() => update((d) => loseMediumInfluence(d))}
            >
              −
            </button>
            <button
              type="button"
              className="btn-act"
              disabled={influence >= MEDIUM_INFLUENCE_MAX}
              onClick={() => update((d) => gainMediumInfluence(d))}
            >
              +
            </button>
          </div>

          {spiritHasTakenOver(doc) ? (
            <ul className="cond-notes affliction-warnings">
              <li className="affliction-warn">
                <b>The spirit has taken over</b> — at 5 influence PF1 RAW has the medium become an
                NPC under GM control until the next day. Not something this app can enforce;
                adjudicate at the table.
              </li>
            </ul>
          ) : hasInfluencePenalty(doc) ? (
            <ul className="cond-notes affliction-warnings">
              <li className="affliction-warn">
                <b>Influence penalty (3+):</b> {spirit.influencePenaltySummary}
              </li>
            </ul>
          ) : null}

          <Explainer title={`${spirit.name} Spirit`}>
            <p className="hint">
              <b>Spirit Bonus (+{bonus}):</b> {spirit.spiritBonusSummary}
            </p>
            <p className="hint">
              <b>Séance Boon:</b> {spirit.seanceBoonSummary}
            </p>
            <p className="hint">
              <b>Favored locations:</b> {spirit.favoredLocations}
            </p>
            <p className="hint">
              <b>Taboos:</b> {spirit.taboos}
            </p>
          </Explainer>
        </>
      ) : null}
    </Panel>
  );
}

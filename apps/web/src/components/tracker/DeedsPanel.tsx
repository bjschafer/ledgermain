import { useMemo } from "react";

import { deedsForClass, preciseStrikeBonus, type DeedDef } from "@pf1/engine";

import { Panel } from "../builder/Panel.js";
import { RibbonIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * In-play deed reference — gunslinger grit deeds / swashbuckler panache
 * deeds. Deeds are NOT a picker (every gunslinger/swashbuckler gets every
 * deed of her level automatically, PF1 RAW), so unlike every other
 * `*Picker.tsx` builder component in this app, this is a pure read-only
 * reference panel keyed off the character's current class level — no
 * `doc.build.*` field backs it, nothing here is ever written back to the
 * document. Lives in the tracker (not the builder) because it's a
 * table-side lookaside ("what can I spend a grit/panache point on right
 * now"), the same posture as `ResourcesPanel` it sits next to.
 *
 * Grouped by level tier (matching the deed table's own 1st/3rd/7th/11th/
 * 15th/19th[/20th] gating) with name, action type, cost, and a one-line
 * summary per deed — see `@pf1/engine` `deeds.ts`'s doc comment for why
 * these are hand-authored rather than reusing the vendored gunslinger
 * class-feature prose (which `ClassFeaturesList` already renders unchanged).
 *
 * Precise Strike (swashbuckler L3) additionally gets a live computed number.
 * Its plain bonus reaches the damage lines through the Panache pool's toggle;
 * the doubled swift-action version lasts one attack, so it's only shown here.
 */
export function DeedsPanel({ doc }: BuilderProps) {
  const gunslingerLevel = doc.identity.classes.find((c) => c.tag === "gunslinger")?.level ?? 0;
  const swashbucklerLevel = doc.identity.classes.find((c) => c.tag === "swashbuckler")?.level ?? 0;

  const gunslingerDeeds = useMemo(
    () => (gunslingerLevel > 0 ? deedsForClass("gunslinger", gunslingerLevel) : []),
    [gunslingerLevel],
  );
  const swashbucklerDeeds = useMemo(
    () => (swashbucklerLevel > 0 ? deedsForClass("swashbuckler", swashbucklerLevel) : []),
    [swashbucklerLevel],
  );

  if (gunslingerLevel === 0 && swashbucklerLevel === 0) return null;

  return (
    <Panel title="Deeds" step="dd" icon={<RibbonIcon />} storageKey="panel:Deeds">
      {gunslingerLevel > 0 && <DeedGroup title="Gunslinger Deeds (grit)" deeds={gunslingerDeeds} />}
      {swashbucklerLevel > 0 && (
        <DeedGroup
          title="Swashbuckler Deeds (panache)"
          deeds={swashbucklerDeeds}
          preciseStrikeLevel={swashbucklerLevel}
        />
      )}
    </Panel>
  );
}

function DeedGroup({
  title,
  deeds,
  preciseStrikeLevel,
}: {
  title: string;
  deeds: DeedDef[];
  /** When set, the swashbuckler's current level — used to compute Precise Strike's live bonus. */
  preciseStrikeLevel?: number;
}) {
  const byLevel = new Map<number, DeedDef[]>();
  for (const d of deeds) {
    const list = byLevel.get(d.minLevel) ?? [];
    list.push(d);
    byLevel.set(d.minLevel, list);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="subsection deeds-group">
      <h4 className="tracker-sub">{title}</h4>
      {deeds.length === 0 ? (
        <div className="empty">No deeds yet.</div>
      ) : (
        <div className="cf-levels">
          {levels.map((level) => (
            <div className="cf-level-row" key={level}>
              <span className="cf-level">Lv {level}</span>
              <div className="cf-archetype-features">
                {byLevel.get(level)!.map((d) => (
                  <div className="cf-archetype-feature deed-row" key={d.id}>
                    <span className="cf-name">
                      {d.name}
                      <span className="cf-detail">
                        {" "}
                        ({d.actionType} · {d.cost})
                      </span>
                    </span>
                    <p className="deed-summary">{d.summary}</p>
                    {preciseStrikeLevel != null && d.id === "swashbuckler:preciseStrike" ? (
                      <p className="deed-summary deed-live-number">
                        Currently: +{preciseStrikeBonus(preciseStrikeLevel)} damage (+
                        {preciseStrikeBonus(preciseStrikeLevel, true)} if you spend 1 panache to
                        double it). Turn on the Precise Strike toggle on your Panache pool to add it
                        to your piercing weapons' damage.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

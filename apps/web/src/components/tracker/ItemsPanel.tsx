import { FeatureDescription } from "../builder/ClassFeaturesList.js";
import { Panel } from "../builder/Panel.js";
import { BagIcon } from "../icons.js";
import { ApplyBuffButton, type ApplyBuffWording } from "./spells/rowControls.js";
import {
  playItems,
  restoreItem,
  restoreItemLine,
  selfUseLine,
  spendItem,
  spendItemLine,
  type PlayItem,
} from "../../model/playItems.js";
import { buffsForSpell } from "../../model/spellBuffs.js";
import type { BuilderProps } from "../builder/types.js";

function selfUseWording(item: PlayItem): ApplyBuffWording {
  const cost = item.track === "charges" ? "spends a charge" : "uses one up";
  return {
    apply: (buff) => `Use ${item.name} on yourself: ${cost} and applies ${buff}`,
    drop: (buff) => `${buff} is active: click to drop it (the item stays used)`,
    choose: () => `Use ${item.name} on yourself: choose a variant`,
    exhausted: "None left.",
  };
}

/**
 * Potions, scrolls, wands, and the rest of the carried gear that gets used up,
 * spent straight from the inventory (`model/playItems.ts`). Adding or removing
 * an item stays on the Build tab; this only moves the counts. A generated
 * consumable whose spell has a buff also offers "+ Buff": use it on yourself,
 * spending it and applying the buff at the item's caster level.
 */
export function ItemsPanel({ doc, refData, update }: BuilderProps) {
  const items = playItems(doc, refData);

  const spend = (item: PlayItem) =>
    update((d) => spendItem(d, item), {
      logAs: { text: spendItemLine(item), tone: "neutral", kind: "item" },
    });
  const restore = (item: PlayItem) =>
    update((d) => restoreItem(d, item), {
      logAs: { text: restoreItemLine(item), tone: "neutral", kind: "item" },
    });

  return (
    <Panel title="Items" icon={<BagIcon />} storageKey="panel:Items">
      {items.length === 0 ? (
        <div className="empty">
          No potions, scrolls, wands, or other consumables yet: add them to your gear in the Build
          tab.
        </div>
      ) : (
        <div className="res-list">
          {items.map((item) => (
            <div key={item.index} className="res-row pool-row">
              <div className="res-head">
                <span className="res-name">{item.name}</span>
                {item.per ? <span className="res-sub">per {item.per}</span> : null}
              </div>
              <div className="res-count num">
                {item.left}
                {item.max != null ? (
                  <>
                    <span className="res-slash">/</span>
                    {item.max}
                  </>
                ) : (
                  <span className="res-slash">{" left"}</span>
                )}
              </div>
              <div className="res-btns">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => spend(item)}
                  disabled={item.left <= 0}
                  aria-label={`use ${item.name}`}
                  title={item.track === "charges" ? "Use a charge" : "Use one"}
                >
                  −
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => restore(item)}
                  disabled={item.max != null && item.left >= item.max}
                  aria-label={`${item.track === "charges" ? "restore" : "add"} ${item.name}`}
                  title={item.track === "charges" ? "Restore a charge" : "Add one"}
                >
                  +
                </button>
              </div>
              {item.castsSpell && buffsForSpell(item.castsSpell.spell, refData).length > 0 ? (
                <div className="res-body">
                  <div className="res-linked-buffs">
                    <ApplyBuffButton
                      spell={item.castsSpell.spell}
                      refData={refData}
                      doc={doc}
                      update={update}
                      casterLevel={item.castsSpell.casterLevel}
                      onCast={(d) => spendItem(d, item)}
                      castExhausted={item.left <= 0}
                      wording={selfUseWording(item)}
                      logAs={(buff, rounds) => ({
                        text: selfUseLine(item, buff.name, rounds),
                        tone: "neutral",
                        kind: "item",
                      })}
                    />
                  </div>
                </div>
              ) : null}
              {item.description ? (
                <div className="res-body">
                  <FeatureDescription html={item.description} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

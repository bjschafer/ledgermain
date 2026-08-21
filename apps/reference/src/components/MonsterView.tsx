import type { Monster, MonsterTemplate } from "@pf1/schema";
import { useMemo, useState } from "react";

import { applyAdjustments } from "../model/adjust/apply.js";
import { AUGMENT_SUMMONING, STATBLOCK_TEMPLATES } from "../model/adjust/templates.js";
import type { StatblockAdjustment } from "../model/adjust/types.js";
import { AdjustmentNotes, AdjustmentPicker } from "./AdjustPanel.js";
import { Chip, Description, Row, Sources } from "./parts.js";

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_LABEL: Record<(typeof ABILITY_ORDER)[number], string> = {
  str: "Str",
  dex: "Dex",
  con: "Con",
  int: "Int",
  wis: "Wis",
  cha: "Cha",
};

/** `Str 10, Dex 17, Con —, Int 2, Wis 13, Cha 4` — a missing score is the printed em dash. */
function abilityLine(monster: Monster): string | null {
  if (!monster.abilityScores) return null;
  return ABILITY_ORDER.map(
    (key) => `${ABILITY_LABEL[key]} ${monster.abilityScores?.[key] ?? "—"}`,
  ).join(", ");
}

/** `N Small animal (air, extraplanar)` — the printed type line. */
function typeLine(monster: Monster): string | null {
  const head = [monster.alignment, monster.size, monster.creatureType].filter(Boolean).join(" ");
  const subtypes = monster.subtypes?.length ? ` (${monster.subtypes.join(", ")})` : "";
  return head || subtypes ? `${head}${subtypes}` : null;
}

export function MonsterView({
  monster,
  changedFields,
}: {
  monster: Monster;
  /** Fields touched by a statblock adjustment; their row/chip gets a "row-changed" highlight. */
  changedFields?: ReadonlySet<keyof Monster>;
}) {
  const changed = (field: keyof Monster): boolean => changedFields?.has(field) ?? false;
  const hp =
    monster.hp !== undefined
      ? `${monster.hp}${monster.hd ? ` (${monster.hd})` : ""}${monster.hpNote ? `; ${monster.hpNote}` : ""}`
      : null;
  return (
    <>
      <div className="stat-strip">
        {monster.cr && <Chip changed={changed("cr")}>CR {monster.cr}</Chip>}
        {monster.mythicRank !== undefined && <Chip>MR {monster.mythicRank}</Chip>}
        {monster.xp !== undefined && (
          <Chip changed={changed("xp")}>XP {monster.xp.toLocaleString("en-US")}</Chip>
        )}
        {monster.ac !== undefined && (
          <Chip changed={changed("ac") || changed("touchAc") || changed("flatFootedAc")}>
            AC {monster.ac}, touch {monster.touchAc}, flat-footed {monster.flatFootedAc}
          </Chip>
        )}
        {hp && (
          <Chip tone="damage" changed={changed("hp") || changed("hd") || changed("hpNote")}>
            hp {hp}
          </Chip>
        )}
        {monster.fort && (
          <Chip tone="save" changed={changed("fort")}>
            Fort {monster.fort}
          </Chip>
        )}
        {monster.ref && (
          <Chip tone="save" changed={changed("ref")}>
            Ref {monster.ref}
          </Chip>
        )}
        {monster.will && (
          <Chip tone="save" changed={changed("will")}>
            Will {monster.will}
          </Chip>
        )}
      </div>

      <Row label="Type" changed={changed("size") || changed("subtypes")}>
        {typeLine(monster)}
      </Row>
      <Row label="Init" changed={changed("init")}>
        {monster.init}
      </Row>
      <Row label="Senses" changed={changed("senses")}>
        {monster.senses}
      </Row>
      <Row label="Aura" changed={changed("aura")}>
        {monster.aura}
      </Row>
      <Row label="AC mods" changed={changed("acMods")}>
        {monster.acMods}
      </Row>
      <Row label="Defensive" changed={changed("defensiveAbilities")}>
        {monster.defensiveAbilities}
      </Row>
      <Row label="DR" changed={changed("dr")}>
        {monster.dr}
      </Row>
      <Row label="Immune" changed={changed("immune")}>
        {monster.immune}
      </Row>
      <Row label="Resist" changed={changed("resist")}>
        {monster.resist}
      </Row>
      <Row label="SR" changed={changed("sr")}>
        {monster.sr}
      </Row>
      <Row label="Weaknesses" changed={changed("weaknesses")}>
        {monster.weaknesses}
      </Row>
      <Row label="Speed" changed={changed("speed")}>
        {monster.speed}
      </Row>
      <Row label="Melee" changed={changed("melee")}>
        {monster.melee}
      </Row>
      <Row label="Ranged" changed={changed("ranged")}>
        {monster.ranged}
      </Row>
      <Row label="Space/Reach">
        {monster.space || monster.reach
          ? `${monster.space ?? "5 ft."}${monster.reach ? `, reach ${monster.reach}` : ""}`
          : null}
      </Row>
      <Row label="Special Attacks" changed={changed("specialAttacks")}>
        {monster.specialAttacks}
      </Row>
      <Row label="Abilities" changed={changed("abilityScores")}>
        {abilityLine(monster)}
      </Row>
      <Row label="Ability note">{monster.statNote}</Row>
      <Row label="Base Atk">{monster.bab}</Row>
      <Row label="CMB" changed={changed("cmb")}>
        {monster.cmb}
      </Row>
      <Row label="CMD" changed={changed("cmd")}>
        {monster.cmd}
      </Row>
      <Row label="Feats">{monster.feats}</Row>
      <Row label="Skills">{monster.skills}</Row>
      <Row label="Racial Mods">{monster.racialModifiers}</Row>
      <Row label="Languages">{monster.languages}</Row>
      <Row label="SQ" changed={changed("sq")}>
        {monster.sq}
      </Row>
      <Row label="Environment">{monster.environment}</Row>
      <Row label="Organization">{monster.organization}</Row>
      <Row label="Treasure">{monster.treasure}</Row>

      <Description html={monster.spellsHtml} />
      {monster.specialAbilitiesHtml && (
        <Description
          html={`<p><strong>Special Abilities</strong></p>\n${monster.specialAbilitiesHtml}`}
        />
      )}
      <Description html={monster.description} />
      <Sources sources={monster.sources} />
    </>
  );
}

/** Every togglable adjustment, in the fixed order `applyAdjustments` should see them applied in. */
const ADJUSTMENT_OPTIONS: readonly StatblockAdjustment[] = [
  ...STATBLOCK_TEMPLATES,
  AUGMENT_SUMMONING,
];

/**
 * Wraps `MonsterView` with the "Adjust statblock" picker: readers stack any of
 * the seven simple templates plus Augment Summoning against the printed
 * statblock, entirely client-side and without touching the route.
 */
export function MonsterDetail({ monster }: { monster: Monster }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  function toggle(key: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const applied = useMemo(
    () => ADJUSTMENT_OPTIONS.filter((option) => selected.has(option.key)),
    [selected],
  );

  const result = useMemo(
    () => (applied.length > 0 ? applyAdjustments(monster, applied) : null),
    [monster, applied],
  );

  const changedFields = useMemo(
    () => (result ? new Set(result.changes.map((c) => c.field)) : undefined),
    [result],
  );

  return (
    <>
      <section className="adjust-section">
        <h2 className="adjust-section-title">Adjust statblock</h2>
        <AdjustmentPicker
          options={ADJUSTMENT_OPTIONS}
          selected={selected}
          onToggle={toggle}
          title="Templates stack; Augment Summoning is a feat, not a template."
        />
        {applied.length > 0 && (
          <div className="adjust-applied">
            <div className="adjust-applied-chips">
              {applied.map((option) => (
                <Chip key={option.key}>{option.label}</Chip>
              ))}
            </div>
            <button type="button" className="adjust-reset" onClick={() => setSelected(new Set())}>
              Reset to printed statblock
            </button>
          </div>
        )}
        {result && <AdjustmentNotes notes={result.notes} />}
      </section>
      <div className={result ? "adjust-tinted" : undefined}>
        <MonsterView monster={result?.monster ?? monster} changedFields={changedFields} />
      </div>
    </>
  );
}

export function MonsterTemplateView({ template }: { template: MonsterTemplate }) {
  return (
    <>
      <div className="stat-strip">
        {template.cr && <Chip>CR {template.cr}</Chip>}
        {template.simple && <Chip>simple</Chip>}
        {template.acquired && <Chip>acquired</Chip>}
        {template.inherited && <Chip>inherited</Chip>}
        {(template.summonable || template.maybeSummonable) && <Chip>summonable</Chip>}
      </div>
      <Description html={template.description} />
      <Sources sources={template.sources} />
    </>
  );
}

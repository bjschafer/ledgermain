import type { Monster, MonsterTemplate } from "@pf1/schema";

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

export function MonsterView({ monster }: { monster: Monster }) {
  const hp =
    monster.hp !== undefined
      ? `${monster.hp}${monster.hd ? ` (${monster.hd})` : ""}${monster.hpNote ? `; ${monster.hpNote}` : ""}`
      : null;
  return (
    <>
      <div className="stat-strip">
        {monster.cr && <Chip>CR {monster.cr}</Chip>}
        {monster.mythicRank !== undefined && <Chip>MR {monster.mythicRank}</Chip>}
        {monster.xp !== undefined && <Chip>XP {monster.xp.toLocaleString("en-US")}</Chip>}
        {monster.ac !== undefined && (
          <Chip>
            AC {monster.ac}, touch {monster.touchAc}, flat-footed {monster.flatFootedAc}
          </Chip>
        )}
        {hp && <Chip tone="damage">hp {hp}</Chip>}
        {monster.fort && <Chip tone="save">Fort {monster.fort}</Chip>}
        {monster.ref && <Chip tone="save">Ref {monster.ref}</Chip>}
        {monster.will && <Chip tone="save">Will {monster.will}</Chip>}
      </div>

      <Row label="Type">{typeLine(monster)}</Row>
      <Row label="Init">{monster.init}</Row>
      <Row label="Senses">{monster.senses}</Row>
      <Row label="Aura">{monster.aura}</Row>
      <Row label="AC mods">{monster.acMods}</Row>
      <Row label="Defensive">{monster.defensiveAbilities}</Row>
      <Row label="DR">{monster.dr}</Row>
      <Row label="Immune">{monster.immune}</Row>
      <Row label="Resist">{monster.resist}</Row>
      <Row label="SR">{monster.sr}</Row>
      <Row label="Weaknesses">{monster.weaknesses}</Row>
      <Row label="Speed">{monster.speed}</Row>
      <Row label="Melee">{monster.melee}</Row>
      <Row label="Ranged">{monster.ranged}</Row>
      <Row label="Space/Reach">
        {monster.space || monster.reach
          ? `${monster.space ?? "5 ft."}${monster.reach ? `, reach ${monster.reach}` : ""}`
          : null}
      </Row>
      <Row label="Special Attacks">{monster.specialAttacks}</Row>
      <Row label="Abilities">{abilityLine(monster)}</Row>
      <Row label="Ability note">{monster.statNote}</Row>
      <Row label="Base Atk">{monster.bab}</Row>
      <Row label="CMB">{monster.cmb}</Row>
      <Row label="CMD">{monster.cmd}</Row>
      <Row label="Feats">{monster.feats}</Row>
      <Row label="Skills">{monster.skills}</Row>
      <Row label="Racial Mods">{monster.racialModifiers}</Row>
      <Row label="Languages">{monster.languages}</Row>
      <Row label="SQ">{monster.sq}</Row>
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

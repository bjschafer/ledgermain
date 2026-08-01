import type { Feat } from "@pf1/schema";

import { detailHref } from "../hooks/useHashRoute.js";
import { Description, Row, Sources } from "./parts.js";

const ABILITY_LABEL: Record<string, string> = {
  str: "Str",
  dex: "Dex",
  con: "Con",
  int: "Int",
  wis: "Wis",
  cha: "Cha",
};

export function FeatView({ feat }: { feat: Feat }) {
  const p = feat.prerequisites;
  const abilities = p.abilities.map((a) => `${ABILITY_LABEL[a.ability] ?? a.ability} ${a.min}`);
  const skills = p.skills.map((s) => s.raw);

  return (
    <>
      {feat.tags.length > 0 && <p className="detail-sub">{feat.tags.join(" · ")}</p>}

      <div className="rows">
        <Row label="Abilities">{abilities.length > 0 ? abilities.join(", ") : null}</Row>
        <Row label="Base attack">{p.bab !== undefined ? `+${p.bab}` : null}</Row>
        <Row label="Caster level">{p.casterLevel !== undefined ? `${p.casterLevel}` : null}</Row>
        <Row label="Skills">{skills.length > 0 ? skills.join(", ") : null}</Row>
        <Row label="Feats">
          {p.feats.length > 0
            ? p.feats.map((ref, i) => (
                <span key={ref.id}>
                  {i > 0 && ", "}
                  <a href={detailHref("feats", ref.id)}>{ref.name}</a>
                </span>
              ))
            : null}
        </Row>
        {(p.featsAnyOf ?? []).map((group, gi) => (
          <Row key={gi} label="Feats (any one)">
            {group.map((ref, i) => (
              <span key={ref.id}>
                {i > 0 && " or "}
                <a href={detailHref("feats", ref.id)}>{ref.name}</a>
              </span>
            ))}
          </Row>
        ))}
      </div>

      {p.prereqText && (
        <p className="muted-note">
          <span className="muted-note-label">Unparsed prerequisites</span> {p.prereqText}
        </p>
      )}

      <Description html={feat.description} />
      <Sources sources={feat.sources} />
    </>
  );
}

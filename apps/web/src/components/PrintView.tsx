import { useMemo } from "react";

import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { buildPrintSheet } from "../model/printSheet.js";

/**
 * Read-only printable character sheet (issue #69): a single pass over the
 * already-computed `DerivedSheet` (plus the feat/spell/resource model helpers
 * the live tracker uses) laid out for `@media print` / Chromium's
 * print-to-PDF. Takes over the whole viewport in place of the app shell (see
 * `App.tsx`) rather than living alongside it, so nothing else in the DOM
 * needs `@media print` overrides to hide it.
 */
export function PrintView({
  doc,
  sheet,
  refData,
  onClose,
}: {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
  onClose: () => void;
}) {
  const data = useMemo(() => buildPrintSheet(doc, sheet, refData), [doc, sheet, refData]);
  const { header } = data;

  return (
    <div className="print-view">
      <div className="print-toolbar no-print">
        <button type="button" className="btn-ghost" onClick={onClose}>
          ← Back
        </button>
        <button type="button" className="btn-gold" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="print-page">
        <header className="print-header">
          <div className="print-name">{header.name}</div>
          <div className="print-sub">
            {[header.raceName, header.size, header.classLine].filter(Boolean).join(" · ")}
            {header.level > 0 ? ` · Level ${header.level}` : ""}
          </div>
          <div className="print-identity">
            {[
              header.alignment,
              header.deity ? `Deity: ${header.deity}` : null,
              header.gender,
              header.age ? `Age ${header.age}` : null,
              header.heightWeight,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {header.languages.length > 0 && (
            <div className="print-identity">Languages: {header.languages.join(", ")}</div>
          )}
        </header>

        <section className="print-grid print-grid--top">
          <div className="print-block">
            <h3>Abilities</h3>
            <div className="print-abilities">
              {data.abilities.map((a) => (
                <div key={a.id} className="print-ability">
                  <span className="print-ability-abbr">{a.abbr}</span>
                  <span className="print-ability-score num">{a.total}</span>
                  <span className="print-ability-mod num">{a.mod}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="print-block">
            <h3>Defense</h3>
            <table className="print-table">
              <tbody>
                <tr>
                  <td>AC</td>
                  <td className="num">{data.ac.normal}</td>
                  <td>Touch</td>
                  <td className="num">{data.ac.touch}</td>
                </tr>
                <tr>
                  <td>Flat-Footed</td>
                  <td className="num">{data.ac.flatFooted}</td>
                  <td>CMD</td>
                  <td className="num">{data.ac.cmd}</td>
                </tr>
                {data.saves.map((s) => (
                  <tr key={s.label}>
                    <td colSpan={3}>{s.label} Save</td>
                    <td className="num">{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data.dr.length > 0 || data.resistances.length > 0 || data.sr !== undefined) && (
              <p className="print-hint">
                {data.dr.map((d) => `DR ${d.total}/${d.qualifier}`).join(", ")}
                {data.dr.length > 0 && (data.resistances.length > 0 || data.sr !== undefined)
                  ? " · "
                  : ""}
                {data.resistances.map((r) => `Resist ${r.qualifier} ${r.total}`).join(", ")}
                {data.resistances.length > 0 && data.sr !== undefined ? " · " : ""}
                {data.sr !== undefined ? `SR ${data.sr}` : ""}
              </p>
            )}
            {data.arcaneSpellFailure !== undefined && (
              <p className="print-hint">Arcane Spell Failure {data.arcaneSpellFailure}%</p>
            )}
          </div>

          <div className="print-block">
            <h3>Hit Points &amp; Movement</h3>
            <table className="print-table">
              <tbody>
                <tr>
                  <td>HP</td>
                  <td className="num">
                    {data.hp.current} / {data.hp.max}
                  </td>
                  <td>Nonlethal</td>
                  <td className="num">{data.hp.nonlethal}</td>
                </tr>
                {data.hp.temp > 0 && (
                  <tr>
                    <td colSpan={3}>Temp HP</td>
                    <td className="num">{data.hp.temp}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3}>Initiative</td>
                  <td className="num">{data.initiative}</td>
                </tr>
                {data.speeds.map((s) => (
                  <tr key={s.label}>
                    <td colSpan={3}>{s.label} Speed</td>
                    <td className="num">{s.value} ft</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-block print-section">
          <h3>Offense</h3>
          <div className="print-offense">
            <span className="print-stat">
              Melee <span className="num">{data.melee}</span>
            </span>
            <span className="print-stat">
              Ranged <span className="num">{data.ranged}</span>
            </span>
            <span className="print-stat">
              BAB <span className="num">{data.bab}</span>
            </span>
            <span className="print-stat">
              CMB <span className="num">{data.cmb}</span>
            </span>
          </div>
          {data.attacks.length > 0 && (
            <table className="print-table print-attacks">
              <thead>
                <tr>
                  <th>Weapon</th>
                  <th>Attack</th>
                  <th>Damage</th>
                  <th>Crit</th>
                </tr>
              </thead>
              <tbody>
                {data.attacks.map((atk, i) => (
                  <tr key={i}>
                    <td>{atk.name}</td>
                    <td className="num">{atk.attack}</td>
                    <td className="num">{atk.damage}</td>
                    <td>{atk.crit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="print-block print-section">
          <h3>Skills</h3>
          <div className="print-skill-list">
            {data.skills.map((s) => (
              <div key={s.name} className="print-skill">
                <span>
                  {s.name}
                  {s.classSkill ? "*" : ""}
                </span>
                <span className="num">{s.total}</span>
              </div>
            ))}
          </div>
        </section>

        {data.feats.length > 0 && (
          <section className="print-block print-section">
            <h3>Feats</h3>
            <ul className="print-list">
              {data.feats.map((f) => (
                <li key={f.key}>{f.name}</li>
              ))}
            </ul>
          </section>
        )}

        {data.classFeatures.length > 0 && (
          <section className="print-block print-section">
            <h3>Class Features</h3>
            <ul className="print-list">
              {data.classFeatures.map((f, i) => (
                <li key={`${f.level}-${f.name}-${i}`}>
                  <strong>{f.name}</strong> (L{f.level}){f.detail ? ` — ${f.detail}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.resources.length > 0 && (
          <section className="print-block print-section">
            <h3>Resources</h3>
            <div className="print-resource-list">
              {data.resources.map((r) => (
                <div key={r.id} className="print-resource">
                  <span>
                    {r.name}
                    {r.detail ? ` (${r.detail})` : ""}
                  </span>
                  <span className="num">
                    {r.remaining} / {r.max}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.casters.map((c) => (
          <section key={c.classTag} className="print-block print-section print-spells">
            <h3>
              {c.className} Spells <span className="print-hint">CL {c.casterLevel}</span>
            </h3>
            <div className="print-spell-levels">
              {c.levels.map((lvl) => (
                <div key={lvl.level} className="print-spell-level">
                  <div className="print-spell-level-head">
                    {lvl.isCantrip ? "Cantrips" : `Level ${lvl.level}`}
                    {!lvl.isCantrip && lvl.slots > 0 ? ` (${lvl.slots}/day, DC ${lvl.dc})` : ""}
                  </div>
                  {lvl.spells.length === 0 ? (
                    <div className="print-hint">— none —</div>
                  ) : (
                    <ul className="print-list print-spell-list">
                      {lvl.spells.map((sp, i) => (
                        <li key={`${sp.name}-${i}`} className={sp.ready ? "" : "is-expended"}>
                          {sp.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

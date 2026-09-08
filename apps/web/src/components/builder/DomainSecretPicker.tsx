import { useMemo } from "react";

import { metamagicDef } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  DOMAIN_SECRET_FEAT_SLUGS,
  domainSecretPicks,
  domainSecretSlotCount,
  setDomainSecretFeat,
  setDomainSecretSpell,
} from "../../model/freeMetamagic.js";
import { domainSpellLevelMap } from "../../model/preparedSpells.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

/**
 * Theologian Domain Secret: one domain spell permanently modified by one of
 * nine named metamagic feats, a second at 10th, a third at 15th and a fourth
 * at 20th. Both halves of a pick are stored in `build.pickChoices`
 * (`domainSecret:<n>:spell` / `:feat`), and a completed pick makes the spell
 * prepare already modified with its feat's slot cost waived — see
 * `model/freeMetamagic.ts`.
 *
 * Renders only for a theologian cleric of 5th level or higher; a slot the
 * player hasn't filled in contributes nothing, the same no-pick-no-effect
 * posture the metamagic-discount traits take. The ability says the same spell
 * may not be modified twice, so a spell already named by another slot drops
 * out of the remaining slots' options.
 */
export function DomainSecretPicker({
  doc,
  refData,
  update,
}: {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:DomainSecret", false);
  const slotCount = domainSecretSlotCount(doc);
  const picks = domainSecretPicks(doc);

  // The theologian's own domain spells, by level — the pool the ability draws
  // on. A subdomain-swapped slot resolves through the same map the tracker's
  // domain slots use.
  const spellOptions = useMemo(() => {
    const levels = domainSpellLevelMap(refData, doc.build.clericDomains ?? []);
    return [...levels.entries()]
      .map(([id, level]) => ({ id, level, name: refData.spells[id]?.name ?? id }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [refData, doc.build.clericDomains]);

  if (slotCount === 0) return null;

  const takenSpellIds = new Set(picks.map((p) => p.spellId).filter((id) => id !== undefined));

  return (
    <div className="subsection">
      <div
        className="subsection-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleCollapsed();
        }}
        aria-expanded={!collapsed}
      >
        <h3>Domain Secret</h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint">
            Each secret permanently modifies one of your domain spells with a metamagic feat, at no
            change to its level. You need not have the feat. Once both halves are picked, the spell
            prepares already modified and the feat costs no extra slot. A spell may only be modified
            once.
          </p>
          {spellOptions.length === 0 && (
            <p className="hint">Choose a domain (above) to pick a spell for this.</p>
          )}
          {picks.map((pick) => (
            <div key={pick.slot} className="pick-row">
              <div className="pmain">
                <div className="pname">Secret {pick.slot}</div>
                <label className="hint" style={{ marginTop: 2, display: "block" }}>
                  Domain spell:{" "}
                  <select
                    value={pick.spellId ?? ""}
                    onChange={(e) =>
                      update((d) => setDomainSecretSpell(d, pick.slot, e.target.value || undefined))
                    }
                  >
                    <option value="">Choose</option>
                    {spellOptions
                      .filter((o) => o.id === pick.spellId || !takenSpellIds.has(o.id))
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} (level {o.level})
                        </option>
                      ))}
                  </select>
                </label>
                <label className="hint" style={{ marginTop: 2, display: "block" }}>
                  Metamagic feat:{" "}
                  <select
                    value={pick.slug ?? ""}
                    onChange={(e) =>
                      update((d) => setDomainSecretFeat(d, pick.slot, e.target.value || undefined))
                    }
                  >
                    <option value="">Choose</option>
                    {DOMAIN_SECRET_FEAT_SLUGS.map((slug) => (
                      <option key={slug} value={slug}>
                        {metamagicDef(slug)?.name ?? slug}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

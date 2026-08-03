import { useMemo, useState } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import { setBlessings } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { InfoTip } from "../InfoTip.js";
import { FeatureDescription } from "./ClassFeaturesList.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface BlessingPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * True when the warpriest has named a deity AND this blessing states a
 * concrete deity list (see `Blessing.deities`' doc comment for the handful
 * of conditional-rule entries that state neither), and the two don't match —
 * a soft, non-blocking signal only; `identity.deity` is free text so this is
 * a case-insensitive exact-name check, not a real validation.
 */
function deityMismatch(
  identityDeity: string | undefined,
  blessingDeities: string[] | undefined,
): boolean {
  const deity = identityDeity?.trim();
  if (!deity || !blessingDeities || blessingDeities.length === 0) return false;
  const norm = deity.toLowerCase();
  return !blessingDeities.some((d) => d.toLowerCase() === norm);
}

/**
 * Blessing selection for the warpriest, the class's domain analogue (PF1 ACG
 * "Blessings" class feature): pick exactly two at 1st level, each granting a
 * minor power immediately and a major power at 10th. Free-choice, same
 * hybrid soft-warning posture as `DomainPicker`: `identity.deity` is free
 * text with no deity->domain mapping anywhere in the vendored data (the same
 * gap `FavoredWeaponPicker` documents), so the RAW constraint ("the
 * blessings chosen must match the domains selected by [a domain-granting]
 * class"; a deity-less warpriest "still selects two blessings ... subject to
 * GM approval") surfaces only as a per-blessing hint, matched against that
 * blessing's own "Deities:" list (`Blessing.deities`) when both it and
 * `identity.deity` are set — never a block, and silent for a deity-less
 * warpriest or a houserule pick.
 *
 * Both powers are always shown for browsing, but the major power is flagged
 * "not yet unlocked" below 10th warpriest level (mirrors `PatronPicker`'s
 * bonus-spell convention) — `@pf1/engine`'s `collectGrantedFeatures` applies
 * the same 1st/10th gate to what actually shows up in Class Features.
 * Uses/day and the save DC are already stated in the vendored "Blessings"
 * class feature's own prose, not repeated here.
 */
export function BlessingPicker({ doc, refData, update }: BlessingPickerProps) {
  const isWarpriest = doc.identity.classes.some((c) => c.tag === "warpriest");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Blessings", false);
  const [query, setQuery] = useState("");

  const blessings = useMemo(
    () => Object.values(refData.blessings).sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );
  const byId = useMemo(() => new Map(blessings.map((b) => [b.id, b])), [blessings]);

  const chosen = doc.build.blessings ?? [];
  const warpriestLevel = doc.identity.classes.find((c) => c.tag === "warpriest")?.level ?? 0;

  if (!isWarpriest) return null;

  const q = query.trim().toLowerCase();
  const shown = q ? blessings.filter((b) => b.name.toLowerCase().includes(q)) : blessings;

  function toggle(id: string) {
    const idx = chosen.indexOf(id);
    if (idx >= 0) {
      const next = [...chosen];
      next.splice(idx, 1);
      update((d) => setBlessings(d, next));
      return;
    }
    if (chosen.length >= 2) return; // silently no-op past the class's allowance
    update((d) => setBlessings(d, [...chosen, id]));
  }

  return (
    <div className="subsection blessing-picker">
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
        <h3>
          Blessings
          {chosen.length > 0 ? (
            <span className="hint">
              {" "}
              · {chosen.map((id) => byId.get(id)?.name ?? id).join(", ")}
            </span>
          ) : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint blessing-picker-hint">
            Pick two blessings (a warpriest gets two at 1st level, drawn from her deity's domains).
            Each grants a minor power right away and a major power at 10th level. Free-choice: no
            deity validation blocks a pick, though a mismatch with this blessing's own deity list
            shows a hint below.
          </p>
          <input
            className="search"
            type="text"
            placeholder={`Search ${blessings.length} blessings…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips blessing-chips">
            {shown.map((b) => (
              <button
                key={b.id}
                type="button"
                className="chip"
                aria-pressed={chosen.includes(b.id)}
                onClick={() => toggle(b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>
          {chosen.map((id) => {
            const blessing = byId.get(id);
            if (!blessing) return null;
            const mismatch = deityMismatch(doc.identity.deity, blessing.deities);
            const majorLocked = warpriestLevel < 10;
            return (
              <div className="domain-description blessing-detail" key={id}>
                <div className="domain-slot-header">
                  <span className="hint">{blessing.name}</span>
                  {mismatch ? (
                    <InfoTip
                      className="soft"
                      content={`${doc.identity.deity} isn't in this blessing's own deity list: verify against your domains`}
                    >
                      ⚠ deity mismatch
                    </InfoTip>
                  ) : null}
                </div>
                <div className="blessing-power">
                  <span className="cf-name">{blessing.minorPower.name} (minor, 1st level)</span>
                  <FeatureDescription html={blessing.minorPower.description} />
                </div>
                <div className="blessing-power">
                  <span className="cf-name">
                    {blessing.majorPower.name} (major, 10th level)
                    {majorLocked ? <span className="hint"> (not yet unlocked)</span> : null}
                  </span>
                  <FeatureDescription html={blessing.majorPower.description} />
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";

import { archetypeModeledEffectTier, type ArchetypeEffectTier } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { archetypeConflictWarnings, checkArchetypeConflict } from "../../model/archetypes.js";
import { setArchetypes } from "../../model/doc.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface ArchetypePickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Archetype selection, free-choice within the 5 classes the vendored dataset
 * covers. A candidate that would swap the same base-class feature slot as an
 * already-chosen archetype is hard-blocked (structured signal — see
 * `model/archetypes.ts`), since `resolveClassFeatures` applies swaps last-wins
 * and the earlier pick would silently do nothing. Collapsed by default: with
 * ~180 archetypes across 5 classes this list is the single largest picker in
 * the builder, and most characters won't use one.
 */
export function ArchetypePicker({ doc, refData, update }: ArchetypePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const chosen = doc.build.archetypes ?? [];

  const byClass = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; tier: ArchetypeEffectTier }[]>();
    for (const a of Object.values(refData.archetypes)) {
      const list = groups.get(a.classTag) ?? [];
      list.push({ id: a.id, name: a.name, tier: archetypeModeledEffectTier(refData, a.id) });
      groups.set(a.classTag, list);
    }
    for (const list of groups.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  }, [refData]);

  const classTags = doc.identity.classes.map((c) => c.tag).filter((tag) => byClass.has(tag));
  if (classTags.length === 0) return null;

  const q = query.trim().toLowerCase();

  function toggle(id: string, blocked: boolean) {
    if (blocked) return;
    const set = new Set(chosen);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    update((d) => setArchetypes(d, [...set]));
  }

  return (
    <div className="subsection archetype-picker">
      <div
        className="subsection-header"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((o) => !o);
        }}
        aria-expanded={open}
      >
        <h3>
          Archetypes
          {chosen.length > 0 ? <span className="hint"> · {chosen.length} chosen</span> : null}
        </h3>
        <span className="panel-caret">{open ? "▾" : "▸"}</span>
      </div>
      {open && (
        <>
          <p className="hint">
            Mostly structural swaps — a hand-verified slice (marked{" "}
            <span className="badge-modeled">M</span>) or a machine-extracted slice (marked{" "}
            <span className="badge-modeled badge-modeled--extracted">M</span>, lower confidence —
            see Class Features below for its provenance sentence) carries a real numeric effect; the
            rest show prose only. Picking one that would replace an already-swapped ability is
            blocked (it would silently do nothing).
          </p>
          {archetypeConflictWarnings(doc, refData).map((w) => (
            <p key={w} className="hint affliction-warn">
              ⚠ {w}
            </p>
          ))}
          <input
            className="search"
            type="text"
            placeholder="Search archetypes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {classTags.map((tag) => {
            const options = byClass.get(tag)!;
            const shown = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
            if (shown.length === 0) return null;
            const classDef = Object.values(refData.classes).find((c) => c.tag === tag);
            return (
              <div key={tag} className="archetype-class-group">
                <span className="hint">{classDef?.name ?? tag}</span>
                <div className="chips">
                  {shown.map((a) => {
                    const isChosen = chosen.includes(a.id);
                    const conflict = isChosen
                      ? { blocked: false }
                      : checkArchetypeConflict(refData, chosen, a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className="chip"
                        aria-pressed={isChosen}
                        disabled={conflict.blocked}
                        title={
                          conflict.blocked
                            ? `Conflicts with ${conflict.conflictsWith} — both swap the same ability`
                            : undefined
                        }
                        onClick={() => toggle(a.id, conflict.blocked)}
                      >
                        {a.name}
                        {a.tier === "verified" ? (
                          <span
                            className="badge-modeled"
                            title="Carries a hand-verified numeric effect (see Class Features)"
                          >
                            {" "}
                            M
                          </span>
                        ) : a.tier === "extracted" ? (
                          <span
                            className="badge-modeled badge-modeled--extracted"
                            title="Carries a machine-extracted numeric effect, not yet hand-verified (see Class Features for its provenance sentence)"
                          >
                            {" "}
                            M
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

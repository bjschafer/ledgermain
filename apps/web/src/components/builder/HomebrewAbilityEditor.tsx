import { useState } from "react";

import type { HomebrewClassFeature, RefData } from "@pf1/schema";

import { homebrewId, removeHomebrewAbility, upsertHomebrewAbility } from "../../model/homebrew.js";
import {
  ABILITY_TYPE_OPTIONS,
  abilityToDraft,
  buildHomebrewAbility,
  emptyHomebrewAbilityDraft,
  USES_PER_OPTIONS,
  type HomebrewAbilityDraft,
} from "../../model/homebrewEditor.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { ChangeListEditor } from "./ChangeListEditor.js";
import { NumberField } from "./NumberField.js";
import type { BuilderProps } from "./types.js";
import { classByTag } from "@pf1/engine";

/**
 * Create/edit/delete UI for homebrew abilities — GM-granted campaign features
 * and stand-ins for anything the app doesn't model yet, stored as
 * `build.homebrew.classFeatures` (see `model/homebrew.ts`). Sits above
 * `ClassFeaturesList`, whose timeline is where the saved entries show up.
 *
 * Unlike its race/feat/trait siblings this has no add/remove control per
 * entry: an authored ability is a granted one (there's no catalog to pick
 * from), so the list below is management only. That's also the reason to
 * author one here rather than as a homebrew feat — a feat would eat a feat
 * slot and force a matching GM grant to keep the builder's budget honest.
 */
export function HomebrewAbilityEditor({ doc, refData, update }: BuilderProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HomebrewAbilityDraft>(emptyHomebrewAbilityDraft());
  const [error, setError] = useState<string | null>(null);

  const entries = Object.entries(doc.build.homebrew?.classFeatures ?? {});

  function startCreate() {
    setEditingId(null);
    setDraft(emptyHomebrewAbilityDraft());
    setError(null);
    setFormOpen(true);
    setDetailsOpen(true);
  }

  function startEdit(id: string, ability: HomebrewClassFeature) {
    setEditingId(id);
    setDraft(abilityToDraft(ability));
    setError(null);
    setFormOpen(true);
    setDetailsOpen(true);
  }

  function cancel() {
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  }

  function save() {
    const id = editingId ?? homebrewId();
    const result = buildHomebrewAbility(id, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    update((d) => upsertHomebrewAbility(d, id, result.value));
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  }

  function remove(id: string) {
    update((d) => removeHomebrewAbility(d, id));
    if (editingId === id) cancel();
  }

  return (
    <details
      className="hb-editor"
      open={detailsOpen}
      onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
    >
      <summary>Custom abilities{entries.length > 0 ? ` (${entries.length})` : ""}</summary>
      {entries.length > 0 && (
        <div className="hb-list">
          {entries.map(([id, ability]) => (
            <div key={id} className="pick-row is-selected">
              <div className="pmain">
                <div className="pname">
                  {ability.name} <HomebrewBadge id={id} />
                </div>
                <div className="preq">
                  <span className="soft">
                    Lv {ability.level}
                    {ability.uses?.maxFormula
                      ? ` · ${ability.uses.maxFormula}/${ability.uses.per ?? "day"}`
                      : ""}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" className="btn-ghost" onClick={() => startEdit(id, ability)}>
                  Edit
                </button>
                <button type="button" className="btn-ghost" onClick={() => remove(id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <AbilityDraftForm
          draft={draft}
          setDraft={setDraft}
          doc={doc}
          refData={refData}
          isNew={editingId == null}
          error={error}
          onSave={save}
          onCancel={cancel}
        />
      ) : (
        <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={startCreate}>
          + Create custom ability
        </button>
      )}
    </details>
  );
}

function AbilityDraftForm({
  draft,
  setDraft,
  doc,
  refData,
  isNew,
  error,
  onSave,
  onCancel,
}: {
  draft: HomebrewAbilityDraft;
  setDraft: (d: HomebrewAbilityDraft) => void;
  doc: BuilderProps["doc"];
  refData: RefData;
  isNew: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  function patch(p: Partial<HomebrewAbilityDraft>) {
    setDraft({ ...draft, ...p });
  }

  // Only the character's own classes are offerable: attributing an ability to
  // a class they don't have would put it in a timeline group for a class the
  // sheet knows nothing about.
  const classOptions = doc.identity.classes.map((c) => ({
    tag: c.tag,
    name: classByTag(refData, c.tag)?.name ?? c.tag,
  }));

  return (
    <div className="hb-form">
      <div className="hb-field">
        <label htmlFor="hb-ability-name">Name</label>
        <input
          id="hb-ability-name"
          type="text"
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Mark of the Storm Herald"
        />
      </div>

      <div className="hb-field">
        <label htmlFor="hb-ability-desc">Description</label>
        <textarea
          id="hb-ability-desc"
          rows={4}
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What the ability does…"
        />
      </div>

      <div className="hb-row">
        <div className="hb-field">
          <span className="hb-field-label">Gained at level</span>
          <div className="hb-inline-controls">
            <NumberField
              className="num"
              size={3}
              min={1}
              max={20}
              value={draft.level}
              onCommit={(n) => patch({ level: n })}
              aria-label="Level gained"
            />
          </div>
        </div>

        <div className="hb-field">
          <label htmlFor="hb-ability-type">Ability type</label>
          <select
            id="hb-ability-type"
            value={draft.abilityType}
            onChange={(e) => patch({ abilityType: e.target.value })}
          >
            {ABILITY_TYPE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hb-field">
        <label htmlFor="hb-ability-class">Granted by</label>
        <select
          id="hb-ability-class"
          value={draft.classTag}
          onChange={(e) => patch({ classTag: e.target.value })}
        >
          <option value="">No class (campaign reward, item, story)</option>
          {classOptions.map((c) => (
            <option key={c.tag} value={c.tag}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Limited uses (optional)</span>
        <div className="hb-inline-controls">
          <NumberField
            className="num"
            size={3}
            min={0}
            value={draft.usesMax}
            onCommit={(n) => patch({ usesMax: n })}
            aria-label="Uses"
          />
          <select
            value={draft.usesPer}
            aria-label="Recharge period"
            onChange={(e) => patch({ usesPer: e.target.value })}
          >
            {USES_PER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <span className="hb-field-label">
          Leave at 0 for an ability that is always on. Anything higher becomes a tracked pool in the
          Play tab.
        </span>
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Typed bonuses (optional)</span>
        <ChangeListEditor drafts={draft.changes} onChange={(next) => patch({ changes: next })} />
      </div>

      {error ? <div className="hb-error">{error}</div> : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="pick-btn add" onClick={onSave}>
          {isNew ? "Create ability" : "Save changes"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

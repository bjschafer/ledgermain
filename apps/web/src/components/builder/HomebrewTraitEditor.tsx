import { useState } from "react";

import type { TraitDef } from "@pf1/schema";

import { emptyChangeDraft } from "../../model/changeEditor.js";
import { homebrewId, removeHomebrewTrait, upsertHomebrewTrait } from "../../model/homebrew.js";
import {
  buildHomebrewTrait,
  emptyHomebrewTraitDraft,
  traitToDraft,
  type HomebrewTraitDraft,
} from "../../model/homebrewEditor.js";
import { TRAIT_CATEGORIES, toggleTrait } from "../../model/traits.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { ChangeListEditor } from "./ChangeListEditor.js";
import type { BuilderProps } from "./types.js";

/**
 * Create/edit/delete UI for homebrew traits (issue #87), rendered inline in
 * `TraitsSection`. Like `HomebrewFeatEditor`, a homebrew trait appears in the
 * normal trait picker the moment it's upserted (`TraitsSection` resolves
 * ids through `model/traits.ts`'s `resolveTrait`/`allTraitIds`) — this
 * section only owns authoring + management, not a second pick/remove
 * control (`toggleTrait` on "select on create" reuses the exact transition
 * the main picker uses).
 */
export function HomebrewTraitEditor({ doc, update }: BuilderProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HomebrewTraitDraft>(emptyHomebrewTraitDraft());
  const [selectOnCreate, setSelectOnCreate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const entries = Object.entries(doc.build.homebrew?.traits ?? {});

  function startCreate() {
    setEditingId(null);
    setDraft(emptyHomebrewTraitDraft());
    setError(null);
    setFormOpen(true);
    setDetailsOpen(true);
  }

  function startEdit(id: string, trait: TraitDef) {
    setEditingId(id);
    setDraft(traitToDraft(trait));
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
    const result = buildHomebrewTrait(id, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const wasCreate = editingId == null;
    update((d) => {
      let next = upsertHomebrewTrait(d, id, result.value);
      if (wasCreate && selectOnCreate && !(next.build.traits ?? []).includes(id)) {
        next = toggleTrait(next, id);
      }
      return next;
    });
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  }

  function remove(id: string) {
    update((d) => removeHomebrewTrait(d, id));
    if (editingId === id) cancel();
  }

  return (
    <details
      className="hb-editor"
      open={detailsOpen}
      onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
    >
      <summary>Homebrew traits{entries.length > 0 ? ` (${entries.length})` : ""}</summary>
      {entries.length > 0 && (
        <div className="hb-list">
          {entries.map(([id, trait]) => {
            const isSel = (doc.build.traits ?? []).includes(id);
            return (
              <div key={id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                <div className="pmain">
                  <div className="pname">
                    {trait.name} <HomebrewBadge id={id} />
                    <span className="tag-bloodline" title={`${trait.category} trait`}>
                      {trait.category}
                    </span>
                  </div>
                  {trait.summary ? (
                    <div className="preq">
                      <span className="soft">{trait.summary}</span>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleTrait(d, id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => startEdit(id, trait)}>
                    Edit
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => remove(id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <TraitDraftForm
          draft={draft}
          setDraft={setDraft}
          isNew={editingId == null}
          selectOnCreate={selectOnCreate}
          setSelectOnCreate={setSelectOnCreate}
          error={error}
          onSave={save}
          onCancel={cancel}
        />
      ) : (
        <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={startCreate}>
          + Create homebrew trait
        </button>
      )}
    </details>
  );
}

function TraitDraftForm({
  draft,
  setDraft,
  isNew,
  selectOnCreate,
  setSelectOnCreate,
  error,
  onSave,
  onCancel,
}: {
  draft: HomebrewTraitDraft;
  setDraft: (d: HomebrewTraitDraft) => void;
  isNew: boolean;
  selectOnCreate: boolean;
  setSelectOnCreate: (v: boolean) => void;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  function patch(p: Partial<HomebrewTraitDraft>) {
    setDraft({ ...draft, ...p });
  }

  return (
    <div className="hb-form">
      <div className="hb-field">
        <label htmlFor="hb-trait-name">Name</label>
        <input
          id="hb-trait-name"
          type="text"
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. River Rat"
        />
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Category</span>
        <div className="chips">
          {TRAIT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className="chip"
              aria-pressed={draft.category === cat}
              onClick={() => patch({ category: cat })}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="hb-field">
        <label htmlFor="hb-trait-summary">Description / benefit</label>
        <textarea
          id="hb-trait-summary"
          rows={3}
          value={draft.summary}
          onChange={(e) => patch({ summary: e.target.value })}
          placeholder="What the trait does…"
        />
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Typed bonuses (optional)</span>
        <ChangeListEditor
          drafts={draft.changes}
          onChange={(next) => patch({ changes: next })}
          newDraft={() => ({ ...emptyChangeDraft(), type: "trait" })}
        />
        <span className="hb-field-label">
          Real PF1 traits grant "trait"-type bonuses, which don't stack with each other — the type
          defaults to "trait" for new rows, but you can change it if this one is meant to behave
          differently.
        </span>
      </div>

      {isNew && (
        <label className="hb-field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={selectOnCreate}
            onChange={(e) => setSelectOnCreate(e.target.checked)}
          />
          Take this trait immediately after creating it
        </label>
      )}

      {error ? <div className="hb-error">{error}</div> : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="pick-btn add" onClick={onSave}>
          {isNew ? "Create trait" : "Save changes"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

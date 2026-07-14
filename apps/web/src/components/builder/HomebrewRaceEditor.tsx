import { useState } from "react";

import { ABILITY_IDS, type AbilityId, type Race, type SkillId } from "@pf1/schema";
import { SKILL_IDS } from "@pf1/engine";

import { setRace } from "../../model/doc.js";
import { homebrewId, upsertHomebrewRace, removeHomebrewRace } from "../../model/homebrew.js";
import {
  buildHomebrewRace,
  emptyHomebrewRaceDraft,
  raceToDraft,
  SIZE_OPTIONS,
  type HomebrewRaceDraft,
} from "../../model/homebrewEditor.js";
import { ABILITY_ABBR, skillName } from "../../model/names.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import type { BuilderProps } from "./types.js";
import { ChangeListEditor } from "./ChangeListEditor.js";
import { NumberField } from "./NumberField.js";

/**
 * Create/edit/delete UI for homebrew races (`model/homebrew.ts`'s doc-embedded
 * storage), rendered inline in `RaceSection`'s picker. Homebrew races appear
 * in the normal rarity-grouped chip list above this the moment they're
 * upserted (the `refData` every builder section receives is already the
 * doc-overlaid view — see `resolveRefData`); this section only owns the
 * authoring form and a manage-existing-entries list, never a second
 * selection UI (that stays the chip grid's job — `selectRace` is the exact
 * same handler RaceSection's chips call, passed down so both share the one
 * "switching race resets modifiers" confirmation flow).
 */
export function HomebrewRaceEditor({
  doc,
  update,
  selectRace,
}: BuilderProps & { selectRace: (id: string) => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HomebrewRaceDraft>(emptyHomebrewRaceDraft());
  const [selectOnCreate, setSelectOnCreate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const entries = Object.entries(doc.build.homebrew?.races ?? {});

  function startCreate() {
    setEditingId(null);
    setDraft(emptyHomebrewRaceDraft());
    setError(null);
    setFormOpen(true);
    setDetailsOpen(true);
  }

  function startEdit(id: string, race: Race) {
    setEditingId(id);
    setDraft(raceToDraft(race));
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
    const result = buildHomebrewRace(id, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const wasCreate = editingId == null;
    update((d) => {
      let next = upsertHomebrewRace(d, id, result.value);
      if (wasCreate && selectOnCreate) next = setRace(next, id);
      return next;
    });
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  }

  function remove(id: string) {
    update((d) => removeHomebrewRace(d, id));
    if (editingId === id) cancel();
  }

  return (
    <details
      className="hb-editor"
      open={detailsOpen}
      onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
    >
      <summary>Homebrew races{entries.length > 0 ? ` (${entries.length})` : ""}</summary>
      {entries.length > 0 && (
        <div className="hb-list">
          {entries.map(([id, race]) => (
            <div key={id} className={`pick-row${doc.identity.race === id ? " is-selected" : ""}`}>
              <div className="pmain">
                <div className="pname">
                  {race.name} <HomebrewBadge id={id} />
                </div>
                <div className="preq">
                  size {race.size} · speed {race.speeds.land ?? 30} ft
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" className="pick-btn" onClick={() => selectRace(id)}>
                  {doc.identity.race === id ? "Selected" : "Select"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => startEdit(id, race)}>
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
        <RaceDraftForm
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
          + Create homebrew race
        </button>
      )}
    </details>
  );
}

function RaceDraftForm({
  draft,
  setDraft,
  isNew,
  selectOnCreate,
  setSelectOnCreate,
  error,
  onSave,
  onCancel,
}: {
  draft: HomebrewRaceDraft;
  setDraft: (d: HomebrewRaceDraft) => void;
  isNew: boolean;
  selectOnCreate: boolean;
  setSelectOnCreate: (v: boolean) => void;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [langInput, setLangInput] = useState("");
  const [subtypeInput, setSubtypeInput] = useState("");

  function patch(p: Partial<HomebrewRaceDraft>) {
    setDraft({ ...draft, ...p });
  }

  return (
    <div className="hb-form">
      <div className="hb-field">
        <label htmlFor="hb-race-name">Name</label>
        <input
          id="hb-race-name"
          type="text"
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Skyborn"
        />
      </div>

      <div className="hb-row">
        <div className="hb-field">
          <label htmlFor="hb-race-size">Size</label>
          <select
            id="hb-race-size"
            value={draft.size}
            onChange={(e) => patch({ size: e.target.value as HomebrewRaceDraft["size"] })}
          >
            {SIZE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hb-field">
          <label htmlFor="hb-race-speed">Land speed (ft)</label>
          <NumberField
            className="num"
            size={4}
            value={draft.landSpeed}
            min={0}
            step={5}
            onCommit={(n) => patch({ landSpeed: n })}
            aria-label="Land speed"
          />
        </div>
        <div className="hb-field">
          <label htmlFor="hb-race-type">Creature type</label>
          <input
            id="hb-race-type"
            type="text"
            value={draft.creatureType}
            onChange={(e) => patch({ creatureType: e.target.value })}
            placeholder="humanoid"
          />
        </div>
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Other speeds (fly/swim/climb/burrow)</span>
        {draft.otherSpeeds.map((s, i) => (
          <div className="hb-row" key={i}>
            <input
              type="text"
              value={s.mode}
              placeholder="mode, e.g. fly"
              style={{ flex: "1 1 100px" }}
              onChange={(e) =>
                patch({
                  otherSpeeds: draft.otherSpeeds.map((row, j) =>
                    j === i ? { ...row, mode: e.target.value } : row,
                  ),
                })
              }
            />
            <NumberField
              className="num"
              size={4}
              value={s.value}
              min={0}
              step={5}
              onCommit={(n) =>
                patch({
                  otherSpeeds: draft.otherSpeeds.map((row, j) =>
                    j === i ? { ...row, value: n } : row,
                  ),
                })
              }
              aria-label={`${s.mode || "speed"} value`}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => patch({ otherSpeeds: draft.otherSpeeds.filter((_, j) => j !== i) })}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => patch({ otherSpeeds: [...draft.otherSpeeds, { mode: "fly", value: 30 }] })}
        >
          + Add speed
        </button>
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Languages</span>
        <div className="chips">
          {draft.languages.map((lang, i) => (
            <button
              key={`${lang}-${i}`}
              type="button"
              className="chip"
              aria-pressed="true"
              title="Click to remove"
              onClick={() => patch({ languages: draft.languages.filter((_, j) => j !== i) })}
            >
              {lang} ×
            </button>
          ))}
        </div>
        <div className="lang-add-row">
          <input
            type="text"
            placeholder="Add a language…"
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && langInput.trim()) {
                e.preventDefault();
                patch({ languages: [...draft.languages, langInput.trim()] });
                setLangInput("");
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            disabled={!langInput.trim()}
            onClick={() => {
              patch({ languages: [...draft.languages, langInput.trim()] });
              setLangInput("");
            }}
          >
            + Add
          </button>
        </div>
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Creature subtypes</span>
        <div className="chips">
          {draft.creatureSubtypes.map((sub, i) => (
            <button
              key={`${sub}-${i}`}
              type="button"
              className="chip"
              aria-pressed="true"
              title="Click to remove"
              onClick={() =>
                patch({ creatureSubtypes: draft.creatureSubtypes.filter((_, j) => j !== i) })
              }
            >
              {sub} ×
            </button>
          ))}
        </div>
        <div className="lang-add-row">
          <input
            type="text"
            placeholder="Add a subtype…"
            value={subtypeInput}
            onChange={(e) => setSubtypeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && subtypeInput.trim()) {
                e.preventDefault();
                patch({ creatureSubtypes: [...draft.creatureSubtypes, subtypeInput.trim()] });
                setSubtypeInput("");
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            disabled={!subtypeInput.trim()}
            onClick={() => {
              patch({ creatureSubtypes: [...draft.creatureSubtypes, subtypeInput.trim()] });
              setSubtypeInput("");
            }}
          >
            + Add
          </button>
        </div>
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Always-class skills (optional)</span>
        <div className="chips">
          {SKILL_IDS.map((id) => {
            const on = draft.classSkills.includes(id as SkillId);
            return (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={on}
                onClick={() =>
                  patch({
                    classSkills: on
                      ? draft.classSkills.filter((s) => s !== id)
                      : [...draft.classSkills, id as SkillId],
                  })
                }
              >
                {skillName(id as SkillId)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Ability score modifiers</span>
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={draft.abilityMode === "flexible"}
            onClick={() => patch({ abilityMode: "flexible" })}
          >
            Flexible +2 (player chooses, like Human)
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={draft.abilityMode === "fixed"}
            onClick={() => patch({ abilityMode: "fixed" })}
          >
            Fixed modifiers
          </button>
        </div>
        {draft.abilityMode === "fixed" && (
          <div className="hb-row" style={{ marginTop: 6 }}>
            {ABILITY_IDS.map((a: AbilityId) => (
              <label key={a} className="hb-field" style={{ flex: "0 0 auto" }}>
                <span className="hb-field-label">{ABILITY_ABBR[a]}</span>
                <NumberField
                  className="num"
                  size={3}
                  value={draft.abilityMods[a] ?? 0}
                  onCommit={(n) => patch({ abilityMods: { ...draft.abilityMods, [a]: n } })}
                  aria-label={`${ABILITY_ABBR[a]} modifier`}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Additional typed bonuses (optional)</span>
        <ChangeListEditor
          drafts={draft.extraChanges}
          onChange={(next) => patch({ extraChanges: next })}
        />
      </div>

      {isNew && (
        <label className="hb-field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={selectOnCreate}
            onChange={(e) => setSelectOnCreate(e.target.checked)}
          />
          Select this race immediately after creating it
        </label>
      )}

      {error ? <div className="hb-error">{error}</div> : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="pick-btn add" onClick={onSave}>
          {isNew ? "Create race" : "Save changes"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

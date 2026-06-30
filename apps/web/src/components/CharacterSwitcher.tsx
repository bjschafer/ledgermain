/**
 * Masthead control for switching between saved characters on this device, or
 * starting a new one. "Active" is whichever character was most recently
 * touched (see db/characters.ts) — this is just a thin view over that list.
 */
import type { CharacterSummary } from "../db/characters.js";

const NEW_CHARACTER = "__new__";

export function CharacterSwitcher({
  characters,
  activeId,
  onSwitch,
  onCreate,
}: {
  characters: CharacterSummary[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <select
      className="char-switcher"
      aria-label="Switch character"
      value={activeId}
      onChange={(e) => {
        if (e.target.value === NEW_CHARACTER) onCreate();
        else onSwitch(e.target.value);
      }}
    >
      {characters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name || "Unnamed"}
        </option>
      ))}
      <option value={NEW_CHARACTER}>+ New character…</option>
    </select>
  );
}

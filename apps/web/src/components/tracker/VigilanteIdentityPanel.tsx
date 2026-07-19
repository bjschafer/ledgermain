import { currentVigilanteIdentity, setVigilanteIdentity } from "../../model/vigilanteIdentity.js";
import { Panel } from "../builder/Panel.js";
import { MaskIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Vigilante dual-identity chip (issue #65) — display-forward only, per
 * `live.vigilanteIdentity`'s doc comment: no numeric consequences are wired
 * to this toggle. Several vigilante talents (Renown, Social Grace, Loyal
 * Aid, ...) carry identity-scoped bonuses; their `contextNotes` (see
 * `@pf1/engine` `vigilante-talents.ts`) remind the player to apply them by
 * hand while in the matching identity, rather than promising enforcement
 * this project doesn't have a modeled "which identity is active right now"
 * hook for anywhere else in the sheet.
 */
export function VigilanteIdentityPanel({ doc, update }: BuilderProps) {
  const isVigilante = doc.identity.classes.some((c) => c.tag === "vigilante");
  if (!isVigilante) return null;

  const identity = currentVigilanteIdentity(doc);

  return (
    <Panel title="Identity" icon={<MaskIcon />} storageKey="panel:Vigilante Identity">
      <div className="chips">
        <button
          type="button"
          className={`chip${identity === "social" ? " is-selected" : ""}`}
          aria-pressed={identity === "social"}
          onClick={() => update((d) => setVigilanteIdentity(d, "social"))}
        >
          Social
        </button>
        <button
          type="button"
          className={`chip${identity === "vigilante" ? " is-selected" : ""}`}
          aria-pressed={identity === "vigilante"}
          onClick={() => update((d) => setVigilanteIdentity(d, "vigilante"))}
        >
          Vigilante
        </button>
      </div>
      <p className="hint">
        Reminder only — renown/Intimidate bonuses and other identity-scoped talent effects (see
        their notes in Vigilante Talents) aren't auto-applied; add them by hand while in the
        matching identity.
      </p>
    </Panel>
  );
}

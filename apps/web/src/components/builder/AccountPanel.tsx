import { useState } from "react";

import { DEVICE_NAME_MAX, defaultDeviceName, useCustomDeviceName } from "../../state/deviceName.js";
import { showToast } from "../../state/toast.js";
import { fetchAccountExport, logoutEverywhere, purgeAccount } from "../../sync/client.js";
import { apiBaseUrl } from "../../sync/config.js";
import { getStoredToken } from "../../sync/session.js";
import { GearIcon } from "../icons.js";

import { ConfirmAction } from "./ConfirmAction.js";
import { Panel } from "./Panel.js";

/**
 * The two account-wide panels: what the server holds for you, and how to make
 * it stop holding it. Both render nothing when sync is off (no `VITE_API_URL`)
 * or nobody is signed in -- there is no account to act on in either case, and
 * the local-only default experience should not sprout a section it can't use.
 *
 * They read the API base and token themselves rather than taking them as
 * props: `useCharacter.ts` does the same, and threading a live credential
 * through the settings tree would hand it to five components with no use for
 * it.
 */

/** Shared plumbing: run one account call, report the outcome, never throw. */
function useAccountAction(): {
  busy: boolean;
  run: (work: (apiBase: string, token: string) => Promise<string>) => void;
} {
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: (work) => {
      const apiBase = apiBaseUrl();
      const token = getStoredToken();
      if (!apiBase || !token) return;
      setBusy(true);
      void work(apiBase, token)
        .then((message) => showToast({ message }))
        .catch(() => showToast({ message: "Couldn't reach the server. Please try again." }))
        .finally(() => setBusy(false));
    },
  };
}

function signedIn(): boolean {
  return Boolean(apiBaseUrl() && getStoredToken());
}

/**
 * What this device is called when its edits clash with another device's.
 * Committed on blur, not per keystroke, so a half-typed name never gets
 * stamped onto a save.
 */
function DeviceNameField() {
  const [name, setName] = useCustomDeviceName();
  const [draft, setDraft] = useState(name);
  return (
    <>
      <label className="field" style={{ marginBottom: 16 }}>
        <span>This device's name</span>
        <input
          type="text"
          value={draft}
          maxLength={DEVICE_NAME_MAX}
          placeholder={defaultDeviceName()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setName(draft);
            setDraft(draft.trim());
          }}
        />
      </label>
      <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>
        Shown when this device and another both changed a character, so you can tell the two copies
        apart. Leave it blank to use the browser's name. Never included in a shared sheet.
      </p>
    </>
  );
}

/** Take everything out, or sign every device out. */
export function AccountPanel({ onSignedOut }: { onSignedOut: () => void }) {
  const { busy, run } = useAccountAction();
  if (!signedIn()) return null;

  return (
    <Panel resizable={false} title="Your account" icon={<GearIcon />}>
      <p className="hint" style={{ marginBottom: 12 }}>
        Characters you sync are kept on the server so your other devices can see them. These cover
        the whole account, not just the character you have open.
      </p>

      <DeviceNameField />

      <div className="settings-row">
        <button
          type="button"
          className="btn-ghost"
          disabled={busy}
          onClick={() =>
            run(async (apiBase, token) => {
              const blob = await fetchAccountExport(apiBase, token);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "ledgermain-account.json";
              a.click();
              URL.revokeObjectURL(url);
              return "Downloaded every character on this account";
            })
          }
        >
          Download every character (.json)
        </button>
      </div>

      <p className="hint" style={{ marginTop: 16, marginBottom: 12 }}>
        Signing out everywhere ends every signed-in session, this one included. Use it if you left
        yourself signed in somewhere you no longer have.
      </p>
      <div className="settings-row">
        <button
          type="button"
          className="btn-ghost"
          disabled={busy}
          onClick={() =>
            run(async (apiBase, token) => {
              await logoutEverywhere(apiBase, token);
              onSignedOut();
              return "Signed out on every device";
            })
          }
        >
          Sign out everywhere
        </button>
      </div>
    </Panel>
  );
}

/** Erase the account's whole server-side footprint. Lives in the Danger Zone. */
export function AccountErasePanel({ onSignedOut }: { onSignedOut: () => void }) {
  const { busy, run } = useAccountAction();
  if (!signedIn()) return null;

  return (
    <Panel resizable={false} title="Erase server data" icon={<GearIcon />}>
      <ConfirmAction
        description="Removes every character and session this account has on the server, and signs you out. Characters saved on this device stay where they are, but the server's copies are gone: download them first if you want them. This cannot be undone."
        confirmWord="ERASE"
        buttonLabel="Erase my server data"
        disabled={busy}
        onConfirm={() =>
          run(async (apiBase, token) => {
            await purgeAccount(apiBase, token);
            // The purge revoked this session on its way out, so the stored
            // token is already dead. Clearing it is what stops the app
            // spending the next few minutes retrying pushes against a 401.
            onSignedOut();
            return "Erased everything stored on the server";
          })
        }
      />
    </Panel>
  );
}

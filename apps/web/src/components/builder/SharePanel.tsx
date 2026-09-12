import { useCallback, useEffect, useState } from "react";

import type { CharacterDoc } from "@pf1/schema";

import { db, listCharacters } from "../../db/characters.js";
import { absoluteLink } from "../../model/appLocation.js";
import { SHARE_KIND_LABEL, shareHash, shareReadiness } from "../../model/shareLink.js";
import { showToast } from "../../state/toast.js";
import {
  createShare,
  listRemoteCharacters,
  listShares,
  pushCharacter,
  revokeShare,
  type ShareKind,
  type ShareSummary,
} from "../../sync/client.js";
import { apiBaseUrl } from "../../sync/config.js";
import { getStoredToken } from "../../sync/session.js";
import { writeClipboard } from "../CopyButton.js";
import { GearIcon } from "../icons.js";

import { Panel } from "./Panel.js";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function linkFor(share: ShareSummary): string {
  return absoluteLink(window.location.href, shareHash(share.token));
}

/**
 * Make sure the server holds this device's latest save of `characterId`, so a
 * share reads the sheet the player is looking at. Pushes the saved document,
 * exactly as an open-sync pass would, rather than the in-memory one: pushing a
 * version Dexie never recorded would put this device out of step with itself.
 */
async function ensureSynced(apiBase: string, token: string, characterId: string): Promise<void> {
  const [local, listing] = await Promise.all([
    db.characters.get(characterId),
    listRemoteCharacters(apiBase, token),
  ]);
  if (!local) throw new Error("Save this character before sharing it.");
  const remote = listing.characters.find((c) => c.id === characterId);
  const readiness = shareReadiness(local.version, remote?.version);
  if (readiness === "ready") return;
  if (readiness === "push" && (await pushCharacter(apiBase, token, local)).kind === "ok") return;
  throw new Error("This character has newer changes on another device. Sync it, then share.");
}

/**
 * Publish, list, and revoke read-only share links. Renders nothing when sync
 * isn't configured, and a sign-in hint when nobody is signed in: a share is
 * served from the synced copy, so there is nothing to share without one.
 */
export function SharePanel({ doc }: { doc: CharacterDoc }) {
  const apiBase = apiBaseUrl();
  const token = getStoredToken();
  const [shares, setShares] = useState<ShareSummary[] | null>(null);
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!apiBase || !token) return;
    try {
      const [remote, local] = await Promise.all([listShares(apiBase, token), listCharacters()]);
      setShares(remote);
      setNames(new Map(local.map((c) => [c.id, c.name])));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, [apiBase, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!apiBase) return null;

  const title = "Share";
  if (!token) {
    return (
      <Panel title={title} step="⚙" icon={<GearIcon />}>
        <p className="hint">
          Sign in to sync, and you can hand your GM a read-only link to this character.
        </p>
      </Panel>
    );
  }

  const publish = (kind: ShareKind) => {
    setBusy(true);
    void (async () => {
      try {
        await ensureSynced(apiBase, token, doc.id);
        const share = await createShare(apiBase, token, doc.id, kind);
        setShares((prev) => [share, ...(prev ?? [])]);
        setNames((prev) => new Map(prev).set(doc.id, doc.identity.name));
        const copied = await writeClipboard(linkFor(share));
        showToast({
          message: copied
            ? `${SHARE_KIND_LABEL[kind]} link copied`
            : `${SHARE_KIND_LABEL[kind]} link created. Copy it from the list below.`,
        });
      } catch (e) {
        showToast({
          message: e instanceof Error && !("status" in e) ? e.message : "Couldn't create the link.",
        });
      } finally {
        setBusy(false);
      }
    })();
  };

  const revoke = (share: ShareSummary) => {
    setBusy(true);
    void revokeShare(apiBase, token, share.token)
      .then(() => {
        setShares((prev) => (prev ?? []).filter((s) => s.token !== share.token));
        showToast({ message: "Link stopped working" });
      })
      .catch(() => showToast({ message: "Couldn't reach the server. Please try again." }))
      .finally(() => setBusy(false));
  };

  const copy = (share: ShareSummary) => {
    void writeClipboard(linkFor(share)).then((ok) =>
      showToast({ message: ok ? "Link copied" : "Couldn't copy the link" }),
    );
  };

  return (
    <Panel title={title} step="⚙" icon={<GearIcon />}>
      <p className="hint" style={{ marginBottom: 12 }}>
        A share link shows this character's sheet to anyone who opens it, with no sign-in and no way
        to change anything. A snapshot shows the sheet as it is right now. A live link follows along
        as you play, until you stop sharing it. Either one shows your portrait and notes too, so
        give it only to people you would hand your sheet.
      </p>
      <div className="settings-row">
        <button
          type="button"
          className="btn-ghost"
          disabled={busy}
          onClick={() => publish("snapshot")}
        >
          Share a snapshot
        </button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => publish("live")}>
          Share live
        </button>
      </div>

      {loadFailed && (
        <p className="hint" style={{ marginTop: 12 }}>
          Couldn't load your links.{" "}
          <button type="button" className="btn-ghost" onClick={() => void refresh()}>
            Try again
          </button>
        </p>
      )}
      {shares && shares.length > 0 && (
        <ul className="share-list">
          {shares.map((share) => (
            <li key={share.token} className="share-row">
              <div className="share-row-text">
                <span className="share-row-name">
                  {names.get(share.characterId) || "A character not on this device"}
                </span>
                <span className="hint">
                  {SHARE_KIND_LABEL[share.kind]}, shared{" "}
                  {dateFormat.format(new Date(share.createdAt))}
                </span>
              </div>
              <div className="settings-row">
                <button type="button" className="btn-ghost" onClick={() => copy(share)}>
                  Copy link
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => revoke(share)}
                >
                  Stop sharing
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

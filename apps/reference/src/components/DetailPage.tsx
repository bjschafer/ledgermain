import type { ConditionDef } from "@pf1/engine";
import type { ArmorRef, Feat, Item, Spell, WeaponRef } from "@pf1/schema";
import { useEffect, useMemo, useState } from "react";

import { loadEntry, type AnyEntry } from "../data/loader.js";
import { COLLECTION_BADGE, type CollectionId } from "../shared/collections.js";
import type { RefIndex } from "../shared/indexCodec.js";
import { conditionNames, ConditionView } from "./ConditionView.js";
import { FeatView } from "./FeatView.js";
import { ArmorView, ItemView, WeaponView } from "./GearView.js";
import { SpellView } from "./SpellView.js";

type State =
  | { status: "loading" }
  | { status: "missing"; route: string }
  | { status: "error"; route: string; message: string }
  | { status: "ready"; route: string; entry: AnyEntry };

export function DetailPage({
  index,
  collection,
  id,
}: {
  index: RefIndex;
  collection: CollectionId;
  id: string;
}) {
  const route = `${collection}/${id}`;
  const [loaded, setLoaded] = useState<State>({ status: "loading" });
  const names = useMemo(() => conditionNames(index.entries), [index]);

  useEffect(() => {
    let live = true;
    setLoaded({ status: "loading" });
    loadEntry(index, collection, id).then(
      (entry) => {
        if (!live) return;
        setLoaded(entry ? { status: "ready", route, entry } : { status: "missing", route });
      },
      (err: unknown) => {
        if (!live) return;
        setLoaded({
          status: "error",
          route,
          message: err instanceof Error ? err.message : String(err),
        });
      },
    );
    return () => {
      live = false;
    };
  }, [index, collection, id, route]);

  // Effects run after render, so a hash change hands us the NEXT route's
  // collection while state still holds the PREVIOUS route's entry — long enough
  // to render a condition through the feat view and throw. Anything not stamped
  // with the current route is still loading, whatever it says.
  const state: State =
    loaded.status !== "loading" && loaded.route !== route ? { status: "loading" } : loaded;

  if (state.status === "loading") return <p className="notice">Loading…</p>;
  if (state.status === "missing") {
    return (
      <p className="notice is-error">
        No {COLLECTION_BADGE[collection].toLowerCase()} with id <code>{id}</code>.{" "}
        <a href="#/">Back to search</a>
      </p>
    );
  }
  if (state.status === "error") {
    return <p className="notice is-error">Could not load that entry: {state.message}</p>;
  }

  return (
    <article className="detail">
      <a className="back-link" href="#/">
        ← Search
      </a>
      <h1 className="detail-title">
        {state.entry.name}
        <span className={`badge is-${collection}`}>{COLLECTION_BADGE[collection]}</span>
      </h1>
      <DetailBody
        collection={collection}
        entry={state.entry}
        ladders={index.ladders}
        names={names}
      />
    </article>
  );
}

/**
 * The shard is plain JSON, so the collection in the route — not anything on the
 * value — is what says which shape came back. Each branch asserts the shape the
 * generator wrote into that collection's shards.
 */
function DetailBody({
  collection,
  entry,
  ladders,
  names,
}: {
  collection: CollectionId;
  entry: AnyEntry;
  ladders: string[][];
  names: Map<string, string>;
}) {
  switch (collection) {
    case "spells":
      return <SpellView spell={entry as Spell} />;
    case "feats":
      return <FeatView feat={entry as Feat} />;
    case "weapons":
      return <WeaponView weapon={entry as WeaponRef} />;
    case "armors":
      return <ArmorView armor={entry as ArmorRef} />;
    case "items":
      return <ItemView item={entry as Item} />;
    case "conditions":
      return <ConditionView condition={entry as ConditionDef} ladders={ladders} names={names} />;
  }
}

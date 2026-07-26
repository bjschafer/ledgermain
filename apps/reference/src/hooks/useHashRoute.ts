/**
 * Hash routing, hand-rolled. Two routes and no history state to keep, so a
 * router library would be more bytes than the whole feature.
 */

import { useEffect, useState } from "react";

import { isCollectionId, type CollectionId } from "../shared/collections.js";

export type Route = { kind: "search" } | { kind: "detail"; collection: CollectionId; id: string };

const SEARCH: Route = { kind: "search" };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  if (!path) return SEARCH;
  const [collection, id] = path.split("/");
  if (collection && id && isCollectionId(collection)) {
    return { kind: "detail", collection, id: decodeURIComponent(id) };
  }
  return SEARCH;
}

export function detailHref(collection: CollectionId, id: string): string {
  return `#/${collection}/${encodeURIComponent(id)}`;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

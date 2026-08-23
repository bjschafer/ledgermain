/**
 * Hash routing, hand-rolled. Three routes and no history state to keep, so a
 * router library would be more bytes than the whole feature.
 *
 * The summon route is a stable deep-link contract for external callers (the
 * character sheet will eventually link a cast of Summon Monster straight into a
 * preselected view): `#/summon/<sm|sna>/<1-9>?feats=a,b&template=t&creature=id&evo=x,y`.
 * Every piece of helper state lives in the URL, unknown query params and
 * unknown slugs are ignored, and existing param names never change meaning —
 * additions only.
 */

import { useEffect, useRef, useState } from "react";

import { isCollectionId, type CollectionId } from "../shared/collections.js";

export interface SummonRouteParams {
  /** Feat slugs, comma-separated in the URL ("augment-summoning"). Unknown slugs ignored. */
  feats: string[];
  /** Template key applied to the summoned creature ("celestial"). */
  template?: string;
  /** Selected creature: a monsters.json id. */
  creature?: string;
  /** Caster level, for the duration line (1 round/level). */
  cl?: number;
  /** Evolved Summoned Monster picks: 1-point evolution slugs, comma-separated in the URL. Unknown slugs ignored. */
  evo: string[];
}

export type Route =
  | { kind: "search" }
  | { kind: "detail"; collection: CollectionId; id: string }
  | { kind: "summon"; spell?: "sm" | "sna"; level?: number; params: SummonRouteParams };

const SEARCH: Route = { kind: "search" };

function parseSummonParams(query: string): SummonRouteParams {
  const search = new URLSearchParams(query);
  const feats = (search.get("feats") ?? "").split(",").filter(Boolean);
  const template = search.get("template") ?? undefined;
  const creature = search.get("creature") ?? undefined;
  const clRaw = Number.parseInt(search.get("cl") ?? "", 10);
  const cl = Number.isInteger(clRaw) && clRaw >= 1 && clRaw <= 40 ? clRaw : undefined;
  const evo = (search.get("evo") ?? "").split(",").filter(Boolean);
  return { feats, template, creature, cl, evo };
}

export function parseHash(hash: string): Route {
  const stripped = hash.replace(/^#\/?/, "");
  const queryAt = stripped.indexOf("?");
  const path = queryAt === -1 ? stripped : stripped.slice(0, queryAt);
  const query = queryAt === -1 ? "" : stripped.slice(queryAt + 1);
  if (!path) return SEARCH;
  const [head, second, third] = path.split("/");
  if (head === "summon") {
    const spell = second === "sm" || second === "sna" ? second : undefined;
    const level = third ? Number.parseInt(third, 10) : undefined;
    return {
      kind: "summon",
      spell,
      level:
        level !== undefined && Number.isInteger(level) && level >= 1 && level <= 9
          ? level
          : undefined,
      params: parseSummonParams(query),
    };
  }
  if (head && second && isCollectionId(head)) {
    return { kind: "detail", collection: head, id: decodeURIComponent(second) };
  }
  return SEARCH;
}

export function detailHref(collection: CollectionId, id: string): string {
  return `#/${collection}/${encodeURIComponent(id)}`;
}

export function summonHref(
  spell?: "sm" | "sna",
  level?: number,
  params?: Partial<SummonRouteParams>,
): string {
  let path = "#/summon";
  if (spell) path += `/${spell}`;
  if (spell && level) path += `/${level}`;
  const search = new URLSearchParams();
  if (params?.feats?.length) search.set("feats", params.feats.join(","));
  if (params?.template) search.set("template", params.template);
  if (params?.creature) search.set("creature", params.creature);
  if (params?.cl) search.set("cl", String(params.cl));
  if (params?.evo?.length) search.set("evo", params.evo.join(","));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const lastPath = useRef(window.location.hash.split("?")[0]);

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      // Query-only changes (a feat toggle rewriting the summon URL) keep the
      // scroll position; only a path change is a navigation.
      const path = window.location.hash.split("?")[0];
      if (path !== lastPath.current) window.scrollTo(0, 0);
      lastPath.current = path;
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

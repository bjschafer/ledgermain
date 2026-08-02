import type { SorcererBloodline, SorcererBloodlineMutation } from "@pf1/schema";

import {
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefFromLine,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/**
 * See `pfDataCatalogEntries`'s doc comment — the dataset's "not found"
 * sentinel. The one `kobold` -> `kobold_sorcerer` redirect is already
 * dropped generically (has no `description` of its own).
 */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * Matches a "Wildblooded Mutation" sub-heading (a `::h3[...]` directive, see
 * `util/pfdata.ts`) and captures the mutation's own name, stripped of the
 * "(Wildblooded Mutation)" suffix — e.g. `Sage` out of
 * `::h3[Sage (Wildblooded Mutation)]{jl}`. A parent bloodline's OTHER `::h3[]`
 * section (Draconic's "Expanded Bloodlines" dragon-type table) doesn't match
 * this and stays inline, rendered as bold text same as before.
 */
const MUTATION_HEADING_RE = /^::h3\[(.+?)\s*\(Wildblooded Mutation\)\](?:\{[^}]*\})?$/;
const ANY_H3_RE = /^::h3\[/;

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface RawMutationSection {
  name: string;
  lines: string[];
}

/**
 * Split a bloodline entry's body lines into the parent's own prose (with
 * every "(Wildblooded Mutation)" section removed) and the raw line group for
 * each mutation found. A mutation section runs until the next `::h3[]`
 * heading of ANY kind (mutation or not) or the end of the entry.
 */
function splitWildbloodedMutations(lines: string[]): {
  baseLines: string[];
  mutations: RawMutationSection[];
} {
  const baseLines: string[] = [];
  const mutations: RawMutationSection[] = [];
  let current: RawMutationSection | undefined;
  for (const line of lines) {
    const heading = MUTATION_HEADING_RE.exec(line.trim());
    if (heading) {
      current = { name: heading[1]!.trim(), lines: [] };
      mutations.push(current);
      continue;
    }
    if (current && ANY_H3_RE.test(line.trim())) current = undefined;
    if (current) current.lines.push(line);
    else baseLines.push(line);
  }
  return { baseLines, mutations };
}

/**
 * Maps one `json/class_ability_sorcerer_bloodlines.json` dictionary entry to
 * a `SorcererBloodline` plus the `SorcererBloodlineMutation`s nested under it
 * (see that type's doc comment for why these are promoted rather than left
 * inline — same source, same directive shape as a mystery's inline "###
 * Revelations" section, but a mutation is independently PICKABLE, which
 * inline prose isn't).
 */
function transformSorcererBloodlineEntry(
  id: string,
  entry: PfDataEntry,
): { bloodline: SorcererBloodline; mutations: SorcererBloodlineMutation[] } {
  const { baseLines, mutations } = splitWildbloodedMutations(pfDataBodyLines(entry.description!));
  const bloodline: SorcererBloodline = {
    id,
    uuid: `pfdata:sorcerer-bloodline:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(baseLines),
    sources: pfDataSourceRefs(entry),
  };
  const mutationEntries: SorcererBloodlineMutation[] = mutations.map((m) => {
    const mutId = `${slug(id)}-${slug(m.name)}`;
    const sourceLine = m.lines.find((l) => pfDataSourceRefFromLine(l));
    const sources = sourceLine ? [pfDataSourceRefFromLine(sourceLine)!] : undefined;
    return {
      id: mutId,
      uuid: `pfdata:sorcerer-bloodline-mutation:${mutId}`,
      name: m.name,
      parentBloodlineId: id,
      description: pfDataDescriptionToHtml(m.lines),
      ...(sources ? { sources } : {}),
    };
  });
  return { bloodline, mutations: mutationEntries };
}

/**
 * Transform the full sorcerer-bloodline dictionary into the vendored
 * `SorcererBloodline[]` catalog plus every `SorcererBloodlineMutation` nested
 * under one of its entries.
 */
export function transformSorcererBloodlines(dict: PfDataDictionary): {
  bloodlines: SorcererBloodline[];
  mutations: SorcererBloodlineMutation[];
} {
  const bloodlines: SorcererBloodline[] = [];
  const mutations: SorcererBloodlineMutation[] = [];
  for (const [id, entry] of pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS })) {
    const transformed = transformSorcererBloodlineEntry(id, entry);
    bloodlines.push(transformed.bloodline);
    mutations.push(...transformed.mutations);
  }
  return { bloodlines, mutations };
}

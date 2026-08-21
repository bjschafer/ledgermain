import { join } from "node:path";

import type { MonsterTemplate } from "@pf1/schema";

import {
  inlineToPlainText,
  parseDirectiveProps,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  readPfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

const SKIP_KEYS = new Set(["not_found"]);

/**
 * `::th[Name]{cr="+1" source="Book/page" acquired simple summonable}` — a
 * monster template's header. The body after it is ordinary prose (rules text
 * plus markdown tables), rendered whole; the header's own line must be
 * excluded from that render or it would print as literal directive text.
 */
const TH_RE = /^::th\[[^\]]*\]\{(.*)\}\s*$/;

function transformTemplate(id: string, entry: PfDataEntry): MonsterTemplate {
  const lines = entry.description ?? [];
  let cr = "";
  const flags: Pick<
    MonsterTemplate,
    "acquired" | "simple" | "inherited" | "summonable" | "maybeSummonable"
  > = {};
  const bodyLines = lines
    .filter((line) => {
      const m = TH_RE.exec(line.trim());
      if (!m) return true;
      const props = parseDirectiveProps(m[1]!);
      if (typeof props.cr === "string") cr = inlineToPlainText(props.cr).trim();
      if (props.acquired === true) flags.acquired = true;
      if (props.simple === true) flags.simple = true;
      if (props.inherited === true) flags.inherited = true;
      if (props.summonable === true) flags.summonable = true;
      if (props.maybesummon === true) flags.maybeSummonable = true;
      return false;
    })
    // `::sh`/`::h4` section headers are outside `pfDataDescriptionToHtml`'s
    // directive set — rewrite to the markdown headers it renders as bold.
    .map((line) => {
      const h = /^::(?:sh|h4)\[([^\]]*)\](?:\{.*\})?\s*$/.exec(line.trim());
      return h ? `### ${h[1]}` : line;
    });
  return {
    id,
    uuid: `pfdata:monster-template:${id}`,
    name: entry.name!,
    cr,
    ...flags,
    description: pfDataDescriptionToHtml(bodyLines),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the template dictionaries (`SLICE.monsterTemplateFiles`) into the vendored `MonsterTemplate[]` catalog. */
export function transformMonsterTemplates(
  pfDataJsonDir: string,
  files: readonly string[],
): MonsterTemplate[] {
  const templates: MonsterTemplate[] = [];
  for (const file of files) {
    const dict = readPfDataDictionary(join(pfDataJsonDir, `${file}.json`));
    for (const [id, entry] of pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS })) {
      templates.push(transformTemplate(id, entry));
    }
  }
  return templates;
}

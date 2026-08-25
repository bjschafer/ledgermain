/**
 * Pulls a feedback report off the issue tracker into a shape you can debug:
 * what the player actually reported, the character they attached (when they
 * ticked the box), and optionally the numbers the engine derives from it.
 *
 *   bun run feedback:pull <issue>             report + write the character file
 *   bun run feedback:pull <issue> --compute   also print the engine's numbers
 *   bun run feedback:pull <issue> --contact   also read their private handle
 *
 * The character is written under `.feedback/` (gitignored, because these are
 * real players' documents, names and free text included) using the same
 * filename the app's own export produces. Loading it is then Settings ->
 * Export / Import -> "Import character…" -> pick the file, which reuses the one
 * existing JSON ingress instead of adding a debug-only second one.
 *
 * Issues are read through `gh`. `--contact` goes through `wrangler` against the
 * FEEDBACK_CONTACTS namespace instead: the handle is deliberately absent from
 * the public issue (apps/api/src/feedbackContacts.ts), which is the point, so
 * it has to come from the store the issue only carries a ref to.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadRefData } from "../packages/data-pipeline/src/index.js";
import { compute } from "../packages/engine/src/index.js";
import type { CharacterDoc } from "../packages/schema/src/index.js";
import { characterExportFilename } from "../apps/web/src/model/exportCharacter.js";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "../.feedback");

const args = process.argv.slice(2);
const issueNumber = args.find((a) => /^\d+$/.test(a));
const wantCompute = args.includes("--compute");
const wantContact = args.includes("--contact");

if (!issueNumber) {
  console.error("usage: bun run feedback:pull <issue-number> [--compute] [--contact]");
  process.exit(1);
}

interface Issue {
  number: number;
  title: string;
  body: string;
  url: string;
  state: string;
  createdAt: string;
}

function readIssue(n: string): Issue {
  const result = spawnSync(
    "gh",
    ["issue", "view", n, "--json", "number,title,body,url,state,createdAt"],
    { encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[feedback-pull] "gh issue view ${n}" failed (exit ${result.status}).`);
    console.error(result.stderr.trim());
    process.exit(result.status ?? 1);
  }
  return JSON.parse(result.stdout) as Issue;
}

/**
 * Undo the zero-width spaces `neutralizeRefs` (apps/api/src/feedback.ts) wedges
 * after `@` and `#` to stop the bot autolinking. They're invisible in a browser
 * but not in a terminal, and this text is only being read here.
 */
function unneutralize(text: string): string {
  return text.replace(/​/g, "");
}

/** A `**Label:** value` line from the issue body. */
function field(body: string, label: string): string | undefined {
  const m = new RegExp(`^\\*\\*${label}:\\*\\* (.+)$`, "m").exec(body);
  return m ? unneutralize(m[1]!.trim()) : undefined;
}

/** The submitter's own words: the leading blockquote the body opens with. */
function reportedMessage(body: string): string {
  const lines: string[] = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith(">")) break;
    lines.push(line.replace(/^> ?/, ""));
  }
  return unneutralize(lines.join("\n")).trim();
}

/**
 * The opt-in character attachment. The closing fence has to be matched to the
 * opening one rather than assumed to be three backticks: `details()` widens the
 * fence past the longest backtick run in the content, so a document containing
 * backticks is wrapped in a wider one.
 */
function attachedCharacter(body: string): CharacterDoc | undefined {
  const m =
    /<details><summary>Attached character \(opt-in\)<\/summary>\n\n(`{3,})json\n([\s\S]*?)\n\1\n/.exec(
      body,
    );
  if (!m) return undefined;
  return JSON.parse(m[2]!) as CharacterDoc;
}

/** Trade the ref printed in the issue for the handle itself, via the KV store. */
function readContact(ref: string): void {
  const result = spawnSync(
    "wrangler",
    ["kv", "key", "get", ref, "--binding", "FEEDBACK_CONTACTS", "--remote"],
    { encoding: "utf8", cwd: join(here, "../apps/api") },
  );
  if (result.error || result.status !== 0) {
    console.log(`  contact: lookup failed (${result.stderr?.trim() || result.error?.message})`);
    return;
  }
  try {
    const record = JSON.parse(result.stdout) as { contact: string; createdAt: string };
    console.log(`  contact: ${record.contact}  (left ${record.createdAt.slice(0, 10)})`);
  } catch {
    console.log(`  contact: ${result.stdout.trim()}`);
  }
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * The handful of numbers a "wrong numbers" report is almost always about, so
 * a rules complaint can be checked without importing anything. Everything else
 * is what the app is for.
 */
function printDerived(doc: CharacterDoc): void {
  const refData = loadRefData();
  const sheet = compute(doc, refData);
  // `identity.race` is a Foundry id, which tells a reader nothing on its own.
  const race = refData.races[doc.identity.race]?.name ?? doc.identity.race;
  const classes = doc.identity.classes.map((c) => `${c.tag} ${c.level}`).join(" / ");
  const abilities = Object.entries(sheet.abilities)
    .map(([id, a]) => `${id.toUpperCase()} ${a.total} (${signed(a.mod)})`)
    .join("  ");
  console.log(`\nEngine says, for level ${sheet.level} ${race} ${classes}:`);
  console.log(
    `  AC ${sheet.ac.normal} (touch ${sheet.ac.touch}, flat-footed ${sheet.ac.flatFooted})`,
  );
  console.log(`  HP ${sheet.hp.current}/${sheet.hp.max}   init ${signed(sheet.initiative.total)}`);
  console.log(
    `  Fort ${signed(sheet.saves.fort.total)}  Ref ${signed(sheet.saves.ref.total)}  Will ${signed(sheet.saves.will.total)}`,
  );
  console.log(
    `  BAB ${signed(sheet.bab)}  melee ${signed(sheet.attack.melee.total)}  ranged ${signed(sheet.attack.ranged.total)}  CMB ${signed(sheet.cmb)}  CMD ${sheet.cmd}`,
  );
  console.log(`  ${abilities}`);
}

const issue = readIssue(issueNumber);

console.log(`#${issue.number} ${issue.title}`);
console.log(
  `  ${issue.url}  [${issue.state.toLowerCase()}, opened ${issue.createdAt.slice(0, 10)}]`,
);
const category = field(issue.body, "Category");
if (category) console.log(`  category: ${category}`);
const context = field(issue.body, "Context");
if (context) console.log(`  context:  ${context}`);

const contactLine = field(issue.body, "Contact");
const refMatch = contactLine ? /ref `([0-9a-f]+)`/.exec(contactLine) : null;
if (refMatch) {
  if (wantContact) readContact(refMatch[1]!);
  else console.log(`  contact: stored privately, ref ${refMatch[1]} (pass --contact to read it)`);
} else if (field(issue.body, "Contact \\(opt-in\\)")) {
  // Pre-dates the private store, so the handle is sitting in the public body.
  console.log(
    `  contact: ${field(issue.body, "Contact \\(opt-in\\)")}  (!! inline in the public issue)`,
  );
}

const message = reportedMessage(issue.body);
if (message)
  console.log(
    `\n${message
      .split("\n")
      .map((l) => `  | ${l}`)
      .join("\n")}`,
  );

const doc = attachedCharacter(issue.body);
if (!doc) {
  console.log("\nNo character attached to this report.");
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, `${issue.number}-${characterExportFilename(doc)}`);
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);

console.log(`\nCharacter: ${doc.identity.name} (doc ${doc.id}, version ${doc.version})`);
console.log(`  written to ${outPath.replace(join(here, ".."), ".")}`);
console.log(`  load it: Settings -> Export / Import -> "Import character…" -> pick that file`);

if (wantCompute) printDerived(doc);

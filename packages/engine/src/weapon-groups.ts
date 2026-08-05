/**
 * Canonical semantic weapon-group vocabulary (finding 1 — the
 * weapon-group-tagging gap).
 *
 * Before this module existed, `attack.weapon.<group>` /
 * `damage.weapon.<group>` (consumed by `computeWeaponAttacks` in compute.ts)
 * only ever matched a weapon's free-text, player-set `WeaponInstance.group`
 * tag (e.g. "longsword", "battle-axe" — one tag per specific weapon, the
 * mechanism Weapon Focus/Specialization use). There was no way to target a
 * whole *category* of weapons (bows, hammers, spears,...), which is what
 * Fighter's own Weapon Training class feature — and the ~46 archetype features
 * that reflavor it — actually need.
 *
 * The vendored weapon data already carries this vocabulary
 * (`WeaponRef.weaponGroups`, sourced from Foundry's `system.weaponGroups`);
 * this constant enumerates every value that actually occurs in
 * `packages/data-pipeline/data/weapons.json` today (verified via `jq -r '.[]
 * |.weaponGroups[]?' packages/data-pipeline/data/weapons.json | sort -u`),
 * normalized to this engine's kebab-case slug convention with {@link
 * normalizeWeaponGroup}. Extraction waves authoring a semantic weapon-group
 * `Change` target should validate the group name they emit against {@link
 * isKnownWeaponGroup} — an unrecognized slug silently never matches any
 * weapon.
 *
 * This vocabulary is deliberately separate from `WeaponInstance.group` (the
 * older free-text per-weapon tag) — see `computeWeaponAttacks` in compute.ts
 * for how the two are combined without double-applying.
 */
export const WEAPON_GROUPS = [
  "axes",
  "blades-heavy",
  "blades-light",
  "bows",
  "close",
  "crossbows",
  "double",
  "firearms",
  "flails",
  "hammers",
  "monk",
  // "natural" and "siege-engines" are Ultimate Combat's two additions to the
  // fighter Weapon Training group list (UC p.106-107) — neither occurs in
  // this app's vendored `weapons.json` slice (verified via the same `jq`
  // query cited above: no weapon carries either as a `weaponGroups` tag), so
  // adding them here doesn't change any existing match. They exist so a
  // hand-authored Weapon Training-style effect (or a future extraction wave)
  // can target them by name instead of the target silently being unspellable.
  "natural",
  "polearms",
  "siege-engines",
  "spears",
  "thrown",
  "tribal",
] as const;

export type WeaponGroup = (typeof WEAPON_GROUPS)[number];

const WEAPON_GROUP_SET: ReadonlySet<string> = new Set(WEAPON_GROUPS);

/** True if `group` (already normalized via {@link normalizeWeaponGroup}) is a known vendored weapon group. */
export function isKnownWeaponGroup(group: string): boolean {
  return WEAPON_GROUP_SET.has(group);
}

/**
 * Normalizes a weapon-group tag to this engine's slug convention: camelCase
 * word boundaries and whitespace/punctuation runs all become a single
 * hyphen, lowercased. E.g. `"bladesHeavy"` -> `"blades-heavy"`,
 * `"Blades Heavy"` -> `"blades-heavy"`, `"bows"` -> `"bows"`.
 *
 * Use this wherever a semantic weapon-group `Change` target's `<group>`
 * suffix is authored (a `build.weaponTrainingGroups` picker, an extraction
 * wave's emitted target) or matched (`WeaponInstance.weaponGroups`,
 * snapshotted from `WeaponRef.weaponGroups` at pick-time) — keeping the
 * normalization in one place is what lets both sides agree on spelling.
 *
 * Deliberately NOT applied to `WeaponInstance.group` (the free-text
 * per-weapon tag `attack.weapon.<group>`/`damage.weapon.<group>` already
 * matched via exact string equality for Weapon Focus/Specialization, long
 * before this module existed) — normalizing that path now would silently
 * change which existing `Change`s match a player's already-tagged weapons.
 */
export function normalizeWeaponGroup(raw: string): string {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The free-text `WeaponInstance.group` tag every synthesized unarmed strike
 * carries (`apps/web/src/model/unarmedStrike.ts` builds the entry, since no
 * vendored weapon item is an unarmed strike). It lives here rather than in the
 * web app because the engine has to recognize an unarmed strike too: the monk
 * and brawler DR bypasses in `dr-bypass.ts` apply to it and to nothing else.
 *
 * Deliberately NOT a member of {@link WEAPON_GROUPS} — that's the vendored
 * semantic-category vocabulary, and this is a per-weapon tag in the same free
 * space as "longsword".
 */
export const UNARMED_STRIKE_GROUP = "unarmed strike";

/** True when `w` is an unarmed strike entry, however the player named it. */
export function isUnarmedStrikeWeapon(w: { group?: string }): boolean {
  return (w.group ?? "").trim().toLowerCase() === UNARMED_STRIKE_GROUP;
}

/**
 * Grants that come from a chosen domain-shaped option: a cleric/inquisitor
 * domain, an inquisition, a wizard arcane school, or a druid nature bond.
 */
import { domainByTag, subdomainByTag } from "../refdata-index.js";
import { type GrantedFeaturesContext, domainCasterLevel } from "./shared.js";

/** Cleric/inquisitor domain and subdomain granted powers. */
export function collectDomainPowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  const domainLevel = domainCasterLevel(doc);
  const domainClassTag = doc.identity.classes.some((c) => c.tag === "cleric")
    ? "cleric"
    : "inquisitor";
  if (domainLevel > 0) {
    for (const tag of doc.build.clericDomains ?? []) {
      const domain = domainByTag(refData, tag);
      if (domain) {
        for (const grant of domain.features) {
          if (grant.level > domainLevel || !grant.resolved) continue;
          out.push({
            classTag: domainClassTag,
            level: grant.level,
            grant,
            origin: { kind: "domain", label: domain.name },
          });
        }
        continue;
      }
      // Not a top-level domain tag — try a subdomain, whose `features` is
      // already the complete merged list (kept parent powers + replacements;
      // see its doc comment). The parent-domain fallback is dead weight
      // against the current slice, kept only so a future data bump that drops
      // a subdomain's power list degrades to the parent's rather than to
      // nothing.
      const subdomain = subdomainByTag(refData, tag);
      if (!subdomain) continue;
      const parentTag = subdomain.parentDomainTags[0];
      const parentDomain = parentTag === undefined ? undefined : domainByTag(refData, parentTag);
      const features =
        subdomain.features.length > 0 ? subdomain.features : (parentDomain?.features ?? []);
      for (const grant of features) {
        if (grant.level > domainLevel || !grant.resolved) continue;
        out.push({
          classTag: domainClassTag,
          level: grant.level,
          grant,
          origin: { kind: "domain", label: subdomain.name },
        });
      }
    }
  }
}

/** Inquisitor inquisition granted powers. */
export function collectInquisitionPowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Inquisitor's inquisition — the alternative to a domain (`build.
  // inquisition`, mutually exclusive with `clericDomains`; the builder
  // picker enforces that). Unlike a domain, an inquisition is never
  // available to a cleric, so this gates on the inquisitor's own class
  // level directly rather than `domainCasterLevel`.
  const inquisitorLevel = doc.identity.classes.find((c) => c.tag === "inquisitor")?.level ?? 0;
  if (inquisitorLevel > 0 && doc.build.inquisition) {
    const inquisition = Object.values(refData.inquisitions).find(
      (i) => i.tag === doc.build.inquisition,
    );
    if (inquisition) {
      for (const grant of inquisition.features) {
        if (grant.level > inquisitorLevel || !grant.resolved) continue;
        out.push({
          classTag: "inquisitor",
          level: grant.level,
          grant,
          origin: { kind: "inquisition", label: inquisition.name },
        });
      }
    }
  }
}

/** Wizard arcane school (or focused school) granted powers. */
export function collectWizardSchoolPowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  const wizardLevel = doc.identity.classes.find((c) => c.tag === "wizard")?.level ?? 0;
  if (wizardLevel > 0) {
    // `build.wizardSchool` undefined means Universalist (back-compat — see
    // `WizardSchoolTag` doc comment in @pf1/schema): a Universalist still gets
    // Hand of the Apprentice / Metamagic Mastery, just no bonus spell slot.
    const schoolTag = doc.build.wizardSchool ?? "uni";
    const school = Object.values(refData.wizardSchools).find((s) => s.tag === schoolTag);
    // A focused school (`build.wizardFocusedSchool`, e.g. Admixture) only
    // changes WHICH powers are granted — the spell list/opposition mechanics
    // still key off `schoolTag` unchanged, see `FocusedSchool` doc comment.
    // `FocusedSchool.features` is already the complete merged list (parent's
    // kept powers + its own), so it's used in place of, never alongside,
    // `school.features`. A stale focus that no longer matches the current
    // school (e.g. after `wizardSchool` changed without going through
    // `setWizardSchool`) falls back to the plain school's powers.
    const focused = doc.build.wizardFocusedSchool
      ? Object.values(refData.focusedSchools).find(
          (f) => f.tag === doc.build.wizardFocusedSchool && f.parentTag === schoolTag,
        )
      : undefined;
    if (school) {
      for (const grant of focused?.features ?? school.features) {
        if (grant.level > wizardLevel || !grant.resolved) continue;
        out.push({
          classTag: "wizard",
          level: grant.level,
          grant,
          origin: { kind: "school", label: focused?.name ?? school.name },
        });
      }
    }
  }
}

/** Druid nature-bond domain granted powers. */
export function collectDruidDomainPowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Druid nature-bond domain powers — hand-authored (issue #117; see
  // `supplements.ts`'s `SUPPLEMENTAL_DRUID_DOMAIN_FEATURES`), gated on druid
  // level the same way a cleric domain gates on cleric/inquisitor level
  // above. A non-druid with a stale `druidNatureBondDomain` field (or an
  // unresolvable tag) gets nothing. Wolf's fixed bonus feat (Improved Trip)
  // is NOT here — it comes through `DruidDomain.changes` and the web layer's
  // `apps/web/src/model/feats.ts`, the same path Darkness/Rune's cleric-
  // domain bonus feats use, so it never appears as a classFeatures entry.
  const druidLevel = doc.identity.classes.find((c) => c.tag === "druid")?.level ?? 0;
  if (druidLevel > 0 && doc.build.druidNatureBondDomain) {
    const druidDomain = Object.values(refData.druidDomains).find(
      (d) => d.tag === doc.build.druidNatureBondDomain,
    );
    if (druidDomain) {
      for (const grant of druidDomain.features) {
        if (grant.level > druidLevel || !grant.resolved) continue;
        out.push({
          classTag: "druid",
          level: grant.level,
          grant,
          origin: { kind: "domain", label: druidDomain.name },
        });
      }
    }
  }
}

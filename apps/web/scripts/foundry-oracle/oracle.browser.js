// Runs inside a Foundry VTT tab logged in as a GM (see dump.ts). Builds each
// spec as an actor through Foundry's public client API, then snapshots the
// actor's data plus the derived numbers Foundry computed for it. Only API
// calls and their outputs: nothing here reads or depends on pf1 system code.
(() => {
  const FOLDER = "Ledgermain Oracle";
  // A per-actor change id for the flexible racial +2 (Foundry wants 8 chars).
  const FLEX_CHANGE_ID = "lmflex01";

  async function fromPack(pack, name) {
    const p = game.packs.get(pack);
    if (!p) throw new Error(`No compendium ${pack}`);
    const entry = (await p.getIndex()).find((e) => e.name === name);
    if (!entry) throw new Error(`${pack} has no entry named "${name}"`);
    return game.items.fromCompendium(await p.getDocument(entry._id));
  }

  async function folder() {
    return (
      game.folders.find((f) => f.type === "Actor" && f.name === FOLDER) ??
      (await Folder.create({ name: FOLDER, type: "Actor" }))
    );
  }

  function skillItem(actor, key) {
    return actor.items.find((i) => {
      if (i.type !== "skill") return false;
      const id = i.system.identifier;
      return id === key || `${i.system.grouping}.${id}` === key;
    });
  }

  async function build(spec, scenarioName, scenario) {
    const f = await folder();
    const actor = await Actor.create({
      name: `${spec.id} [${scenarioName}]`,
      type: "character",
      folder: f.id,
    });
    await actor.update({
      "system.details.alignment": spec.alignment,
      ...Object.fromEntries(
        Object.entries(spec.abilities).map(([k, v]) => [`system.abilities.${k}.value`, v]),
      ),
    });

    const race = await fromPack("pf1.races", spec.race);
    if (spec.flexibleAbility) {
      race.system.changes = {
        ...race.system.changes,
        [FLEX_CHANGE_ID]: {
          _id: FLEX_CHANGE_ID,
          formula: "2",
          target: spec.flexibleAbility,
          type: "racial",
        },
      };
    }
    await actor.createEmbeddedDocuments("Item", [race]);

    for (const cls of spec.classes) {
      // oxlint-disable-next-line no-await-in-loop -- creation order records the order classes were taken
      const item = await fromPack("pf1.classes", cls.name);
      item.system.level = cls.level;
      item.system.hp = cls.hp;
      // oxlint-disable-next-line no-await-in-loop -- see above
      await actor.createEmbeddedDocuments("Item", [item]);
    }

    const feats = await Promise.all(spec.feats.map((name) => fromPack("pf1.feats", name)));
    await actor.createEmbeddedDocuments("Item", feats);

    const items = await Promise.all(spec.items.map((i) => fromPack(i.pack, i.name)));
    items.forEach((item, index) => {
      const spec_ = spec.items[index];
      if (spec_.equipped != null) item.system.equipped = spec_.equipped;
      if (spec_.enh) item.system.armor.enh = spec_.enh;
      if (spec_.material) {
        const m = spec_.material;
        item.system.armor.material.base.value = m.id;
        if (m.maxDex != null) item.system.armor.dex = m.maxDex;
        if (m.acp != null) item.system.armor.acp = m.acp;
        if (m.spellFailure != null) item.system.spellFailure = m.spellFailure;
      }
    });
    await actor.createEmbeddedDocuments("Item", items);

    const rankUpdates = [];
    for (const [key, rank] of Object.entries(spec.skills)) {
      const item = skillItem(actor, key);
      if (!item) throw new Error(`${spec.id}: no skill item for "${key}"`);
      rankUpdates.push({ _id: item.id, "system.rank": rank });
    }
    await actor.updateEmbeddedDocuments("Item", rankUpdates);

    const buffs = await Promise.all(
      (scenario.buffs ?? []).map(async (b) => {
        const item = await fromPack("pf1.buffs", b.name);
        item.system.active = true;
        item.system.level = b.level;
        return item;
      }),
    );
    if (buffs.length) await actor.createEmbeddedDocuments("Item", buffs);

    for (const c of scenario.conditions ?? []) {
      // oxlint-disable-next-line no-await-in-loop -- each condition is its own actor update; parallel ones race
      await actor.setCondition(c, true);
    }

    const live = {};
    for (const [k, v] of Object.entries(scenario.drain ?? {}))
      live[`system.abilities.${k}.drain`] = v;
    if (scenario.negativeLevels) live["system.attributes.energyDrain"] = scenario.negativeLevels;
    if (Object.keys(live).length) await actor.update(live);

    return actor;
  }

  function skillTotals(skills, prefix = "", out = {}) {
    for (const [k, v] of Object.entries(skills ?? {})) {
      if (!v || typeof v !== "object" || !("mod" in v)) continue;
      out[prefix + k] = v.mod;
      if (v.subSkills) skillTotals(v.subSkills, `${prefix}${k}.`, out);
    }
    return out;
  }

  function derived(actor) {
    const s = actor.system;
    const a = s.attributes;
    // `traits.size.value` indexes Foundry's size ladder, fine through colossal.
    const sizeMod = Object.values(pf1.config.sizeMods)[s.traits.size.value] ?? 0;
    return {
      abilities: Object.fromEntries(
        Object.entries(s.abilities).map(([k, v]) => [k, { total: v.total, mod: v.mod }]),
      ),
      ac: {
        normal: a.ac.normal.total,
        touch: a.ac.touch.total,
        flatFooted: a.ac.flatFooted.total,
      },
      cmb: a.cmb.total,
      cmd: { total: a.cmd.total, flatFooted: a.cmd.flatFootedTotal },
      saves: {
        fort: a.savingThrows.fort.total,
        ref: a.savingThrows.ref.total,
        will: a.savingThrows.will.total,
      },
      init: a.init.total,
      bab: a.bab.total,
      // Foundry's attack fields leave out the ability and size modifiers; add
      // them so the numbers are a full attack bonus before weapon-specific ones.
      attack: {
        melee:
          a.attack.shared +
          a.attack.general +
          a.attack.melee +
          s.abilities[a.attack.meleeAbility].mod +
          sizeMod,
        ranged:
          a.attack.shared +
          a.attack.general +
          a.attack.ranged +
          s.abilities[a.attack.rangedAbility].mod +
          sizeMod,
      },
      hp: { max: a.hp.max },
      speed: { land: s.movement.land.total },
      sr: a.sr.total,
      acp: a.acp.total,
      skills: skillTotals(s.skills),
    };
  }

  // Trimmed to what an importer could use, so the committed fixtures stay a
  // reviewable size and regenerate without churn: no item prose, no token,
  // image or permission data, no untouched skill items (a fresh actor carries
  // all 36 at rank 0), and `_stats` cut to the compendium source.
  function exportData(actor) {
    const data = actor.toObject();
    delete data.prototypeToken;
    delete data.img;
    delete data.ownership;
    delete data._stats;
    if (data.system?.details?.biography) delete data.system.details.biography;
    data.items = data.items.filter(
      (item) => item.type !== "skill" || item.system.rank > 0 || item.system.custom,
    );
    for (const item of data.items) {
      if (item.system?.description) delete item.system.description;
      delete item.img;
      delete item.ownership;
      item._stats = { compendiumSource: item._stats?.compendiumSource ?? null };
    }
    return data;
  }

  async function run(specs) {
    const f = await folder();
    const stale = game.actors.filter((x) => x.folder?.id === f.id).map((x) => x.id);
    if (stale.length) await Actor.deleteDocuments(stale);

    const out = {};
    for (const spec of specs) {
      const scenarios = {};
      for (const [name, scenario] of Object.entries(spec.scenarios)) {
        // oxlint-disable-next-line no-await-in-loop -- one actor at a time keeps the world's writes ordered
        const actor = await build(spec, name, scenario);
        scenarios[name] = { actor: exportData(actor), derived: derived(actor) };
      }
      out[spec.id] = {
        foundry: { core: game.version, system: game.system.version },
        spec,
        scenarios,
      };
    }
    return out;
  }

  globalThis.ledgermainOracle = { run };
})();

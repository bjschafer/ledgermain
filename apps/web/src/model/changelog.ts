/**
 * Player-facing "What's new" — a hand-curated list of notable changes, newest
 * first, rendered in Settings as the counterpart to `coverageNotes.ts` ("what
 * we added" next to "what we still don't do").
 *
 * Deliberately hand-written rather than generated from commits: the audience
 * is a player, not a contributor, and one player-visible change routinely
 * spans half a dozen commits while a data regen spans none. An entry is
 * earned when a player would see or do something different at the table;
 * refactors and internal fixes don't get one. Because the list promises
 * "notable" and not "complete", a missing entry reads as quiet rather than
 * wrong — which is the only reason a hand-maintained list like this is safe.
 *
 * Dated, not versioned: the app ships continuously and has no release number
 * to hang entries off.
 *
 * House style applies to every string here: no em or en dashes, since this
 * copy renders in the app. Restructure the sentence (a colon, a period, a
 * pair of commas) rather than printing the ` -- ` substitute on screen.
 * `test/changelog.test.ts` enforces that, and a per-entry word budget.
 *
 * This file is the counterpart to `coverageNotes.ts`, and the two must not
 * converge: shipped work is announced here and nowhere else, while that file
 * only ever describes what is still missing.
 */

export interface ChangelogEntry {
  /**
   * Stable identity and, via its position in the array, the high-water mark
   * the "new" cue compares against. Never rewrite an id once shipped — every
   * reader who has already seen that entry has the old string stored, and a
   * rewrite makes their mark unresolvable (which re-announces the list).
   */
  id: string;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  title: string;
  note: string;
}

/** Newest first — `CHANGELOG[0]` is the entry the unseen cue keys off. */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    id: "2026-08-16-archetype-performance-variants",
    date: "2026-08-16",
    title: "Archetype performances and songs join the pool toggles",
    note: "Bard archetypes that swap out performance types now show their own on the Bardic Performance tracker, in place of what they trade away. A court bard toggles Satire and Mockery instead of Inspire Courage and Inspire Competence, a sea singer gets Sea Shanty, a sandman gets Stealspell, and so on across some fifty archetypes, each at the level it arrives. Variants with numbers for your own sheet apply them while the toggle is on, like the savage skald's Inspiring Blow temp HP or the masked performer's Seamless Guise bonus to Disguise. Skald archetypes join too: a court poet's Inspired Rage sharpens the mind instead of the body, a wyrm-singer's Draconic Rage boosts melee attack and damage, and swapped-in songs like Song of Questing appear in their slot. Battle dancers and buskers redefine the whole pool and are not covered yet.",
  },
  {
    id: "2026-08-15-bardic-performances-toggle",
    date: "2026-08-15",
    title: "Bardic performances and skald songs are toggles on their pool",
    note: "A bard's performance types now sit on the Bardic Performance rounds tracker as toggles, the same way an inquisitor's judgments do. Inspire Greatness and Inspire Heroics apply their attack, save, and AC bonuses to your sheet while active, and the rest, from Countersong to Deadly Performance, appear at the level you gain them with their numbers and save DCs spelled out. Skalds get their full song list too: Song of Strength adds half your level to Climb and Swim while it plays, and Song of Marching, Dirge of Doom, and Song of the Fallen join Inspired Rage. Inspire Courage keeps working exactly as before.",
  },
  {
    id: "2026-08-15-single-tier-archetype-trades",
    date: "2026-08-15",
    title: "Single armor training steps and bonus feats traded by archetypes now compute",
    note: "Some fighter archetypes trade away a single step of armor training or a single bonus feat instead of a whole feature, and the sheet used to ignore those trades. Now they land: an Unbreakable fighter keeps armor training 1 and 2, an unarmed fighter keeps exactly armor training 3, and max Dex and armor check penalty follow. Archetypes that give up specific bonus feats, like the Eldritch Guardian's familiar and the Opportunist's Cunning Edge, subtract those slots from your feat count, and the same works for monk, warpriest, and swashbuckler archetypes. Two archetypes trading the same step now conflict in the picker. Also fixed: Corsair, Siegebreaker, Weapon Bearer Squire, and Eldritch Guardian fighters wrongly lost Bravery to a data mixup and have it back, and the Gloomblade now correctly gives up armor training for its shadow weapon.",
  },
  {
    id: "2026-08-14-choose-one-abilities-compute",
    date: "2026-08-14",
    title: "Abilities that ask you to choose now offer the choice and compute",
    note: "Many feats, traits, and class abilities say choose an option and gain its benefit, and the sheet used to show only the text. Now they offer the pick right where they appear, and your sheet updates with what you chose. Feats like Angelic Flesh, Tribal Scars, Totem Spirit, and Draconic Aspect apply their chosen branch, Skill Focus works for your own Craft, Perform, and Profession skills, and Spirit Focus boosts a medium channeling the chosen legend. Around seventy traits with a pick, like Clan Artisan or Secret Knowledge, apply their bonus to the skill you name. Archetype abilities join in too: a Monk of the Four Winds picks an aspect and gains its movement, an invulnerable rager picks fire or cold for Extreme Endurance, and a skirmisher fighter picks a Conditioning specialization. Anything left unchosen simply waits, nothing is assumed for you.",
  },
  {
    id: "2026-08-14-same-name-archetypes-untangled",
    date: "2026-08-14",
    title: "Same-named archetypes no longer borrow each other's abilities",
    note: "Skirmisher, Infiltrator, and Roof Runner are archetype names that several classes share, and each class's version was showing every other class's abilities too. Now each shows only its own: a Skirmisher ranger keeps hunter's tricks while the fighter version keeps its training abilities, an Infiltrator inquisitor, investigator, or ranger sees only that class's published features, and a Roof Runner hunter and rogue each keep their own. Numbers that leaked across, like a dodge bonus and faster speed on a Skirmisher ranger or a climb speed on a Roof Runner rogue, are gone. A Skirmisher fighter's Conditioning, which showed no rules text at all, now lists its four specializations.",
  },
  {
    id: "2026-08-14-archetype-abilities-that-showed-nothing",
    date: "2026-08-14",
    title: "Archetype abilities that used to show only rules text now compute",
    note: "A handful of archetype abilities were listed on your sheet without their numbers. They apply now: a plague bringer's and an internal alchemist's disease save bonuses climb from +2 to +6 as you level, a horticulturist gets +2 Knowledge (nature) and +2 Survival, and a holy tactician's bonus teamwork feats are counted toward your feat total. A sharptooth barbarian gains a swim speed that starts at 10 feet and grows every five levels, and Fast Movement now shows struck through as the ability it trades away.",
  },
  {
    id: "2026-08-13-granted-speeds-bravery-natural-armor",
    date: "2026-08-13",
    title: "Granted speeds, Bravery feats, and natural armor feats compute",
    note: "Feats and features that grant a whole movement speed now put it on your sheet: Barracuda Dash and Fiendish Serpent grant swim speeds, Fiendish Wings a fly speed, Oread Burrower and Burrowing Teeth burrow speeds, a Storm Kindler's Wave Breaker grants a swim speed of twice your land speed, and the Abendego diver and tidal hunter ranger archetypes land theirs too. Feats keyed to a fighter's Bravery scale with it now: Bravery in Action adds it to initiative, Social Bravery to Bluff and Intimidate, Undaunted Bravery to Intimidate, and Unbound Bravery to Escape Artist. Natural armor feats apply as well: Ironhide and Armor of the Pit add their bonus, and Improved Natural Armor and Stone Soul stack on top of natural armor you already have, the way an increase should.",
  },
  {
    id: "2026-08-13-named-craft-perform-profession-bonuses",
    date: "2026-08-13",
    title: "Bonuses to a named Craft, Perform, or Profession apply themselves",
    note: "A trait, feat, or archetype feature that boosts one named skill specialty now adds its bonus to that skill's row instead of only showing rules text: a sailor trait raises Profession (sailor), Brewmaster raises Craft (alchemy) and Profession (brewer), a snare setter's trapsmithing raises Craft (traps). A Craft or Perform row it touches appears on your sheet even before you put ranks in it, and class skill grants for a single specialty count too. Over forty traits, feats, and features across the catalog now land this way, including Breadth of Experience's +2 on every Knowledge and Profession skill.",
  },
  {
    id: "2026-08-12-spell-focus-and-penetration",
    date: "2026-08-12",
    title: "Spell Focus raises your spell DCs, Spell Penetration your checks",
    note: "Spell Focus and Greater Spell Focus now raise the save DC shown on every spell of your chosen school, on the tracker, the builder, and printed sheets, and the spell's details name the feat behind the number. Spell Penetration and its Greater half now show your full caster level check against spell resistance in each spell's details, and the printed sheet carries the bonus next to your caster level. Dispel Focus, the duergar's Deep Magic, elven spirit, and a human's Unstoppable Magic land the same way.",
  },
  {
    id: "2026-08-12-ac-conditional-lines",
    date: "2026-08-12",
    title: "Situational AC bonuses show under Armor Class",
    note: "Bonuses that only apply against certain attacks now appear as their own lines under Armor Class on the builder, the tracker, and printed sheets, instead of hiding in rules text. A dwarf or gnome's +4 dodge bonus against giants shows up, trap sense computes both its Reflex and AC halves for every class that grants it, a drow's dodge bonus against aberrations lands, and a hunter's snake focus shows its bonus against attacks of opportunity. Features that share a name across classes but scale differently now compute correctly too: Trap Sense, Danger Sense, and Poison Resistance each show the right number for rogues, barbarians, investigators, alchemists, and the prestige classes that carry their own versions, and a stalwart defender's damage reduction and AC bonus are real numbers now.",
  },
  {
    id: "2026-08-12-ability-dcs",
    date: "2026-08-12",
    title: "Your ability save DCs show on the sheet",
    note: "The sheet now shows the save DCs your abilities force on enemies: hexes, channel energy, bombs, cruelties, mesmerist tricks, Stunning Fist, and Quivering Palm, on the builder, the tracker, and printed sheets. A feat or trait that raises one of these DCs now raises the number you see too, instead of only showing up in rules text.",
  },
  {
    id: "2026-08-11-maneuver-bonuses",
    date: "2026-08-11",
    title: "Combat maneuver bonuses show under CMB and CMD",
    note: "Bonuses tied to a specific combat maneuver now appear as their own lines under CMB and CMD instead of hiding in rules text. All twenty Improved and Greater maneuver feats compute both halves, so an Improved Trip character sees the +2 on trip attempts and the +2 against being tripped. A dwarf's Stability shows its +4 against bull rush and trip, and around sixty more feats, traits, racial traits, and archetype features landed the same way, including the archaeologist and wilderness explorer trap sense variants on saving throws.",
  },
  {
    id: "2026-08-11-more-save-scopes",
    date: "2026-08-11",
    title: "Saving throws recognize fifteen more kinds of effect",
    note: "The sheet can now show a separate saving throw line against traps, sonic effects, gaze attacks, paralysis, confusion, pain, fatigue and exhaustion, energy drain, ability damage, positive energy, nausea, entangling effects, language dependent effects, and the necromancy and divination schools. Around forty racial traits, character traits, class features, and archetype features that grant those bonuses moved from reminder text onto your saves: a bard's Well Versed, an elf's Desert Runner, a dwarf's Shadowhunter, the Jungle domain's trap sense, and an investigator Profiler's Divination Analysis all compute their lines automatically now.",
  },
  {
    id: "2026-08-11-granted-power-numbers",
    date: "2026-08-11",
    title: "Domain, school, and inquisition powers show real bonuses",
    note: "Eleven always on powers granted by cleric domains and subdomains, wizard arcane schools, druid nature bonds, and inquisitions now compute their numbers instead of sitting as reminder text. Guarded Mind's save bonus against mind affecting effects, Eyes of the Hawk's Perception bonus, Perfected Form's save bonus against polymorph and petrification, Fire Supremacy and Fire Hardened's fire resistance, and Void Awareness's save bonus against spells all show up automatically now. Self Control, Patient Sensibility, Torturer's Presence, Grant the Initiative, and Labyrinthine Words, five inquisition powers, add their bonuses to your sheet the same way.",
  },
  {
    id: "2026-08-10-splatbook-order-skills",
    date: "2026-08-10",
    title: "Every cavalier and samurai order grants its skills",
    note: "All thirty splatbook orders joined the order catalog, so picking any of them now adds the order's class skills to your sheet automatically, the same way the core orders always have. Kineticists with Curse Breaker also see their bonus against curses as a saving throw line instead of buried rules text.",
  },
  {
    id: "2026-08-10-prestige-class-feature-numbers",
    date: "2026-08-10",
    title: "Prestige class features compute more of their numbers",
    note: "A sweep through the class feature catalog promoted two dozen prestige class bonuses from reminder text into real computed numbers. Duelists see Improved Reaction and the armor-gated Grace on their sheets, dragon disciples get their cumulative natural armor, living monoliths their damage reduction and soul stone save lines, and storm kindlers, lion blades, low templars, and a dozen others now watch their skill, save, resistance, and speed bonuses land automatically as they level.",
  },
  {
    id: "2026-08-09-alternate-racial-trait-numbers",
    date: "2026-08-09",
    title: "More alternate racial traits compute their numbers",
    note: "A sweep through the alternate racial trait catalog promoted bonuses that were reminder text into real computed numbers: the ten changeling hag ancestries apply their ability scores correctly, the dwarf Stubborn trait shows its Will bonus against charm and compulsion on the saves panel, gathlain Fey Resilience computes its scaling damage reduction, and several disease and poison save bonuses (gnome, svirfneblin, half-elf) now appear as situational save lines. A handful of character traits with the same shape, like Venom Resistance, got the same promotion.",
  },
  {
    id: "2026-08-07-picker-styling-sweep",
    date: "2026-08-07",
    title: "Tidied up the class-choice panels",
    note: "A sweep across the builder and tracker fixed panels that were rendering as unstyled text: domain, school and spirit-magic bonus slots now carry the same headings as the rest of the Play tab, companion and eidolon fields sit on one line instead of stacking, bloodline bonus spells lost their stray bullets, and powers you have not reached the level for are dimmed the way the other preview lists already dimmed them.",
  },
  {
    id: "2026-08-07-phrenic-amplifications-at-the-table",
    date: "2026-08-07",
    title: "Phrenic amplifications work at the table",
    note: "Your picked amplifications now appear under the Phrenic Pool in the tracker's Resources panel with their point cost, a spend button, and their full rules text, so paying for a rider on a spell you are casting is one tap. In the builder, major amplifications stay locked until 11th level, and Dual Amplification checks that you know two other amplifications first.",
  },
  {
    id: "2026-08-07-all-psychic-disciplines-modeled",
    date: "2026-08-07",
    title: "Every psychic discipline is modeled",
    note: "All 23 published disciplines now grant their bonus spells known, feed the right ability into your phrenic pool, and list their discipline powers on your sheet. Previously only the 12 Occult Adventures core disciplines did; the splatbook ones were read-only text.",
  },
  {
    id: "2026-08-07-undercasting",
    date: "2026-08-07",
    title: "Undercasting",
    note: "Knowing the higher version of an undercastable spell, like Mind Thrust IV, now also gives you the lower versions: they show up in the Play tab as castable at their own spell levels, marked as undercast, without costing extra spells known. The builder notes what each known spell grants.",
  },
  {
    id: "2026-08-07-spontaneous-spell-learning-gate",
    date: "2026-08-07",
    title: "Spontaneous casters learn spells on schedule",
    note: "A sorcerer, psychic, or other spontaneous caster can no longer add a spell of a level they cannot cast yet; the button stays locked and tells you the class level that unlocks it. Prepared casters are untouched: scribing ahead into a spellbook is legitimate planning.",
  },
  {
    id: "2026-08-07-class-feature-rows-expand-on-click",
    date: "2026-08-07",
    title: "Class feature rows open on click",
    note: "A class feature's full description now expands from a click anywhere on its row, not just the tiny triangle, and rows with nothing more to show no longer light up as if they were clickable.",
  },
  {
    id: "2026-08-07-racial-trait-swaps-enforced",
    date: "2026-08-07",
    title: "Alternate racial traits stop double-spending a swap",
    note: "A race has one of each standard trait to trade, so picking Dreamspeaker now rules out Fleet-Footed and every other elf trait that wants Elven Magic. Both trait lists check each other, and a blocked entry says which pick took the trait.",
  },
  {
    id: "2026-08-06-kineticist-talents-do-things",
    date: "2026-08-06",
    title: "Kineticist wild talents that actually do something",
    note: "Cold Adaptation, Heat Adaptation, and Aerial Adaptation now grant real energy resistance on your sheet, scaling with the burn you are holding. Eyes of the Void grants darkvision, Herbal Antivenom's bonus shows up on your Fortitude save against poison, and Skilled Kineticist boosts your element's class skills. Kinetic Healer, Void Healer, Wood Healer, Kinetic Restoration, and Celerity now appear as actions in the tracker's Resources panel with their burn cost and current effect, so they are usable at the table instead of only living in the builder.",
  },
  {
    id: "2026-08-06-kineticist-picker-clarity",
    date: "2026-08-06",
    title: "A clearer kineticist picker",
    note: "Wild talents above your current level now wear a Level badge and stay locked until you get there, instead of a small warning that was easy to miss. Infusions and utility talents that require another talent show it as a checklist line that checks itself off once you have the prerequisite. The Elemental Focus summary, your simple blast, class skills, defense, and basic utility, now reads as a clean list instead of a run-on paragraph.",
  },
  {
    id: "2026-08-06-skill-breakdowns",
    date: "2026-08-06",
    title: "Skills now show their math",
    note: "Every skill on the sheet expands now, same as your AC and saves. Open one up to see your ranks, ability modifier, the class skill bonus, any armor check penalty, and every other bonus stacked on top, with anything overridden crossed out.",
  },
  {
    id: "2026-08-06-familiar-section-earned",
    date: "2026-08-06",
    title: "The Familiar section knows who gets one",
    note: "The Familiar section in Classes now only appears for characters with an actual familiar source: a wizard's bond, a witch, an arcanist's exploit, an arcane bloodline sorcerer, the Familiar Bond feats, and the like. A kineticist, or anyone else without one, no longer sees it.",
  },
  {
    id: "2026-08-06-phantom-archetypes",
    date: "2026-08-06",
    title: "Two archetypes that were never real",
    note: "The archetype list offered kineticists an archetype called Kineticist, and gunslingers a stray copy of their own deeds. Neither was a real archetype: both came from source entries filed under the class name instead of the archetype that owns them. They are gone. Sand blast and sirocco blast now sit where they belong, on the psammokinetic, which had been listing them in its description without ever granting them.",
  },
  {
    id: "2026-08-05-racial-feat-checks",
    date: "2026-08-05",
    title: "Racial feats now check your race",
    note: "A feat whose requirement is a race, like Keen Scent or Elemental Jaunt, used to show a soft warning and let anyone take it. It now checks: 461 feats picked up a race requirement, and the feat picker locks the ones you cannot qualify for. The martial flexibility picker checks the same way, so a brawler borrowing a combat feat mid fight is not offered another race's feats. Half elves and half orcs count as both of their parent races, and a drow qualifies for elf feats, a duergar for dwarf feats, a svirfneblin for gnome feats. A feat that only mentions a race in passing, like one needing a halfling sling staff or an orc ferocity racial trait, is left alone and still just warns.",
  },
  {
    id: "2026-08-04-saved-roll-clarity",
    date: "2026-08-04",
    title: "Saved rolls: a clearer feat picker and fists that know their feats",
    note: "The feat list on a saved roll now sorts itself into two groups: feats that change the numbers the moment you attach them, and feats that ride along as reminders. Feats whose bonus is already baked into your sheet, like Iron Will, no longer show up at all, and an attack roll only offers combat feats as reminders. Improved Unarmed Strike attaches itself to your unarmed strike rolls with a note that your punches are lethal and do not provoke. When a brawler turns a roll to two weapon fighting, the toggle now says it is their flurry and spells out what they can flurry with. Roll titles got bigger and bolder so the list is easier to scan mid fight.",
  },
  {
    id: "2026-08-04-brawler-bonus-feats",
    date: "2026-08-04",
    title: "Brawlers: know which feats are your bonus feats",
    note: "A brawler's bonus combat feats now have their own labeled slots in the feat list, kept separate from a fighter's, and any feat can be pinned to the class slot it was picked for. That matters at 5th level and every 3 after, when a brawler may swap out one bonus combat feat: the pin records which feats are on that list. The martial flexibility picker also grew the same hide ineligible toggle as the main feat picker, so you only scroll past feats you can actually borrow.",
  },
  {
    id: "2026-08-04-caster-feat-checks",
    date: "2026-08-04",
    title: "Feats that need spellcasting now check for it",
    note: "Arcane Strike and its kin used to wave a soft warning and let anyone take them. A feat whose requirement is the ability to cast arcane or divine spells now checks your classes for real: a wizard qualifies for Arcane Strike, a brawler does not, and a cleric passes Warrior Priest but not False Focus. Twenty eight feats picked up the check. One edge to know: casting through a spell like ability technically qualifies you too, and the sheet does not model those, so a build that leans on one will see these feats locked.",
  },
  {
    id: "2026-08-04-gear-shelves",
    date: "2026-08-04",
    title: "Your backpack is no longer filed next to your holy avenger",
    note: "The gear list now shelves itself: armor and shields, potions and consumables, magic items, adventuring gear, and everything else each sit under their own header instead of one long pile in the order you bought things. Items worn on a body slot carry a small badge naming it, and equipping two belts, or a third ring, turns the badges red to say something has to give. It never stops you: house rules are house rules.",
  },
  {
    id: "2026-08-04-dr-bypass",
    date: "2026-08-04",
    title: "Your attacks now say what they punch through",
    note: "Every weapon on the sheet lists the damage reduction it gets past, so nobody has to remember the table mid fight. A cold iron sword says cold iron, a +3 weapon says cold iron, silver and magic, and a holy one says good. Tap a tag to see where it comes from, and whether it beats hardness too. A monk's fists pick up magic, then cold iron and silver, then lawful, then adamantine as ki strike improves, and they say when it depends on having ki left. A brawler's strike does the same on its own schedule, with a new picker for the alignment you choose at 12th level. Axiomatic joined the weapon enchantment list to round out the four alignment brands.",
  },
  {
    id: "2026-08-04-masterwork-acp",
    date: "2026-08-04",
    title: "Masterwork and magic armor now lighten the check penalty",
    note: "If your armor is masterwork, or magical, which always means masterwork, its armor check penalty is now one point lighter, exactly as the rules say, and it never turns into a bonus. Enter the listed penalty from the book and the sheet handles the discount, whether you picked the armor from the catalog or typed it in by hand. Mithral already includes the masterwork break in its own reduction, so it is not counted twice. Skill checks and the penalty for wearing armor you are not proficient with both use the corrected number.",
  },
  {
    id: "2026-08-04-martial-flexibility",
    date: "2026-08-04",
    title: "Martial flexibility is a real feat picker now",
    note: "Borrowing a feat with martial flexibility used to mean one long dropdown of names. It opens a real picker now: search the combat feat list, read a one line summary of what each feat does, and see its requirements checked against your character as they stand right now, buffs included. A feat you do not qualify for shows as locked with the reason a tap away, and a requirement written only in prose warns instead of blocking, the same way the builder treats it.",
  },
  {
    id: "2026-08-04-table-comforts",
    date: "2026-08-04",
    title: "Scroll to top, smoother scrolling, and home screen installs",
    note: "A round of table comforts from a first session of play. Long pages grew a scroll to top button, and scrolling on a tablet should feel smoother. The armor form now has you pick the armor first and its magic special abilities after, so the enchantment list no longer reads like the armor list. Number fields let you clear them and type a new value instead of snapping back to zero. On an iPad you can add Ledgermain to your home screen and it opens in its own window, with a proper icon at last, in the browser tab too. The gear catalog also picked up the goblin fishing lure.",
  },
  {
    id: "2026-08-04-archetypes",
    date: "2026-08-04",
    title: "Archetypes: pick one and the sheet knows the trade",
    note: "Every published archetype is now in the builder, right under the class it modifies. Pick one and the sheet understands the trade: the base features it removes are struck through with the replacement named beside them, and the archetype's own features slot into the same level by level Class Features list as everything else. Changes to the class chassis itself, a swapped patron or altered proficiencies, gather under Baseline changes instead of pretending to be a level. Two archetypes that trade away the same feature refuse to combine, and one that eats a hex or talent slot counts against that budget. Some archetype features move numbers on your sheet by themselves; a number that was read out of the rules text by machine wears an extracted tag so you can tell it from one checked by hand. The Play tab panel and the printed sheet carry the same features.",
  },
  {
    id: "2026-08-03-unarmed-strikes",
    date: "2026-08-03",
    title: "Monks and brawlers can add their fists",
    note: "There was no unarmed strike to pick, so punching meant hand building a weapon entry and guessing at it. The weapon list offers one now, already carrying your damage die for your class level and your size, and it never takes the not proficient penalty the way a hand built entry did. Add it and it behaves like any other weapon: saved rolls, damage, and the Weapon Focus and Weapon Specialization pickers all see it. When you level and the die grows, the entry offers to update itself. Brawlers also get their die and their flurry spelled out in Class Features, and a saved roll set to two weapon fighting now knows a brawler flurries with Two-Weapon Fighting, adds Improved at 8th and Greater at 15th, and keeps full Strength on the off hand.",
  },
  {
    id: "2026-08-03-herolab-import",
    date: "2026-08-03",
    title: "Import a character straight from a Hero Lab portfolio",
    note: "Settings will take a Hero Lab classic .por file now, the one Hero Lab actually saves, so there is no separate export step and nothing to retype. Race, class and level, scores, ranks, chosen feats, languages, coin, and gear all come across, and worn armor arrives as armor, so your AC is a real number. Live state comes too: the hit points you are on, and uses you have spent out of pools like a brawler's martial flexibility. Feats Hero Lab handed you for free are left out, since this sheet grants those itself and taking them again would spend feat slots twice. Anything it could not place is listed for you afterwards rather than dropped or guessed at.",
  },
  {
    id: "2026-08-03-class-feature-dcs",
    date: "2026-08-03",
    title: "Save DCs are the actual number, and the panel is readable",
    note: 'A hex that told you its DC was "10 + 1/2 witch level + Int mod" was making you do arithmetic at the table for a number the sheet already knows. Those read as a real DC now, wherever they appear: hexes, rage powers, cruelties, ninja tricks, rogue and slayer and investigator talents, revelations, bloodline powers. They follow your final Intelligence, so a headband moves them. The Play tab panel that lists all of this was also one wall of grey text: every feature is its own block now, with its name on top, its summary under it, and its save and duration reminders set apart, and the group you are reading stays labelled as you scroll.',
  },
  {
    id: "2026-08-03-class-features-in-play",
    date: "2026-08-03",
    title: "Your class picks are on the Play tab now",
    note: "Hexes, rage powers, revelations, arcana, exploits, discoveries, talents: everything you chose in the builder lived only in the builder, so a witch at the table could not look up what her own hexes did. Play has a Class Features panel now. It is searchable and grouped by kind, so your hexes sit together and a Major Hex reads as one, and each entry carries its save DC, its duration, and how it activates alongside its full rules text.",
  },
  {
    id: "2026-08-03-witch-patrons",
    date: "2026-08-03",
    title: "Witch patrons are browsable, and most now list their spells",
    note: "Picking a patron meant scrolling a dropdown of 61 names with nothing to compare. It is a searchable list now, split into the published basic and unique groups. Bonus spells read in the order you unlock them rather than alphabetically, and 52 patrons now show a real level by level spell list instead of prose, up from 17. The nine unique patrons are not spell lists at all: they grant a hex, come with a drawback, and limit which themes you can take, so the picker lays that out instead of inventing a progression. Wisdom's 12th level spell was also wrong, and is now Globe of Invulnerability.",
  },
  {
    id: "2026-08-03-witch-hexes",
    date: "2026-08-03",
    title: "Witch hexes stop looking broken",
    note: "Almost every hex carried a warning triangle, because its save DC and duration were being shown as though something were wrong. Those are plain reference notes now, and the triangle is left for the one thing that is actually a problem: a hex above your level. The hex save DC sits at the top of the panel where you can find it mid session, and Cauldron no longer explains our own limitations at you. Flight's Swim bonus also applies itself now, joining Iceplant as the only hexes that move numbers on their own.",
  },
  {
    id: "2026-08-03-familiar-species",
    date: "2026-08-03",
    title: "Twelve more familiars, and a picker that shows them",
    note: 'The familiar list stopped at the eleven Core Rulebook animals, chosen from a dropdown that told you nothing. Compsognathus, fox, king crab, octopus, osprey, pig, greensting scorpion, scarlet spider, house centipede, thrush, turtle and rabbit join them, and the picker now shows each one\'s size, speeds, senses, natural attacks and the bonus it gives you, so you can compare before you commit. A new familiar is also named for its species instead of being called "Familiar".',
  },
  {
    id: "2026-08-03-languages",
    date: "2026-08-03",
    title: "Languages know what your race can take",
    note: "Bonus languages were an empty text box. There is a proper list behind it now: Common, the racial tongues, the planar and exotic languages, and the regional ones, with your own race's options offered as chips you can tap. A dwarf reads as speaking Common and Dwarven automatically, with Giant, Gnome, Goblin, Orc, Terran and Undercommon on offer. You can still type anything you like, including a language nobody published, and Druidic is left out because you cannot pick it.",
  },
  {
    id: "2026-08-03-thrown-attacks",
    date: "2026-08-03",
    title: "Thrown weapon bonuses reach thrown weapons",
    note: "A bonus to thrown weapon attacks, like the one Accurate Stance grants, was being dropped entirely, and the sheet described it as a touch attack bonus it was never meant to give. Those bonuses now apply to javelins and other thrown weapons, on both the attack and the damage, and no longer leak onto bows and crossbows that never earned them. A dagger you carry as a melee weapon is unaffected: add it a second time as a ranged weapon to model throwing it.",
  },
  {
    id: "2026-08-03-damage-formula-display",
    date: "2026-08-03",
    title: "Damage that showed its own formula now shows dice",
    note: 'A handful of spells printed raw source in place of their damage: Ghost Whip read "sizeRoll(1, 3, @size)" where it should read 1d3, and Coin Shot and Clenched Fist had a stray label hanging off their bonus. They now read as ordinary dice, and anything still unresolvable is left out rather than shown as source. A wizard of the Wood elemental school can also open Resources again: Splintered Spear\'s damage broke the panel, and now reads as its 1d6 plus the enhancement bonus it gains every six levels.',
  },
  {
    id: "2026-08-02-control-collisions",
    date: "2026-08-02",
    title: "Controls stop landing on each other",
    note: "In Firefox and Safari, a buff's duration unit picker and the Remove button next to it were drawing on top of one another. On a phone, a prepared spell's buttons took the whole row and crushed the spell name and its reminder chips into a sliver that spilled out underneath them, and a cleric's subdomain picker hung off the edge of its row. Those rows now give the name and its chips the full width and let the buttons sit below.",
  },
  {
    id: "2026-08-02-ability-type-tags",
    date: "2026-08-02",
    title: "Class features show Ex, Su, and Sp",
    note: "Granted class features now carry their printed tag: extraordinary, supernatural, or spell-like. It sits next to the feature name in the builder, next to the pool name under Resources so a monk's Ki Pool is marked where you actually spend it, and on the printed sheet. Tap a tag for what it means at the table: an extraordinary ability keeps working in an antimagic field, a supernatural one stops, and a spell-like one provokes and can be counterspelled or dispelled. Features the source never tagged show nothing rather than a guess.",
  },
  {
    id: "2026-08-02-racial-trait-categories",
    date: "2026-08-02",
    title: "Alternate racial traits are grouped",
    note: "The alternate racial trait list was one long run of entries. It now splits into the published categories: Defense, Feat and Skill, Magical, Movement, Offense, Senses, Weakness, and Other. Sections collapse, and searching still looks across all of them at once. Entries the source left untagged sit together under Uncategorized rather than being filed under a guess.",
  },
  {
    id: "2026-08-02-gear-rules-reminders",
    date: "2026-08-02",
    title: "Gear shows its situational reminders",
    note: "Some gear carries a rules note instead of a flat bonus, and those notes were not shown anywhere. Equipped items now display them on the gear row and in the item picker: the cold-weather outfit's bonus against cold, a pickpocket's outfit for concealing a small object, the Robe of the Archmagi for getting through spell resistance. They stay reminders you apply yourself, since each one depends on the situation. An item that repeats the same note across several stats now shows it once.",
  },
  {
    id: "2026-08-02-early-bonus-spells",
    date: "2026-08-02",
    title: "Early bonus spells option",
    note: "Settings has a new optional rule under Variants & House Rules: early access to bonus spells from a high casting ability, either capped at 2nd level spells or opened up for every spell level. Settings is also reorganized, with these optional and house rules split out from the everyday gameplay modes.",
  },
  {
    id: "2026-08-02-subdomain-power-uses",
    date: "2026-08-02",
    title: "Subdomain powers track their uses per day",
    note: "A subdomain's granted powers arrived on the sheet with their rules text but no daily count, so a Deception cleric's Sudden Shift showed up under class features and never under Resources. 111 subdomain powers now come with their printed cap and a tracker you can spend down: Sudden Shift at 3 plus your Wisdom modifier, Catastrophe's Deadly Weather for rounds equal to your cleric level, and the ones that start at 8th level and grow, like Blood's Wounding Blade. Powers that are always on, Self-Realization's Perfected Form among them, correctly get no counter.",
  },
  {
    id: "2026-08-02-focused-schools",
    date: "2026-08-02",
    title: "Focused arcane schools",
    note: "A wizard who narrows their school to a focused school (Admixture instead of plain Evocation, Teleportation instead of plain Conjuration, and the rest) can now record it. Pick the base school as usual and the focused option appears under it: the sheet swaps in the focused school's powers for the one or two they replace and keeps everything else, spell slots, opposition schools, and unswapped powers included. All 22 published focused schools are in.",
  },
  {
    id: "2026-08-02-wildblooded-bloodlines",
    date: "2026-08-02",
    title: "Wildblooded sorcerer bloodlines",
    note: "A wildblooded sorcerer can now pick their mutated bloodline: Sage under Arcane, Empyreal under Celestial, and the other 22. The sheet follows the printed rule: the mutation's arcana, its swapped powers at the levels they arrive, and the normal bloodline's bonus spells, bonus feats, and class skill for everything it leaves alone. Picking one without the wildblooded archetype gets a soft warning, never a block.",
  },
  {
    id: "2026-08-02-inquisitions",
    date: "2026-08-02",
    title: "Inquisitions for inquisitors",
    note: "An inquisitor may take an inquisition instead of a domain, and the domain picker now offers that choice: all 39 published inquisitions, searchable, each with its granted powers arriving at the printed levels on your class features list. As the rules say, an inquisition grants powers and no domain spell slots. Picking one clears the domain and the other way round, since you get one or the other.",
  },
  {
    id: "2026-08-02-warpriest-blessings",
    date: "2026-08-02",
    title: "Warpriest blessings",
    note: "A warpriest now picks their two blessings on the Classes tab: the full published list of 42, each granting its minor power at 1st level and its major power at 10th. Both show their rules text on your class features list at the right level. The picker nudges you toward blessings your deity's own entry names, but that is a hint, not a block, so a homebrew deity works fine.",
  },
  {
    id: "2026-08-02-druid-domain-powers",
    date: "2026-08-02",
    title: "Druid domains grant their powers",
    note: "A druid with a nature bond domain already got its spell slots, but the granted powers never reached the sheet. All 25 animal and terrain domains now grant their powers at the printed levels: a Wolf druid sees Improved Trip land as a real bonus feat and Pack Tactics arrive at 8th, a Jungle druid gets Brachiation and Trap Sense, and so on across roughly 50 powers.",
  },
  {
    id: "2026-08-02-domain-power-fixes",
    date: "2026-08-02",
    title: "Missing domain powers restored",
    note: "Three small domain gaps are filled. The Destruction domain now grants Destructive Aura at 8th level, which the data had always dropped. The Glory domain's boost to channeled energy against undead now shows as a granted power. And a handful of abilities that scale by level, like the Aquatic bloodrager bloodline's Watersense, show their full text instead of a bare name.",
  },
  {
    id: "2026-08-01-subdomain-powers",
    date: "2026-08-01",
    title: "Subdomains grant their own powers",
    note: "Picking a subdomain used to leave you with the parent domain's granted powers: a Deception cleric got Copycat, which Deception replaces, and Sudden Shift appeared nowhere. Every subdomain now grants what it actually grants, with the power it replaces gone and the ones it leaves alone kept. That is 125 subdomains, each with its rules text and its level. Bonuses that come from the domain's opening line rather than a named power, Travel's extra 10 feet of speed and the free feat from Darkness and Rune, now carry over to a subdomain too, unless the subdomain is one that trades them away.",
  },
  {
    id: "2026-08-01-deity-favored-weapon",
    date: "2026-08-01",
    title: "Name your deity's favored weapon",
    note: "Clerics, inquisitors, and warpriests are proficient with their deity's favored weapon whatever else their class covers, but nothing in the data says which weapon that is. The Classes tab now has a Favored Weapon picker next to your domains: name the weapon and the sheet stops charging you the non-proficient penalty for it. It shows up in your proficiency list crediting the class that granted it. Free choice, so a homebrew deity works as well as a published one.",
  },
  {
    id: "2026-08-01-weapon-armor-special-abilities",
    date: "2026-08-01",
    title: "The full list of weapon and armor special abilities",
    note: "The special ability picker on weapons, armor, and shields used to offer 18 common entries. It is now the full published list, nearly 200 strong and searchable from the weapon and armor forms: Bane, Dueling, Vorpal, Spell Resistance by tier, and the rest, each with its rules text and its cost against the +10 total bonus cap. Abilities priced in flat gold count nothing against that cap, matching the rules. Keen still shortens your threat range on its own; the others carry their text for you to apply at the table.",
  },
  {
    id: "2026-08-01-magic-item-catalog",
    date: "2026-08-01",
    title: "The whole magic item catalog is in the gear picker",
    note: 'The picker used to offer about 190 magic items. It now browses the full published catalog: roughly 3,800 more wondrous items, rings, rods, staves, artifacts, and named magic weapons and armor, each with its rules text, price, weight, slot, and caster level. Boots of the Cat, which someone asked for, is among them. Items the sheet actually adds up are marked with an "M". The rest are there to find and record, with their effect applied at the table.',
  },
  {
    id: "2026-08-01-fractional-bonuses",
    date: "2026-08-01",
    title: "Fractional base bonuses for multiclass builds",
    note: "Settings has a new optional rule from Pathfinder Unchained. Turn it on and your base attack bonus and saves add up their exact per level fractions and round down once at the end, rather than every class rounding down on its own, and a good save's +2 counts once for each save the way a class skill's +3 does. Multiclass characters usually gain attack bonus and lose a doubled up save. Single class characters see no change at all, which is how the rule is meant to work.",
  },
  {
    id: "2026-08-01-applied-save-notes",
    date: "2026-08-01",
    title: "Save reminders that apply themselves say so",
    note: "A buff, trait, or racial trait whose save bonus the sheet already counts used to keep its warning triangle anyway, inviting you to add the same bonus twice. Those reminders now show a checkmark and say they are applied. The triangle only stays where part of the text still needs your judgment, like the saves Death Ward grants against effects that normally allow none. Burst of Glory and Remove Fear also joined the buffs that add their fear bonus for real.",
  },
  {
    id: "2026-08-01-feat-prereqs-locked",
    date: "2026-08-01",
    title: "More feat prerequisites lock for real",
    note: "Around 650 more feats now enforce at least part of their requirements instead of only showing a soft warning: character level minimums and prerequisites that name another feat in plain text are recognized and checked. Just as important, requirements that offer a choice, like Str 13 or Dex 13, or Catch Off-Guard or Throw Anything, no longer demand both halves, which unlocks well over a hundred feats that were wrongly barred. Anything the sheet cannot check for sure still gets the soft warning for you to judge.",
  },
  {
    id: "2026-08-01-feat-catalog-browsing",
    date: "2026-08-01",
    title: "Browse the whole feat catalog",
    note: "The feat and trait pickers used to stop at the first 200 results and ask you to search instead. Now the list keeps loading as you scroll, all 3,500 or so feats deep. Hover help is readable again too: the explanations that pop up inside a picker draw on top of the window instead of hiding behind it.",
  },
  {
    id: "2026-08-01-spell-chips-direct-hit",
    date: "2026-08-01",
    title: "Spell chips read the right line",
    note: "A spell with more than one effect, like Molten Orb, used to pull its splash or follow-up numbers into the damage chip and could claim the wrong casting time. The chip now reads the spell's primary action: Molten Orb shows its 2d6 direct hit and a standard-action cast, Slay Living shows its full failed-save damage, and casting times came right on more than a dozen other multi-action spells.",
  },
  {
    id: "2026-08-01-disabled-condition",
    date: "2026-08-01",
    title: "Disabled joins the condition list",
    note: "The Disabled condition, at exactly 0 hit points or stable and conscious in the negatives, can now be toggled on the sheet like any other condition and looked up on the reference site: a single move or standard action each round, half speed, and a strenuous action costs 1 hit point. The HP bar already called it out when your hit points hit 0; now the condition stands on its own too.",
  },
  {
    id: "2026-08-01-situational-saves",
    date: "2026-08-01",
    title: "Saves know when you are tougher than usual",
    note: "A bonus that only applies against a certain kind of effect used to be text you had to remember. Now it reads as a second number under the save, and the big number stays the one you roll by default so nothing is quietly inflated. Your race counts: a dwarf reads its poison and spell numbers off the Fortitude seal, a halfling its fear number, a gnome its illusion number. So does every fighter's Bravery, monk Still Mind, 34 alternate racial traits, 99 character traits, 21 feats, and buffs like bless, aid, and death ward that used to deliver only their attack half. Companions, eidolons, and phantoms with Devotion show their enchantment number too. Swap a trait away and its number goes with it. Poison lines appear only on Fortitude and fear lines only on Will, because that is the save those effects call for, and a bonus against mind-affecting effects now counts when something tries to charm you. It all prints on the paper sheet.",
  },
  {
    id: "2026-07-31-trait-sweep",
    date: "2026-07-31",
    title: "Every character trait has now been read",
    note: "The roughly 1,550 published traits that used to be text-only got the community feat treatment: each one read and sorted, with every honest always-on effect wired into your sheet. The big win is class skills: traits that say a skill is always a class skill for you now make it one, so the trained bonus lands the moment you put a rank in. A handful more bring flat skill bonuses, fire resistance, damage reduction, or immunity to being dazzled. The five original traits that grant class skills, like Suspicious and Classically Schooled, now grant them for real too. Everything situational stays text for you to judge at the table.",
  },
  {
    id: "2026-07-31-community-feat-sweep",
    date: "2026-07-31",
    title: "Every community feat has now been read",
    note: "All 3,170 or so feats from the wider community pack got the same treatment the core rulebook feats had: each one read and sorted, with every honest always-on number wired into your sheet. Around a hundred now apply themselves, from the whole Skill Focus family and racial skill feats to fire and cold resistance, immunity to electricity, swim and climb speeds, carrying capacity, CMD, and initiative. Feats that say a skill is always a class skill for you now make it one, and nine more feats that extend a daily pool, like Extended Bane and Practiced Tactician, top up the tracker. The rest stay honestly quiet: bonuses that depend on the situation are yours to judge at the table.",
  },
  {
    id: "2026-07-31-extra-pool-feats",
    date: "2026-07-31",
    title: "Eight more Extra feats top up their pools",
    note: "Extra Bane, Extra Bombs, Extra Grit, Extra Inspiration, Extra Martial Flexibility, Extra Mental Focus, Extra Mesmerist Tricks, and Extra Panache now raise the matching pool in the tracker instead of sitting quietly on your feat list, joining Extra Rage and its kin. Take one twice where the book allows it and both count.",
  },
  {
    id: "2026-07-31-sr-check",
    date: "2026-07-31",
    title: "Your spell resistance answers back",
    note: "A Spell Resistance panel joins the tracker whenever anything gives you SR. Type in the attacker's caster level to see what they need on the die, or their check total for the verdict: the effect gets through, or your SR turns it aside. The dice stay at your table, the GM rolls and the sheet compares. The spell's own Spell Resistance line still says whether a check is required at all.",
  },
  {
    id: "2026-07-31-condition-timers",
    date: "2026-07-31",
    title: "Conditions can carry a countdown",
    note: "Every active condition in the tracker gains a Rounds left field. Type the duration your table rolled and advancing the round clock counts it down and clears the condition when it runs out, the same way timed buffs already expire. Leave it blank and the condition stays on until you turn it off yourself.",
  },
  {
    id: "2026-07-31-blast-loadout",
    date: "2026-07-31",
    title: "Infusions reshape your blast lines",
    note: "A Blast Loadout panel in the tracker holds what you are throwing right now: one form infusion, one substance infusion, how long you gathered power, and any metakinesis. Your blast lines rewrite to match. Torrent turns a blast into a 30 ft. line, Extended Range moves it to 120 ft., Kinetic Blade takes it to melee and drops the elemental overflow damage, and every infusion that allows a save prints its DC, Dexterity based for form infusions and Constitution based for substance ones. The burn cost adds itself up for you, with Infusion Specialization coming off the infusions and Gather Power off the whole total, and the line warns you when what you have built costs more burn than you can accept. One press of Bare blast clears the lot.",
  },
  {
    id: "2026-07-30-elemental-defense-live",
    date: "2026-07-30",
    title: "Your elemental defense is a real number",
    note: "A panel under the Burn row divides the burn you're holding between your blasts and your defense, and five of the seven defenses move your sheet when you do. Force Ward stocks temporary hit points, Flesh of Stone gives DR/adamantine, Shroud of Water grants an armor or shield bonus you can reshape, Flesh of Wood enhances natural armor, and Emptiness resists negative energy. Enveloping Winds and Searing Flesh state their current miss chance and damage instead, since neither is a stat a sheet carries. Resting removes the burn and the boost together.",
  },
  {
    id: "2026-07-30-kinetic-blasts-roll",
    date: "2026-07-30",
    title: "Kinetic blasts are real attack lines, and burn hurts",
    note: "Your sheet gains a Kinetic Blasts block: every simple blast you know and every composite you qualify for, each with its attack bonus, damage, range, and whether it targets touch AC. Elemental Overflow rides your live burn, so accepting a point raises the attack and damage on every blast line as you watch. Accepting burn in the tracker also applies its nonlethal damage for you, one point per character level, and giving the burn back heals it. A psychokineticist takes the Wisdom penalty instead, so no damage is applied. Weapon Focus can target kinetic blast once you pick an element.",
  },
  {
    id: "2026-07-30-no-more-silent-buffs",
    date: "2026-07-30",
    title: "Every buff in the catalog now does something",
    note: "The last sixteen reminder-only buffs got real effects. Invisibility and its greater form add their +20 Stealth and see invisibility shows up as a real sense on your sheet. The rest, from the unchained barbarian stances to Way of the Samurai's triple roll, spell out exactly what to apply and when as a reminder on the buff itself. Those reminders also finally render in the tracker, on active buffs and in the add list, so notes on buffs like Danger Ward are no longer hidden.",
  },
  {
    id: "2026-07-30-oracle-charisma-swaps",
    date: "2026-07-30",
    title: "Charisma-swap revelations move your real numbers",
    note: "An oracle with Sidestep Secret or Prophetic Armor now sees Charisma feed AC and all Reflex saves whenever it beats Dexterity, and Nature's Whispers does the same for AC and CMD. Armor's maximum Dex cap and the flat-footed rules follow the swapped ability, and the picker badges all three as modeled. Lore Keeper and Whispered Glimpses stay rules text: their swaps are per skill, which the sheet doesn't model.",
  },
  {
    id: "2026-07-30-skinwalker-change-shape",
    date: "2026-07-30",
    title: "Skinwalkers can toggle their bestial form",
    note: "A new Change Shape panel in the tracker flips your bestial form on and off, and a were-kin heritage's extra +2 while shapechanged applies only while it's on. Natural attacks, speeds, and senses from the form stay yours to apply, and the panel says so. Ragebred and Scaleheart also get their printed ability arrays now, +2 Strength and +2 Constitution, where the catalog text had mistyped them.",
  },
  {
    id: "2026-07-30-race-trait-reminders",
    date: "2026-07-30",
    title: "Your race's situational bonuses show as reminders",
    note: "Standard racial traits that are reminders rather than flat numbers, like a dwarf's stonecunning or a svirfneblin's hatred bonus, now show under your race in the builder. Swap one away with an alternate racial trait and its line strikes through, naming the trait that retired it. Catalog alternates whose replaced traits are all verified to retire on their own now say so in the picker instead of asking you to verify by hand.",
  },
  {
    id: "2026-07-30-eidolon-defenses-live",
    date: "2026-07-30",
    title: "Eidolon subtype defenses are live numbers now",
    note: "An unchained eidolon's subtype resistances, immunities, and DR now compute from its level and show in a Defenses block on its stat panel, instead of sitting inside the grant write-ups. Resistance-evolution grants scale as printed, 5 rising to 15 by 10th, and an immunity earned later cleanly replaces its matching resistance. The genie's choices are real picks too: its chosen energy resistance, the immunity that grows out of it at 12th, and the 8th-level flight, burrow, or gills-and-swim package. And avian and tauric eidolons now start Small as printed, with the two-point Medium upgrade as a toggle, including the avian's 5th-level flight bump when Medium.",
  },
  {
    id: "2026-07-30-flexible-plus-two-trades-away",
    date: "2026-07-30",
    title: "Trait swaps that trade the flexible +2 actually trade it",
    note: "A human, half-elf, or half-orc alternate that replaces the choose-your-own +2, like Dual Talent, Kindred-Raised, or Orc Atavism, now retires that bonus instead of stacking its fixed abilities on top. The builder greys the ability choice out and says which trait took it. Half-elf and half-orc alternates that replace Adaptability, Keen Senses, Elven Immunities, Intimidating, Darkvision, or low-light vision also retire those numbers now.",
  },
  {
    id: "2026-07-30-human-trait-swap-fixes",
    date: "2026-07-30",
    title: "Human and halfling trait swaps trade the right things",
    note: "Eye for Talent now costs the human bonus feat, as printed, instead of wrongly costing a skill rank. Versatile Human works at all now: it grants Dual Talent's two chosen +2s and shrinks the feat and skill budgets to match. And a halfling taking Practicality gives up the Fearless save reminder along with Sure-Footed, matching its published trade.",
  },
  {
    id: "2026-07-30-heritage-ability-arrays-swap-for-real",
    date: "2026-07-30",
    title: "Heritage ability swaps move your real stats",
    note: "Picking a heritage that changes your race's ability modifiers now swaps the numbers instead of showing prose next to the unchanged base array. Covered: all ten tiefling spawn lines and six aasimar blooded lines, the four dhampir vampire-born lines, the eight elemental soul geniekin variants, and the nine skinwalker were-kin (their extra +2 while shapechanged stays yours to apply). A human taking Dual Talent, or any trait that trades away the bonus feat or Skilled, sees the feat and skill budgets shrink to match.",
  },
  {
    id: "2026-07-30-alternate-trait-swaps-enforced-everywhere",
    date: "2026-07-30",
    title: "Alternate racial traits retire what they replace, for every race",
    note: "Picking an alternate racial trait already applied its own bonuses; for most of the rarer races, the standard trait it replaced also kept applying. Fifteen more races now retire the replaced trait's numbers properly, Sylph and Merfolk through Svirfneblin, Wayang, and Vishkanya, closing real double-counts like an Acrobatic vanara keeping Nimble's Stealth bonus or a Healthy svirfneblin keeping Fortunate's +2 on every save. Every race whose standard traits carry sheet numbers is covered; a swap that only trades away a situational reminder line still leaves the reminder showing.",
  },
  {
    id: "2026-07-30-skill-rank-history-check",
    date: "2026-07-30",
    title: "The sheet flags skill ranks no level order could pay for",
    note: "If your skill ranks could not have been bought in any legal level-by-level order, the Skills panel now says so, telling you how many ranks would have to land past a level where the points run out. In practice this catches ranks left behind when a class level is lowered or removed: they used to linger silently, still boosting the skill. It is a soft warning, never a block, since retraining and honest rebuilds can leave odd histories on purpose.",
  },
  {
    id: "2026-07-30-every-shaman-spirit-fully-in",
    date: "2026-07-30",
    title: "Every shaman spirit is fully in, top to bottom",
    note: "All 18 published spirits, from the core eight to Frost, Lore, Mammoth, and the rest, now carry their full write-up: spirit magic spells feed your spell list, each spirit's own hexes are pickable, and the greater and true spirit abilities and 20th-level manifestation show at their levels. Where an ability is a flat, always-on number, the sheet moves it for you: Bones' and Stone's damage reduction, elemental resistances for Flame, Frost, Wind, and Waves, Lore's +10 knowledge bonuses, Mammoth's Strength surge, and a spread of 20th-level immunities.",
  },
  {
    id: "2026-07-30-spell-resistance-lines",
    date: "2026-07-30",
    title: "Spell cards now print their Spell Resistance line",
    note: "Every spell detail now shows whether spell resistance applies, exactly as the book prints it: yes, no, yes (harmless), yes (object), or the odd special case like Cure Light Wounds' yes (harmless); see text. Around 2,200 spells carry the line; the handful the sources leave silent simply show nothing rather than a guess. Before this, no spell showed one at all.",
  },
  {
    id: "2026-07-29-trait-uses-tracked",
    date: "2026-07-29",
    title: "Traits with daily uses get real counters",
    note: "Around 290 published traits meter a benefit, once per day or a few times per day, and the sheet now tracks them. Pick a trait like A Sure Thing or Secrets of the Sphinx and a counter for it appears in the Resources panel, spends by tap, and refills on rest, exactly like grit or ki. The rules notes on those traits also sharpened: a note that says how many uses you have left now shows the live number instead of silently dropping that clause.",
  },
  {
    id: "2026-07-29-weapon-dice-at-every-size",
    date: "2026-07-29",
    title: "Weapon dice scale right at every size",
    note: "Weapon damage dice now follow the official size-change chart exactly, one size category at a time, instead of a simplified one-step shift. The difference shows at the extremes: polymorph into a Tiny, Diminutive, or Fine form and your longsword reads 1d4, 1d3, 1d2 the way the book's chart says, rather than a die too high. Growing past Large is right too, including the printed exceptions: a dagger enlarges to 1d6, not 1d8, because small dice climb slower. This also fixes a stuck die: a 1d10 weapon shrunk below Medium used to stay 1d10 forever, and now correctly reads 1d8.",
  },
  {
    id: "2026-07-29-astral-eidolon-and-subtype-prose",
    date: "2026-07-29",
    title: "Astral eidolons grow right, and subtypes show their book text",
    note: "Two eidolon improvements. An astral eidolon's Strength and Dexterity now climb at the halved rate the book gives it: the summoner's class level is halved when reading the Str/Dex column of the base statistics table, while hit dice, saves, armor, and the evolution pool keep the real level. And every subtype in the picker now shows its full published description alongside the hand-authored mechanics, the same expandable rules text bloodlines and rage powers already show.",
  },
  {
    id: "2026-07-29-reminder-buffs-wake-up",
    date: "2026-07-29",
    title: "A dozen reminder-only buffs start pulling their weight",
    note: "Twelve buffs that were bare duration trackers now carry their real effects. Delay Poison grants poison immunity while it runs, Armor of the Tireless Warrior suppresses fatigue and exhaustion penalties, and a force field makes you immune to critical hits whatever its color, with the per-color temp HP and fast healing table right on the buff. The Resiliency judgment and Greater Chaos Totem buffs apply their scaling damage reduction, and the gray and orange veemods grant low-light vision and see in darkness. The three Danger Wards, the Smiting judgment, and the Healing judgment explain their reroll, DR bypass, and fast healing on the exact rolls they touch. Inquisitors also get a straight fix: the Healing judgment had been missing from the judgment list, and now all eight core judgments are there.",
  },
  {
    id: "2026-07-29-nonlethal-immunity-and-telepathy",
    date: "2026-07-29",
    title: "Nonlethal immunity means it, and telepathy joins your senses",
    note: "Two abilities that only existed as rules text now land on the sheet. Immunity to nonlethal damage, granted by the Undead and Ghoul sorcerer capstones, the Undead and Black Blood bloodrager capstones, and an alchemist's Mummification, now lists with your other immunities, and the HP tracker disables the nonlethal damage button while you have it (anything already accumulated can still be healed or cleared). And telepathy shows in the senses row with its range: 60 feet from the Abyssal sorcerer capstone, and 100 feet from the Outer Rifts oracle's Telepathy revelation once you hit 11th level, just as written.",
  },
  {
    id: "2026-07-29-every-bloodline-hand-authored",
    date: "2026-07-29",
    title: "Every sorcerer and bloodrager bloodline, fully powered",
    note: 'All 51 published sorcerer bloodlines and all 24 bloodrager bloodlines now work like the core ones instead of showing raw rules text. Pick any of them and your sheet grants each bloodline power at the right level, restricts your Bloodline Feat choices to the bloodline\'s own list, and adds your bonus spells known on schedule, including hand-transcribed spell lists for eleven splatbook bloodlines that never carried them: Astral, Deep Earth, Naga, Phoenix, Possessed, Salamander, Scorpion, Shapechanger, Solar, Unicorn, and Vestige. Powers with unconditional numbers (capstone immunities and damage reduction, natural armor, energy resistances, uses-per-day pools) apply themselves; anything conditional shows on the power as text to apply at the table. The "M" badge in both bloodline pickers sharpened to match: it now marks the bloodlines that move real numbers or track uses on your sheet, since simply being written up no longer sets one apart.',
  },
  {
    id: "2026-07-29-capstone-immunities-and-new-eidolon-forms",
    date: "2026-07-29",
    title: "Capstone immunities land, and eidolons get three more base forms",
    note: "A sweep of every class subsystem against the published text wired up what was honestly wireable. All the sorcerer and bloodrager bloodline capstones now grant their immunities, senses, and damage reduction for real: fire immunity from Power of the Pit, paralysis and sleep immunity from Power of Wyrms alongside its blindsense, crit and sneak attack immunity from both Elemental Bodies, and immunity to your chosen energy type keyed to the dragon type or element you picked. Psychics gained six live discipline powers, including Psychic Safeguard's spell resistance and Self-Perfection's Wisdom to AC. The Aquatic, Avian, and Tauric eidolon base forms are now buildable. Smaller catches: the kineticist's Clockwork Heart applies its initiative and Reflex feat benefits, the Champion medium spirit boosts Climb and Swim, Flame shamans get Cinder Dance's speed, shifter Bats gain their 15th-level blindsense and Wolverines their bonus hit points, and eight shaman hex write-ups that described the wrong mechanics were corrected against the book.",
  },
  {
    id: "2026-07-29-chosen-elements-oracles-and-bloodlines",
    date: "2026-07-29",
    title: "Oracles and bloodlines apply their chosen element",
    note: "The choose-your-energy-type picks that rage powers got now reach oracles and the two elemental bloodlines. A Dragon mystery oracle picks their associated element right on the mystery, and Draconic Resistance scales that resistance 5, 10, 20 alongside its natural armor. Defy Elements applies its chosen resistance (sonic included), and Elemental Aegis grants its 13th-level boon by element: Reflex saves for air, CMD for earth, fire resistance for fire, Swim for water. Sorcerers and bloodragers with the Draconic or Elemental bloodline get more from the dragon type or element they already chose: energy resistance matched to it, and Elemental Movement's fly, burrow, swim, or faster land speed, all live on the sheet. The bloodrager's Draconic Resistance natural armor also now climbs to +2 at 8th and +4 at 16th the way the book says, instead of sitting at +1 forever.",
  },
  {
    id: "2026-07-29-kineticist-all-seven-elements",
    date: "2026-07-29",
    title: "Kineticists get all seven elements, fully written up",
    note: "Void and wood join the five core elements as pickable elemental focuses, each with its own blasts (gravity or negative; wood or positive), elemental defense, basic utility talent, and class skills. And the wild-talent catalog is now complete: every published infusion and utility talent across all seven elements has a proper write-up with its level gate and burn cost, around 160 more than before, along with all twenty-two composite blasts, including the void and wood admixtures and the seasonal blasts. Spark of Life's description also got corrected: it summons an elemental, it never granted temporary hit points.",
  },
  {
    id: "2026-07-29-chosen-energy-and-stacking-darkvision",
    date: "2026-07-29",
    title: "Pick your energy type, and darkvision that really adds up",
    note: "Rage powers that make you choose an energy type when you take them now let you make that choice right in the picker, and they apply it. Energy Resistance scales with your level in the type you picked, Draconic Blood adds its resistance 5 alongside its natural armor, Elemental Blood reads the element you chose at its Lesser pick, and Greater Elemental Blood grants the matching movement (burrow, swim, fly, or faster land speed) the moment you rage. Separately, abilities worded \"gain darkvision, or extend it if you already have it\" now truly extend it: a dwarf raging with Lesser Moon Totem sees 90 feet, not 60, the shifter's Wolf aspect lengthens scent you already have, and the shadow oracle's Pierce the Shadows adds its full 60 feet on top of any racial darkvision.",
  },
  {
    id: "2026-07-29-shapechanger-race-trait-swaps",
    date: "2026-07-29",
    title: "Skinwalkers, changelings, and gathlains trade traits honestly",
    note: "The three trickiest races caught up with the other twenty-five: picking an alternate racial trait now retires the standard bonus it replaces. A skinwalker heritage's alternate skill bonuses replace Animal-Minded's Handle Animal bonus instead of stacking on it, a changeling's Witchborn really swaps +2 Wisdom for +2 Intelligence, and a gathlain trading its natural armor loses it. Bigger still: a changeling's hag heritage, Brine May through Waker May, now applies its full ability-score spread for real, replacing the standard one, and the gathlain's Tree-Born drops the Constitution penalty and slows its speeds just like the book says.",
  },
  {
    id: "2026-07-29-every-pick-list-written-up",
    date: "2026-07-29",
    title: "Every class pick list is now fully written up",
    note: "The last seven pick lists caught up with the big ones: rage powers, ninja tricks, investigator talents, vigilante talents (both the social and vigilante pools), monk ki powers, mesmerist tricks, and bold stares now have every published entry written up with its level requirement flagged. No more raw rules text for the later-splatbook picks. Rage powers got the deepest treatment: twenty-five more of them now move real numbers the moment you rage, including the totem resistance and damage-reduction lines, Beast Totem's scaling natural armor, darkvision and scent grants, and the Linnorm death curses' extra melee damage. Look for the \"M\" badge in any picker to spot the entries that apply themselves.",
  },
  {
    id: "2026-07-29-more-race-trait-swaps",
    date: "2026-07-29",
    title: "Eleven more races trade traits honestly",
    note: "Alternate racial traits now retire what they replace for ifrits, oreads, undines, drow, kobolds, duergar, hobgoblins, goblins, fetchlings, catfolk, and vine leshies, the same treatment the core and featured races already had. A drow alternate that trades away Keen Senses really removes the Perception bonus, a kobold that swaps its scales loses the natural armor, and a duergar alternate that gives up the dwarven immunities drops them from the sheet. As before, a heritage's different ability-score spread stays yours to apply by hand, with one exception: the vine leshy's Agile trait swaps its full spread for real.",
  },
  {
    id: "2026-07-28-featured-race-trait-swaps",
    date: "2026-07-28",
    title: "Featured-race trait swaps now trade honestly",
    note: "For aasimars, tieflings, dhampirs, kitsune, ratfolk, and tengu, picking an alternate racial trait now retires the standard bonus it replaces instead of stacking on top. An aasimar taking Deathless Spirit loses Celestial Resistance's acid, cold, and electricity 5; a tiefling's Scaled Skin trades the fiendish resistances for its natural armor; Keen Kitsune really swaps +2 Charisma for +2 Intelligence; and a heritage's alternate skill bonuses replace the standard pair rather than doubling up. One part stays yours to apply by hand: a heritage that changes your ability-score spread still describes that swap as text.",
  },
  {
    id: "2026-07-28-every-pick-list-written-up",
    date: "2026-07-28",
    title: "The five big pick lists, fully written up",
    note: "Witch hexes, magus arcana, arcanist exploits, rogue talents, and alchemist discoveries are now complete: every published entry, over 600 across the five lists, has a proper write-up, a level requirement that's flagged when you're not there yet, and notes on prerequisites and activation costs, instead of a wall of raw rules text. Along the way, everything that could honestly be automatic became so. A dozen rogue talents that grant a specific feat (Finesse Rogue's Weapon Finesse, Strong Impression's Intimidating Prowess, Unbalancing Trick's Improved Trip, and friends) now add it to your sheet themselves, and Stony Skin's DR 2/adamantine meets incoming damage for real. For alchemists, Awakened Intellect raises your Intelligence, Chameleon and Webbed Extremities boost Stealth and Swim, Pheromones lifts your social skills, and Mummification's cold, paralysis, and sleep immunities all land on the sheet. The witch's Iceplant hex applies its natural armor too. Rogue talents also now say which list they belong to: chained, unchained, or both.",
  },
  {
    id: "2026-07-28-more-picks-move-real-numbers",
    date: "2026-07-28",
    title: "More of your picks move real numbers",
    note: "A sweep through the pick lists promoted everything that honestly could be automatic. Eleven oracle revelations now compute live: Iron Constitution's Fortitude bonus, the elemental- and spellscar-resistance lines, the energy-skin revelations up through their 17th-level immunity, Face in the Crowd's Stealth bonus, Pierce the Veil's darkvision. The ninja's Wall Climber and the vigilante's Rooftop Infiltrator grant their climb speeds for real, and that fix ran deeper: rogue, ninja, investigator, and vigilante talent picks weren't feeding the sheet's numbers at all, so the vigilante's Shadow's Speed and Monkey's Paws now actually do what their badge claimed. The sweep also corrected four rage-power write-ups that didn't match the printed rules, and removed one, \"Sixth Sense\", that turns out not to exist in any book. If your barbarian had it picked, that slot is free again.",
  },
  {
    id: "2026-07-28-every-eidolon-subtype",
    date: "2026-07-28",
    title: "Eidolons of every stripe",
    note: "Thirteen more eidolon subtypes join the builder: Aberrant, Aeon, Ancestor, Astral, Deepwater, Genie, Kami, Kyton, Radiant, Shadow, Storykin, Twinned, and Void, each with its forms, attacks, and level-by-level grants spelled out, and the free evolutions and pool bonuses applied for real. The Aberrant base form is here too (bite, tentacle, and a swim speed), and you can finally make your eidolon Small: its dice step down, its size modifiers land on AC and attacks, and its Fly and Stealth pick up the bonuses, all computed.",
  },
  {
    id: "2026-07-28-every-oracle-mystery",
    date: "2026-07-28",
    title: "Every oracle mystery, revelations and all",
    note: "Oracles were the class with the biggest hole: only the eleven core mysteries knew their class skills, bonus spells, and revelations. All thirty-four published mysteries are in now. Pick Dark Tapestry or Reaper or Whimsy and your class skills appear, your bonus spells arrive on schedule, and the full revelation list is right there to choose from, level requirements and all. That's two hundred twenty-six newly written-up revelations. What each revelation does when you use it is still applied at the table, same as before.",
  },
  {
    id: "2026-07-28-class-immunities-and-talent-catalogs",
    date: "2026-07-28",
    title: "Your class's immunities show up on their own",
    note: "A paladin who hits 3rd level now sees disease and fear immunity on the sheet without typing anything, and trying to mark her shaken gets flagged. Same for the monk's Purity of Body and Diamond Body, the druid's Venom Immunity and Timeless Body, the alchemist's and investigator's Poison Immunity, the antipaladin's Plague Bringer, and the paladin's charm and compulsion auras when they arrive. Alongside that, the shaman's general hexes and the slayer's full talent list got real write-ups in their pickers, every entry summarized with its level gate and table notes. A slayer in full plate with Armored Marauder watches the armor check penalty actually shrink.",
  },
  {
    id: "2026-07-27-the-app-keeps-your-place",
    date: "2026-07-27",
    title: "Reload and you're still where you were",
    note: "Refreshing used to drop you back at the top of the Build tab no matter what you had open. The tab and the section you were reading are now part of the address, so a reload, a browser that crashed, or a tablet that went to sleep puts you back where you left off. It also means any spot is linkable: copy the address while you're looking at your spells and it opens there. The What's New panel has a copy-link button of its own, for pointing your table at what changed.",
  },
  {
    id: "2026-07-27-reference-site-link",
    date: "2026-07-27",
    title: "The reference library is one click away",
    note: "A Reference link now sits in the top bar and opens the companion lookup site in a new tab, for reading a spell, feat, weapon, armor, item, or condition you don't have on your sheet. Your sheet stays exactly as you left it, buffs and all.",
  },
  {
    id: "2026-07-27-odd-weapon-dice-scale",
    date: "2026-07-27",
    title: "Greataxes and scythes grow when you do",
    note: "Enlarge Person, Reduce Person, and polymorph forms already resized most weapons' damage dice, but a handful of shapes sat out: the greataxe, musket, and lucerne hammer at 1d12, the scythe, estoc, and guisarme at 2d4. Those aren't printed on the size chart, so they now convert to the die the rules say they count as before stepping. An enlarged greataxe reads 3d6. Drop the buff and it reads 1d12 again.",
  },
  {
    id: "2026-07-27-faster-spell-browsing",
    date: "2026-07-27",
    title: "The spell list opens without the wait",
    note: "Opening your spellbook to browse a full class list meant building every spell's stat table and rules text up front, hundreds of them, before the list would show. Searching was even worse! Each spell's write-up is now put together when you open that spell's details, so the list appears straight away and searching keeps up with your typing.",
  },
  {
    id: "2026-07-26-racial-immunities",
    date: "2026-07-26",
    title: "Your race's immunities are on the sheet",
    note: "Elves, half-elves, and drow against magic sleep; duergar against paralysis, phantasms, and poison; androids against disease, sleep, fear, and the rest; a being of Ib against critical hits. These were buried in your race's rules text and now sit with your DR and resistances, and the matching condition chip is marked so you notice before you toggle it. Nothing rolls against them. They're there so you and your GM can see them at a glance.",
  },
  {
    id: "2026-07-26-rage-fatigue-counts-down",
    date: "2026-07-26",
    title: "Rage's hangover counts itself down",
    note: "When a rage ends, the fatigue it leaves now comes with a duration and the round clock clears it: twice the rounds you raged for a barbarian or bloodrager, a flat minute for the unchained barbarian, whose fatigue the sheet previously didn't apply at all. The Conditions panel shows the rounds left on the chip. Ending a rage without ever advancing the clock still leaves the fatigue untimed for you to clear, since the sheet won't guess how long you were raging.",
  },
  {
    id: "2026-07-26-formulas-read-as-numbers",
    date: "2026-07-26",
    title: "Reminders quote your number, not a formula",
    note: 'The last few hundred trait and racial-trait reminders showed a formula where a number belongs, like "You have SR [[5 + @attributes.hd.total]]". They now read as the number for your character, and follow it as you level. Where the formula counted uses per day, which this sheet tracks in its own resource pools instead, the count is left off rather than printed as a wrong zero; the rule still says how often you get it.',
  },
  {
    id: "2026-07-26-armor-bonuses-compete",
    date: "2026-07-26",
    title: "Armor bonuses stop double-counting",
    note: "Mage armor, bracers of armor, a robe of the archmagi, and the armor on your back all grant an armor bonus, and the rules say only the best one counts. The sheet was adding them together. Now they compete, the loser is struck through in the AC breakdown next to whatever beat it, and a magic armor's enhancement bonus steps aside with it. The shield spell and a worn shield settle the same way. If your AC just dropped, this is why: it was too high before.",
  },
  {
    id: "2026-07-26-readable-rules-text",
    date: "2026-07-26",
    title: "Rules text reads like rules text",
    note: 'Traits, racial traits, gear, and buffs were showing their reminders with the raw markup they were authored in, like "+[[1]] Trait bonus to disable traps", "@Distance[20 ft;dual] below you", "@Condition[dazzled]". Around 2,800 of those now read as plain numbers and words. A couple hundred that depend on your caster level or an ability modifier still show their formula.',
  },
  {
    id: "2026-07-25-combat-math-sweep",
    date: "2026-07-25",
    title: "Combat math fills in its corners",
    note: "CMD now shows a flat-footed value next to the regular one, tower shields apply their −2 attack penalty, the Agile Maneuvers feat swaps Dex into your CMB, and growing or shrinking (enlarge person, polymorph forms) steps your weapon's damage dice up or down the official chart. Kineticist elements, cavalier orders, and oracle mysteries now grant their bonus class skills for real, and Elemental Overflow's bonus cap is fixed.",
  },
  {
    id: "2026-07-25-casting-table-rules",
    date: "2026-07-25",
    title: "Spellcasting knows its table rules",
    note: "Clerics and druids can cast a prepared spell as a cure, inflict, or summon nature's ally on the fly, with the slot bookkeeping handled. Shamans get their spirit-magic casts tracked as their own pool, oracles' free cure or inflict spells land on the known list automatically, and occultists see a warning when they know more spells than their implements allow. Every spell also shows the full concentration-DC reference (damage, grapples, motion, weather) next to the defensive-casting DC.",
  },
  {
    id: "2026-07-25-rage-items-hero-points",
    date: "2026-07-25",
    title: "Rage hangovers, working bracers, hero points",
    note: "Ending a barbarian's rage or a bloodrager's bloodrage now applies the fatigue the rules demand (and knows who's exempt). Bracers of Armor actually grant their armor bonus, casting false life offers a one-click buff, and hero points gain automatically on level-up with a spend-options reference on the panel.",
  },
  {
    id: "2026-07-25-support-links",
    date: "2026-07-25",
    title: "A tip jar, if you're so inclined",
    note: "Settings has a new Support panel with a Ko-fi and a GitHub Sponsors link. Ledgermain stays free and unpaywalled: no feature, class, or character slot will ever sit behind a donation. It's a coffee fund, nothing more.",
  },
  {
    id: "2026-07-25-settings-nav",
    date: "2026-07-25",
    title: "Settings has a jump menu",
    note: "Settings now carries the same section rail as Build and Play, with its panels sorted into Display, Rules, Overrides, Data, About, and Danger Zone. Finding the encumbrance toggle or the export button no longer means scrolling the whole page looking for it.",
  },
  {
    id: "2026-07-25-solar-mystery",
    date: "2026-07-25",
    title: "The Solar mystery is fully in",
    note: "Solar oracles now get their bonus spells at the right levels and their ten revelations in the revelation picker, alongside the Advanced Player's Guide mysteries. Sun Stride and Sungazer show as available from 5th level, the way the book gates them.",
  },
  {
    id: "2026-07-25-inquisitor-domains",
    date: "2026-07-25",
    title: "Inquisitors can pick a domain",
    note: "The Domains picker now opens for inquisitors, who choose one and gain its granted powers scaled off inquisitor level. You don't get the domain's bonus spell slots; those stay a cleric thing, same as the book.",
  },
  {
    id: "2026-07-25-soul-warden-casting",
    date: "2026-07-25",
    title: "Soul Warden advances your spellcasting",
    note: "Levels in Soul Warden now carry your existing spellcasting class forward, so a cleric who takes the prestige class keeps gaining spell levels instead of stalling. Pick which class each level feeds in the Casting Advancement panel.",
  },
  {
    id: "2026-07-24-damage-types",
    date: "2026-07-24",
    title: "Damage knows its type",
    note: 'Enter a hit as "12 fire" or "9 slashing" and the sheet applies your damage reduction, energy resistance, and immunities before anything reaches your hit points, spending ablative pools like stoneskin or protection from energy first. The Play sidebar shows what\'s soaking and how much is left.',
  },
  {
    id: "2026-07-24-race-senses",
    date: "2026-07-24",
    title: "Racial senses on the sheet",
    note: "Darkvision, low-light vision, scent, and the rest now come through from your race as real entries on the sheet instead of sitting in the race's rules text.",
  },
  {
    id: "2026-07-24-rules-corrections",
    date: "2026-07-24",
    title: "A pass of rules corrections",
    note: "A sweep through the rules engine turned up and fixed a batch of math that was off: caster level in some multiclass cases, the flurry of blows attack line, which natural attacks count as primary, spell resistance, carrying capacity, and a skill-rank budget that moved when Intelligence was temporarily buffed.",
  },
  {
    id: "2026-07-23-heritage-traits",
    date: "2026-07-23",
    title: "Alternate racial traits and heritages",
    note: "The published alternate racial traits are in the race picker, including the ones that ask you to choose an option, and they swap out the trait they replace rather than stacking on top of it.",
  },
  {
    id: "2026-07-23-wizard-schools",
    date: "2026-07-23",
    title: "Elemental wizard schools",
    note: "Air, Earth, Fire, and Water schools bring their own spell lists, and opposition schools are tracked against them properly.",
  },
  {
    id: "2026-07-22-druid-nature-bond",
    date: "2026-07-22",
    title: "Druid nature bond domains",
    note: "Take a domain instead of an animal companion and its bonus spell slots show up in your spellbook.",
  },
  {
    id: "2026-07-22-class-catalogs",
    date: "2026-07-22",
    title: "Every published class option is browsable",
    note: 'Rage powers, hexes, magus arcana, rogue/ninja/slayer/vigilante talents, arcanist exploits, investigator talents, discoveries, kineticist wild talents, and the full prestige-class list are all searchable in their pickers. Entries marked "M" move numbers on your sheet; the rest are there for reference.',
  },
  {
    id: "2026-07-22-drawback-trait",
    date: "2026-07-22",
    title: "Third trait from a drawback",
    note: "Take a drawback and the builder opens the extra trait slot it buys you.",
  },
  {
    id: "2026-07-22-two-weapon-fighting",
    date: "2026-07-22",
    title: "Two-weapon fighting is a roll mode",
    note: "Rather than attaching it to a feat, flip two-weapon fighting on for a saved roll and both hands' attack lines come out with the right penalties.",
  },
  {
    id: "2026-07-21-trait-catalog",
    date: "2026-07-21",
    title: "The full character-trait catalog",
    note: "Every published character trait is searchable in the trait picker, with the core set wired up to move numbers.",
  },
  {
    id: "2026-07-20-vtt-roll-copy",
    date: "2026-07-20",
    title: "Copy a roll to your VTT",
    note: "Any saved roll copies to the clipboard as a formula you can paste into a virtual tabletop, with Power Attack and two-weapon penalties already folded in.",
  },
];

const LAST_SEEN_KEY = "pf1-tracker:changelogLastSeen";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * `2026-07-24` -> `24 Jul 2026`. Formatted from the string parts rather than
 * through `Date`, which would shift the day backwards for anyone west of UTC
 * (an ISO date parses as midnight UTC).
 */
export function formatEntryDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const name = MONTH_NAMES[Number(month) - 1];
  if (!name) return iso;
  return `${Number(day)} ${name} ${year}`;
}

/** The id of the newest entry, or `null` when the list is empty. */
export function latestEntryId(entries: readonly ChangelogEntry[] = CHANGELOG): string | null {
  return entries[0]?.id ?? null;
}

/**
 * Whether anything has landed since the reader's high-water mark.
 *
 * A `null` mark means "never recorded" — a first-ever visit — and gets no cue:
 * nothing is *new* to someone who has never seen the app. An unrecognizable
 * mark (an entry that was pruned) counts as unseen, so the cue errs toward
 * showing once and then settling rather than going permanently dark.
 */
export function hasUnseenEntries(
  entries: readonly ChangelogEntry[],
  lastSeen: string | null,
): boolean {
  if (entries.length === 0 || lastSeen == null) return false;
  return entries.findIndex((e) => e.id === lastSeen) !== 0;
}

/** The stored high-water mark, or `null` if none has been written. */
export function readLastSeen(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(id: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, id);
  } catch {
    // Storage unavailable — the cue just won't persist across reloads.
  }
}

/**
 * Read the high-water mark, seeding it to the newest entry on a first-ever
 * visit. Seeding is what keeps a brand-new player from being greeted by a
 * "new" cue over a list they've never not seen; the cost is that the deploy
 * introducing this panel is silent for existing readers too.
 */
export function initChangelogSeen(entries: readonly ChangelogEntry[] = CHANGELOG): string | null {
  const stored = readLastSeen();
  if (stored != null) return stored;
  const latest = latestEntryId(entries);
  if (latest != null) writeLastSeen(latest);
  return latest;
}

/** Record that the reader has been shown the current list. */
export function markChangelogSeen(entries: readonly ChangelogEntry[] = CHANGELOG): void {
  const latest = latestEntryId(entries);
  if (latest != null) writeLastSeen(latest);
}

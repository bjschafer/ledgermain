import { useMemo, useState } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import { setArchetypes } from "../../model/doc.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface ArchetypePickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Archetype selection, free-choice and unbounded (PF1 allows stacking multiple
 * archetypes on one class when their swaps don't conflict — the project's
 * hybrid-prereqs posture leaves that legality check to the player, same as
 * elsewhere). Only classes covered by the vendored dataset (fighter, barbarian,
 * wizard, cleric, sorcerer) show any options.
 */
export function ArchetypePicker({ doc, refData, update }: ArchetypePickerProps) {
	const [query, setQuery] = useState("");
	const chosen = doc.build.archetypes ?? [];

	const byClass = useMemo(() => {
		const groups = new Map<string, { id: string; name: string }[]>();
		for (const a of Object.values(refData.archetypes)) {
			const list = groups.get(a.classTag) ?? [];
			list.push({ id: a.id, name: a.name });
			groups.set(a.classTag, list);
		}
		for (const list of groups.values()) list.sort((a, b) => a.name.localeCompare(b.name));
		return groups;
	}, [refData]);

	const classTags = doc.identity.classes.map((c) => c.tag).filter((tag) => byClass.has(tag));
	if (classTags.length === 0) return null;

	const q = query.trim().toLowerCase();

	function toggle(id: string) {
		const set = new Set(chosen);
		if (set.has(id)) set.delete(id);
		else set.add(id);
		update((d) => setArchetypes(d, [...set]));
	}

	return (
		<div className="subsection archetype-picker">
			<h4 className="tracker-sub">Archetypes</h4>
			<p className="hint">
				Structural swaps only in v1 — no numeric effects from archetype
				features yet. Free-choice; multiple archetypes may be picked even if
				their swaps overlap.
			</p>
			<input
				className="search"
				type="text"
				placeholder="Search archetypes…"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
			{classTags.map((tag) => {
				const options = byClass.get(tag)!;
				const shown = q
					? options.filter((o) => o.name.toLowerCase().includes(q))
					: options;
				if (shown.length === 0) return null;
				const classDef = Object.values(refData.classes).find((c) => c.tag === tag);
				return (
					<div key={tag} className="archetype-class-group">
						<span className="hint">{classDef?.name ?? tag}</span>
						<div className="chips">
							{shown.map((a) => (
								<button
									key={a.id}
									type="button"
									className="chip"
									aria-pressed={chosen.includes(a.id)}
									onClick={() => toggle(a.id)}
								>
									{a.name}
								</button>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

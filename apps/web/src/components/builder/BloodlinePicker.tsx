import { useMemo } from "react";

import { BLOODLINES } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setSorcererBloodline, setSorcererBloodlineVariant } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface BloodlinePickerProps {
	doc: CharacterDoc;
	refData: RefData;
	update: Updater;
}

/**
 * Sorcerer bloodline selection (PF1 grants exactly one, chosen at L1).
 * Free-choice: the vendored data has no sorcerer-heritage mapping, so
 * validation is "soft warning only" per the project's hybrid-prereqs
 * philosophy. Bloodline tags come from `refData.bloodlineSpellLists` (39
 * tags — note "Aberrant" isn't among them, a gap in the upstream Foundry
 * pack; see `@pf1/engine` `bloodlines.ts`'s doc comment).
 *
 * The chosen bloodline grants one bonus spell known per odd sorcerer level
 * starting at 3; the known-list panel merges those in with a "bloodline"
 * badge, and the tracker's Spells panel makes them castable. This picker also
 * sets the choice for bloodline ARCANA + POWERS (issue #34, `@pf1/engine`
 * `BLOODLINES` — hand-authored for the 10 Core Rulebook bloodlines only;
 * the other 29 vendored spell-list tags show no arcana/power block below).
 * `ClassFeaturesList` (elsewhere in the builder) shows the granted powers
 * themselves, tagged "— <Name> Bloodline"; this panel just previews them.
 */
export function BloodlinePicker({ doc, refData, update }: BloodlinePickerProps) {
	const isSorcerer = doc.identity.classes.some((c) => c.tag === "sorcerer");
	const [collapsed, toggleCollapsed] = useCollapsed("subsection:Bloodline", false);

	const bloodlines = useMemo(
		() =>
			Object.keys(refData.bloodlineSpellLists)
				.filter((t) => t.length > 0)
				.sort((a, b) => a.localeCompare(b)),
		[refData],
	);

	const chosen = doc.build.sorcererBloodline ?? "";
	const bloodlineDef = BLOODLINES[chosen];
	const variant = doc.build.sorcererBloodlineVariant ?? "";

	if (!isSorcerer) return null;

	return (
		<div className="subsection bloodline-picker">
			<div
				className="subsection-header"
				onClick={toggleCollapsed}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") toggleCollapsed();
				}}
				aria-expanded={!collapsed}
			>
				<h3>
					Bloodline
					{chosen ? <span className="hint"> · {chosen}</span> : null}
				</h3>
				<span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
			</div>
			{!collapsed && (
				<>
					<p className="hint bloodline-picker-hint">
						Pick one bloodline (PF1 grants one at level 1). It grants one bonus
						spell known per odd sorcerer level (3, 5, 7, …), drawn from that
						bloodline's spell list. Free-choice — no heritage validation.
					</p>
					<select
						className="bloodline-select"
						value={chosen}
						onChange={(e) => update((d) => setSorcererBloodline(d, e.target.value || null))}
					>
						<option value="">— none chosen —</option>
						{bloodlines.map((tag) => (
							<option key={tag} value={tag}>
								{tag}
							</option>
						))}
					</select>

					{bloodlineDef?.variantOptions && (
						<div className="bloodline-variant-picker">
							<label htmlFor="bloodline-variant-select" className="hint">
								{bloodlineDef.variantPrompt ?? "Variant"}
							</label>
							<select
								id="bloodline-variant-select"
								className="bloodline-variant-select"
								value={variant}
								onChange={(e) =>
									update((d) => setSorcererBloodlineVariant(d, e.target.value || null))
								}
							>
								<option value="">— none chosen —</option>
								{bloodlineDef.variantOptions.map((v) => (
									<option key={v.id} value={v.id}>
										{v.label}
									</option>
								))}
							</select>
						</div>
					)}

					{bloodlineDef && (
						<div className="bloodline-preview">
							<div className="bloodline-arcana">
								<span className="hint">Bloodline Arcana</span>
								<p>{bloodlineDef.arcana.summary}</p>
							</div>
							<ul className="bloodline-powers">
								{bloodlineDef.powers.map((p) => (
									<li key={p.id}>
										<span className="cf-level">Lv {p.level}</span>{" "}
										<span className="cf-name">{p.name}</span>
										<p className="hint">{p.summary}</p>
									</li>
								))}
							</ul>
						</div>
					)}
				</>
			)}
		</div>
	);
}

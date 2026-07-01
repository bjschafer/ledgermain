import { useMemo, useState } from "react";

import {
	addClass,
	removeClass,
	setClassLevel,
	setFavoredClass,
	setFavoredClassBonus,
} from "../../model/doc.js";
import { DomainPicker } from "./DomainPicker.js";
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function ClassesSection({ doc, refData, update }: BuilderProps) {
	const [fcbOpen, setFcbOpen] = useState(true);
	const [confirmRemoveTag, setConfirmRemoveTag] = useState<string | null>(null);

	const baseClasses = useMemo(
		() =>
			Object.values(refData.classes)
				.filter((c) => c.subType === "base")
				.sort((a, b) => a.name.localeCompare(b.name)),
		[refData],
	);

	const chosen = new Set(doc.identity.classes.map((c) => c.tag));
	const totalLevel = doc.identity.classes.reduce((s, c) => s + c.level, 0);

	const favoredClass = doc.identity.favoredClass;
	const fcbHouserule = doc.build.settings?.fcbHouserule ?? false;
	const fcbChoices = doc.build.favoredClassBonus ?? [];
	// FCB slots = level of the favored class (or 0 when none chosen)
	const fcbLevel =
		favoredClass != null
			? (doc.identity.classes.find((c) => c.tag === favoredClass)?.level ?? 0)
			: 0;

	// Standard options; house-rule replaces "hp"+"skill" with "both"
	const standardOptions = [
		{ value: "hp" as const, label: "+1 HP" },
		{ value: "skill" as const, label: "+1 Skill" },
		{ value: "other" as const, label: "Alternate" },
	];
	const houseruleOptions = [
		{ value: "both" as const, label: "+1 HP & Skill" },
		{ value: "alternate" as const, label: "Alternate" },
	];
	const fcbOptions = fcbHouserule ? houseruleOptions : standardOptions;

	return (
		<Panel
			title="Classes"
			step="iv"
			right={
				<span className="hint">
					multiclass-capable · total level {totalLevel}
				</span>
			}
			storageKey="panel:Classes"
		>
			<div className="chips" style={{ marginBottom: 14 }}>
				{baseClasses.map((c) => (
					<button
						key={c.tag}
						type="button"
						className="chip"
						aria-pressed={chosen.has(c.tag)}
						disabled={chosen.has(c.tag)}
						title={chosen.has(c.tag) ? "Already added — use remove below to change classes" : undefined}
						onClick={() => update((d) => addClass(d, c.tag))}
					>
						{c.name}
					</button>
				))}
			</div>

			{doc.identity.classes.length === 0 ? (
				<p className="empty">No class chosen. Pick one or more above.</p>
			) : (
				doc.identity.classes.map((cls) => {
					const def = baseClasses.find((c) => c.tag === cls.tag);
					const isFav = doc.identity.favoredClass === cls.tag;
					return (
						<div className="class-row" key={cls.tag}>
							<button
								type="button"
								className="favstar"
								aria-pressed={isFav}
								title="Favored class"
								onClick={() => update((d) => setFavoredClass(d, cls.tag))}
							>
								{isFav ? "★" : "☆"}
							</button>
							<span className="cname">{def?.name ?? cls.tag}</span>
							<span className="cls-hd-label">Hit Die d{def?.hd ?? "?"}</span>
							<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
								<span className="cls-lv-label">Lv</span>
								<NumberField
									className="num"
									size={2}
									readOnly
									value={cls.level}
									min={1}
									max={20}
									onCommit={(n) => update((d) => setClassLevel(d, cls.tag, n))}
									aria-label={`${def?.name ?? cls.tag} level`}
								/>
							</div>
							{confirmRemoveTag === cls.tag ? (
								<>
									<span className="prep-clear-confirm-label">
										Remove {def?.name ?? cls.tag} (lv {cls.level})?
									</span>
									<button
										type="button"
										className="pick-btn remove"
										onClick={() => {
											update((d) => removeClass(d, cls.tag));
											setConfirmRemoveTag(null);
										}}
									>
										Remove
									</button>
									<button
										type="button"
										className="btn-ghost"
										onClick={() => setConfirmRemoveTag(null)}
									>
										Cancel
									</button>
								</>
							) : (
								<button
									type="button"
									className="btn-ghost"
									onClick={() => setConfirmRemoveTag(cls.tag)}
								>
									remove
								</button>
							)}
						</div>
					);
				})
			)}

			{/* Favored-class bonus picker — only when a favored class is chosen */}
			{fcbLevel > 0 && (
				<div className="subsection">
					<div
						className="subsection-header"
						onClick={() => setFcbOpen((o) => !o)}
						role="button"
						tabIndex={0}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") setFcbOpen((o) => !o);
						}}
						aria-expanded={fcbOpen}
					>
						<h3>Favored Class Bonus</h3>
						<span className="panel-caret">{fcbOpen ? "▾" : "▸"}</span>
					</div>
					{fcbOpen && (
						<div className="fcb-list">
							{Array.from({ length: fcbLevel }, (_, i) => {
								const chosen = fcbChoices[i];
								return (
									<div className="fcb-row" key={i}>
										<span className="fcb-level">Lv {i + 1}</span>
										<div className="fcb-chips">
											{fcbOptions.map((opt) => (
												<button
													key={opt.value}
													type="button"
													className="fcb-chip"
													aria-pressed={chosen === opt.value}
													onClick={() =>
														update((d) => setFavoredClassBonus(d, i, opt.value))
													}
												>
													{opt.label}
												</button>
											))}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* Domain picker — cleric only (free-choice, soft warning only). */}
			{doc.identity.classes.some((c) => c.tag === "cleric") && (
				<DomainPicker doc={doc} refData={refData} update={update} />
			)}
		</Panel>
	);
}

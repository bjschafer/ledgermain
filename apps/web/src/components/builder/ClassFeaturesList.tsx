import type { DerivedSheet } from "@pf1/schema";

/**
 * Displays every granted base-class feature (struck through when an active
 * archetype swaps it out, same visual language as `Provenance`'s `applied`
 * flag), followed by each active archetype's own feature list. Archetype
 * features with no unambiguous base-feature match render as a soft warning
 * ("may replace an existing ability — see description") rather than a swap,
 * per the project's hybrid-prereqs posture.
 */
export function ClassFeaturesList({ sheet }: { sheet: DerivedSheet }) {
	if (sheet.classFeatures.length === 0) return null;

	const byLevel = new Map<number, typeof sheet.classFeatures>();
	for (const f of sheet.classFeatures) {
		const list = byLevel.get(f.level) ?? [];
		list.push(f);
		byLevel.set(f.level, list);
	}
	const levels = [...byLevel.keys()].sort((a, b) => a - b);

	return (
		<div className="subsection class-features">
			<h4 className="tracker-sub">Class Features</h4>
			<div className="cf-levels">
				{levels.map((level) => (
					<div className="cf-level-row" key={level}>
						<span className="cf-level">Lv {level}</span>
						<div className="cf-names">
							{byLevel.get(level)!.map((f, i) => (
								<span
									key={`${f.featureId}-${i}`}
									className={`cf-name${f.applied ? "" : " struck"}`}
									title={f.replacedBy ? `Replaced by ${f.replacedBy}` : undefined}
								>
									{f.name}
									{f.replacedBy ? <span className="cf-replaced"> → {f.replacedBy}</span> : null}
								</span>
							))}
						</div>
					</div>
				))}
			</div>

			{sheet.activeArchetypes.map((a) => (
				<div className="cf-archetype" key={a.id}>
					<span className="hint">{a.name}</span>
					<div className="cf-names">
						{a.features.map((f, i) => (
							<span key={`${a.id}-${i}`} className="cf-name">
								Lv {f.level} · {f.name}
								{f.ambiguous ? (
									<span className="soft" title="No unambiguous base-feature match — verify manually">
										{" "}
										⚠ may replace an existing ability
									</span>
								) : null}
							</span>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

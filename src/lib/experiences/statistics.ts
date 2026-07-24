import type { LibraryItem } from "src/lib/vault";
import type { ExperienceDefinition } from "src/lib/experiences/registry";
import { getNoteMetadataValues, getReadableMetadataValue } from "src/lib/experiences/selectors";
import { experienceStatusOrder, getExperienceStatusIndex } from "src/lib/experiences/status";

export interface ExperienceStatistic {
	label: string;
	value: string;
	helper: string;
}

export function buildExperienceStatistics(
	notes: LibraryItem[],
	definition: ExperienceDefinition
): ExperienceStatistic[] {
	const total = notes.length;
	const statisticsDefinition = definition.statistics;

	if (statisticsDefinition.type === "summary") {
		return statisticsDefinition.metrics.map((metric) => {
			let value = 0;

			switch (metric.type) {
				case "total":
					value = total;
					break;
				case "favorites":
					value = notes.filter((note) => getNoteMetadataValues(note, "favorite").includes("true")).length;
					break;
				case "unique-metadata":
					value = new Set(notes.flatMap((note) => getNoteMetadataValues(note, metric.key))).size;
					break;
				case "unique-tags":
					value = new Set(notes.flatMap((note) => note.tags)).size;
					break;
			}

			return {
				label: metric.label,
				value: String(value),
				helper: metric.helper ?? metric.label.toLocaleLowerCase("en"),
			};
		});
	}

	const counts = new Map<string, number>();

	for (const note of notes) {
		const [value] = getNoteMetadataValues(note, statisticsDefinition.metadataKey);
		if (!value) {
			continue;
		}

		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	if (statisticsDefinition.metadataKey === "status") {
		for (const status of experienceStatusOrder) {
			if (!counts.has(status)) {
				counts.set(status, 0);
			}
		}
	}

	const metadataStats = Array.from(counts.entries())
		.sort((left, right) => {
			if (statisticsDefinition.metadataKey === "status") {
				const leftIndex = getExperienceStatusIndex(left[0]);
				const rightIndex = getExperienceStatusIndex(right[0]);
				if (leftIndex !== rightIndex) {
					return leftIndex - rightIndex;
				}
			}

			if (left[1] !== right[1]) {
				return right[1] - left[1];
			}

			return left[0].localeCompare(right[0], "sv");
		})
		.slice(0, statisticsDefinition.maxValues)
		.map(([value, count]) => ({
			label: getReadableMetadataValue(value),
			value: String(count),
			helper: statisticsDefinition.metadataKey,
		}));

	return [
		{
			label: "Items",
			value: String(total),
			helper: total === 1 ? "note" : "notes",
		},
		...metadataStats,
	];
}

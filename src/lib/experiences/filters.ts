import type { LibraryItem } from "src/lib/vault";
import type { ExperienceDefinition } from "src/lib/experiences/registry";
import { getNoteMetadataValue } from "src/lib/experiences/selectors";

export interface ExperienceFilterState {
	metadata: Record<string, string>;
	tag: string | null;
	selected: string | null;
	inspector: "open" | "closed";
}

export interface ExperienceFilterOption {
	value: string;
	label: string;
	count: number;
}

function normalizeQueryValue(value: string | null) {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}

function toFilterParamName(key: string) {
	return `filter-${key}`;
}

function humanizeValue(value: string) {
	return value
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function getExperienceFilterState(
	searchParams: URLSearchParams,
	definition: ExperienceDefinition
): ExperienceFilterState {
	return {
		metadata: Object.fromEntries(
			definition.metadataFilters
				.map((key) => [key, normalizeQueryValue(searchParams.get(toFilterParamName(key)))])
				.filter((entry): entry is [string, string] => Boolean(entry[1]))
		),
		tag: normalizeQueryValue(searchParams.get("tag")),
		selected: normalizeQueryValue(searchParams.get("selected")),
		inspector: searchParams.get("inspector") === "closed" ? "closed" : "open",
	};
}

export function getMetadataFilterParamName(key: string) {
	return toFilterParamName(key);
}

export function filterExperienceNotes(notes: LibraryItem[], filterState: ExperienceFilterState) {
	return notes.filter((note) => {
		for (const [key, expectedValue] of Object.entries(filterState.metadata)) {
			if (getNoteMetadataValue(note, key) !== expectedValue) {
				return false;
			}
		}

		if (filterState.tag && !note.tags.includes(filterState.tag)) {
			return false;
		}

		return true;
	});
}

export function buildMetadataFilterOptions(notes: LibraryItem[], key: string): ExperienceFilterOption[] {
	const counts = new Map<string, number>();

	for (const note of notes) {
		const value = getNoteMetadataValue(note, key);
		if (!value) {
			continue;
		}

		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	return Array.from(counts.entries())
		.sort((left, right) => {
			if (left[1] !== right[1]) {
				return right[1] - left[1];
			}

			return left[0].localeCompare(right[0], "sv");
		})
		.map(([value, count]) => ({
			value,
			label: humanizeValue(value),
			count,
		}));
}

export function buildTagFilterOptions(notes: LibraryItem[], limit = 12): ExperienceFilterOption[] {
	const counts = new Map<string, number>();

	for (const note of notes) {
		for (const tag of note.tags) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}

	return Array.from(counts.entries())
		.sort((left, right) => {
			if (left[1] !== right[1]) {
				return right[1] - left[1];
			}

			return left[0].localeCompare(right[0], "sv");
		})
		.slice(0, limit)
		.map(([value, count]) => ({
			value,
			label: value,
			count,
		}));
}

import type { LibraryItem } from "src/lib/vault";
import type { ExperienceDefinition } from "src/lib/experiences/registry";
import {
	buildMetadataFilterOptions,
	buildTagFilterOptions,
	filterExperienceNotes,
	getExperienceFilterState,
} from "src/lib/experiences/filters";
import { getExperienceNotes } from "src/lib/experiences/selectors";
import { buildExperienceStatistics } from "src/lib/experiences/statistics";

export interface ExperienceViewModel {
	definition: ExperienceDefinition;
	notes: LibraryItem[];
	filterState: ReturnType<typeof getExperienceFilterState>;
	filteredNotes: LibraryItem[];
	totalFilteredNotes: number;
	selectedNote: LibraryItem | null;
	statistics: ReturnType<typeof buildExperienceStatistics>;
	metadataOptions: Record<string, ReturnType<typeof buildMetadataFilterOptions>>;
	tagOptions: ReturnType<typeof buildTagFilterOptions>;
	sortBy: "updated" | "title";
	layout: "grid" | "list";
}

export function buildExperienceViewModel(
	definition: ExperienceDefinition,
	items: LibraryItem[],
	searchParams: URLSearchParams
): ExperienceViewModel {
	const notes = getExperienceNotes(items, definition);
	const filterState = getExperienceFilterState(searchParams, definition);
	const sortBy = searchParams.get("sort")?.trim() === "title" ? "title" : "updated";
	const layout = searchParams.get("layout")?.trim() === "list" ? "list" : "grid";
	const filteredNotes = filterExperienceNotes(notes, filterState).sort((left, right) => {
		if (sortBy === "title") {
			return left.title.localeCompare(right.title, "sv");
		}

		return right.updatedAt - left.updatedAt;
	});
	const selectedNote = filterState.selected
		? filteredNotes.find((note) => note.id === filterState.selected || note.slugPath === filterState.selected) ?? null
		: null;

	return {
		definition,
		notes,
		filterState,
		filteredNotes,
		totalFilteredNotes: filteredNotes.length,
		selectedNote,
		statistics: buildExperienceStatistics(notes, definition),
		metadataOptions: Object.fromEntries(
			definition.metadataFilters.map((key) => [key, buildMetadataFilterOptions(notes, key)])
		),
		tagOptions: buildTagFilterOptions(notes),
		sortBy,
		layout,
	};
}

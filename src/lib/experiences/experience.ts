import type { LibraryItem } from "src/lib/vault";
import type { ExperienceDefinition } from "src/lib/experiences/registry";
import {
	buildMetadataFilterOptions,
	buildTagFilterOptions,
	filterExperienceNotes,
	getExperienceFilterState,
} from "src/lib/experiences/filters";
import { getExperienceNotes } from "src/lib/experiences/selectors";
import {
	getExperienceSortState,
	sortExperienceNotes,
	type ExperienceSortField,
	type ExperienceSortOrder,
} from "src/lib/experiences/sorting";
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
	sortBy: ExperienceSortField;
	sortOrder: ExperienceSortOrder;
	layout: "grid" | "list";
}

export function buildExperienceViewModel(
	definition: ExperienceDefinition,
	items: LibraryItem[],
	searchParams: URLSearchParams
): ExperienceViewModel {
	const notes = getExperienceNotes(items, definition);
	const filterState = getExperienceFilterState(searchParams, definition);
	const sortState = getExperienceSortState(searchParams);
	const layout = searchParams.get("layout")?.trim() === "list" ? "list" : "grid";
	const filteredNotes = sortExperienceNotes(filterExperienceNotes(notes, filterState, definition), sortState);
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
			definition.metadataFilters.map((key) => [key, buildMetadataFilterOptions(notes, key, definition)])
		),
		tagOptions: buildTagFilterOptions(notes),
		sortBy: sortState.field,
		sortOrder: sortState.order,
		layout,
	};
}

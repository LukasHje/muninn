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

export function buildExperienceViewModel(
	definition: ExperienceDefinition,
	items: LibraryItem[],
	searchParams: URLSearchParams
) {
	const notes = getExperienceNotes(items, definition);
	const filterState = getExperienceFilterState(searchParams, definition);
	const filteredNotes = filterExperienceNotes(notes, filterState);
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
	};
}

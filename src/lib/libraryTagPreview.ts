import { tagMatchesNoteSearchQuery } from "src/lib/noteSearch";

export interface LibraryTagPreview {
	orderedTags: string[];
}

export function orderLibraryTagsForSearch(tags: readonly string[], query?: string) {
	const sourceTags = [...tags];
	if (!query?.trim()) {
		return sourceTags;
	}

	const matchingTags = sourceTags.filter((tag) => tagMatchesNoteSearchQuery(tag, query));
	const remainingTags = sourceTags.filter((tag) => !tagMatchesNoteSearchQuery(tag, query));
	return [...matchingTags, ...remainingTags];
}

export function getLibraryTagPreview(
	tags: readonly string[],
	query?: string
): LibraryTagPreview {
	return {
		orderedTags: orderLibraryTagsForSearch(tags, query),
	};
}

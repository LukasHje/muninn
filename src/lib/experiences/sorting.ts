import type { LibraryItem } from "src/lib/vault";

export type ExperienceSortField = "updated" | "created" | "title";
export type ExperienceSortOrder = "asc" | "desc";

export interface ExperienceSortState {
	field: ExperienceSortField;
	order: ExperienceSortOrder;
}

export function getExperienceSortState(searchParams: URLSearchParams): ExperienceSortState {
	const requestedField = searchParams.get("sort")?.trim();
	const field: ExperienceSortField =
		requestedField === "title" || requestedField === "created" ? requestedField : "updated";
	const requestedOrder = searchParams.get("order")?.trim();
	const order: ExperienceSortOrder =
		requestedOrder === "asc" || requestedOrder === "desc"
			? requestedOrder
			: field === "title"
				? "asc"
				: "desc";

	return { field, order };
}

export function sortExperienceNotes(
	notes: LibraryItem[],
	{ field, order }: ExperienceSortState
) {
	const direction = order === "asc" ? 1 : -1;

	return notes.sort((left, right) => {
		const comparison =
			field === "title"
				? left.title.localeCompare(right.title, "sv")
				: field === "created"
					? left.createdAt - right.createdAt
					: left.updatedAt - right.updatedAt;

		if (comparison !== 0) {
			return comparison * direction;
		}

		return left.title.localeCompare(right.title, "sv");
	});
}

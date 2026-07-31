import type { LibraryItem } from "src/lib/vault";

export interface BookMetadata {
	author: string | null;
	isbn: string | null;
	language: string | null;
	publicationYear: number | null;
	publisher: string | null;
	pages: number | null;
	format: string | null;
	genres: string[];
	series: string | null;
	coverUrl: string | null;
	description: string;
}

function values(note: LibraryItem, ...keys: string[]) {
	const normalizedKeys = new Set(keys.map((key) => key.toLocaleLowerCase("en").replace(/[-\s]+/g, "_")));
	return Object.entries(note.frontmatter)
		.filter(([key]) => normalizedKeys.has(key.toLocaleLowerCase("en").replace(/[-\s]+/g, "_")))
		.flatMap(([, value]) => Array.isArray(value) ? value : typeof value === "string" ? [value] : [])
		.map((value) => value.trim())
		.filter(Boolean);
}

function first(note: LibraryItem, ...keys: string[]) {
	return values(note, ...keys)[0] ?? null;
}

function parseInteger(value: string | null) {
	if (!value) return null;
	const parsed = Number.parseInt(value.match(/\d{1,4}/)?.[0] ?? "", 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeIsbn(value: string | null) {
	const normalized = value?.replace(/[^0-9X]/gi, "") ?? "";
	return normalized.length >= 10 ? normalized : null;
}

export function getBookMetadata(note: LibraryItem): BookMetadata {
	const isbn = normalizeIsbn(first(note, "isbn", "isbn_13", "isbn13"));
	const authoredCover = first(note, "cover", "cover_url", "thumbnail", "image");

	return {
		author: first(note, "author", "authors", "författare", "forfattare"),
		isbn,
		language: first(note, "language", "språk", "sprak"),
		publicationYear: parseInteger(first(note, "publication_year", "published", "year", "publication_date")),
		publisher: first(note, "publisher", "förlag", "forlag"),
		pages: parseInteger(first(note, "pages", "page_count", "sidor")),
		format: first(note, "format", "binding"),
		genres: Array.from(new Set(values(note, "genres", "genre", "category", "categories"))),
		series: first(note, "series", "serie"),
		coverUrl:
			note.imageUrl ??
			authoredCover ??
			(isbn ? `/book-covers/${isbn}` : null),
		description: note.excerpt,
	};
}

export function getBookSortTitle(note: LibraryItem) {
	return note.title.replace(/^(?:the|a|an)\s+/i, "");
}

export function getBookPrimaryGenre(note: LibraryItem) {
	return getBookMetadata(note).genres[0] ?? null;
}

import {
	createExperienceLocalState,
	getBrowserStorage,
	type ExperienceLocalState,
	type StorageAdapter,
} from "./localState";

export const bookReadingStatuses = [
	"want-to-read",
	"currently-reading",
	"read",
	"did-not-finish",
] as const;

export type BookReadingStatus = (typeof bookReadingStatuses)[number];

export interface BookState {
	noteId: string;
	readingStatus: BookReadingStatus | null;
	rating: number | null;
	progress: number | null;
	startedAt: string | null;
	finishedAt: string | null;
	favorite: boolean;
	updatedAt: string;
}

export interface BookPreferences {
	filter: string;
	author: string;
	year: string;
	sort: "recently-added" | "recently-finished" | "title" | "author" | "rating" | "publication-year";
	updatedAt: string;
}

export const bookReadingStatusLabels: Record<BookReadingStatus, string> = {
	"want-to-read": "Want to Read",
	"currently-reading": "Currently Reading",
	read: "Read",
	"did-not-finish": "Did Not Finish",
};

export function isBookState(value: unknown): value is BookState {
	if (!value || typeof value !== "object") return false;
	const state = value as Partial<BookState>;
	return (
		typeof state.noteId === "string" &&
		(state.readingStatus === null || bookReadingStatuses.includes(state.readingStatus as BookReadingStatus)) &&
		(state.rating === null || (typeof state.rating === "number" && Number.isInteger(state.rating) && state.rating >= 1 && state.rating <= 5)) &&
		(state.progress === null || (typeof state.progress === "number" && state.progress >= 0 && state.progress <= 100)) &&
		(state.startedAt === null || typeof state.startedAt === "string") &&
		(state.finishedAt === null || typeof state.finishedAt === "string") &&
		typeof state.favorite === "boolean" &&
		typeof state.updatedAt === "string"
	);
}

export function createBookStateStore(storage: StorageAdapter): ExperienceLocalState<BookState> {
	return createExperienceLocalState<BookState>({
		namespace: "books",
		version: 1,
		storage,
		isValid: isBookState,
	});
}

function isBookPreferences(value: unknown): value is BookPreferences {
	if (!value || typeof value !== "object") return false;
	const preferences = value as Partial<BookPreferences>;
	return (
		typeof preferences.filter === "string" &&
		typeof preferences.author === "string" &&
		typeof preferences.year === "string" &&
		["recently-added", "recently-finished", "title", "author", "rating", "publication-year"].includes(preferences.sort ?? "") &&
		typeof preferences.updatedAt === "string"
	);
}

export function createBookPreferencesStore(storage: StorageAdapter) {
	return createExperienceLocalState<BookPreferences>({
		namespace: "books-preferences",
		version: 2,
		storage,
		isValid: isBookPreferences,
	});
}

export function getBookStateStore() {
	const storage = getBrowserStorage();
	return storage ? createBookStateStore(storage) : null;
}

export function getBookPreferencesStore() {
	const storage = getBrowserStorage();
	return storage ? createBookPreferencesStore(storage) : null;
}

export function emptyBookState(noteId: string): BookState {
	return {
		noteId,
		readingStatus: null,
		rating: null,
		progress: null,
		startedAt: null,
		finishedAt: null,
		favorite: false,
		updatedAt: new Date(0).toISOString(),
	};
}

export function transitionBookStatus(
	current: BookState,
	readingStatus: BookReadingStatus | null,
	now = new Date().toISOString()
): BookState {
	return {
		...current,
		readingStatus,
		startedAt:
			readingStatus === "currently-reading" && !current.startedAt ? now : current.startedAt,
		finishedAt:
			readingStatus === "read" && current.readingStatus !== "read" ? now : current.finishedAt,
		updatedAt: now,
	};
}

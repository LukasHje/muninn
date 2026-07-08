import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ui } from "src/i18n";
import { APP_STATE_DIR, ensureAppStateDir } from "src/lib/state";

const favoritesFilePath = path.join(APP_STATE_DIR, "favorites.json");

interface FavoritesState {
	noteIds: string[];
}

async function readFavoritesState(): Promise<FavoritesState> {
	await ensureAppStateDir();

	try {
		const raw = await readFile(favoritesFilePath, "utf8");
		const parsed = JSON.parse(raw) as Partial<FavoritesState>;
		const noteIds = Array.isArray(parsed.noteIds)
			? parsed.noteIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
			: [];

		return { noteIds: Array.from(new Set(noteIds)).sort((a, b) => a.localeCompare(b, "sv")) };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return { noteIds: [] };
		}
		throw error;
	}
}

async function writeFavoritesState(state: FavoritesState) {
	await ensureAppStateDir();
	await writeFile(favoritesFilePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function getFavoriteNoteIds() {
	const state = await readFavoritesState();
	return state.noteIds;
}

export async function getFavoriteNoteIdSet() {
	return new Set(await getFavoriteNoteIds());
}

export async function getFavoritesCount() {
	const ids = await getFavoriteNoteIds();
	return ids.length;
}

export async function toggleFavoriteNote(noteId: string) {
	const trimmedId = noteId.trim();
	if (!trimmedId) {
		throw new Error(ui.errors.favoriteNoteIdRequired);
	}

	const state = await readFavoritesState();
	const ids = new Set(state.noteIds);
	const isFavorite = ids.has(trimmedId);

	if (isFavorite) {
		ids.delete(trimmedId);
	} else {
		ids.add(trimmedId);
	}

	await writeFavoritesState({
		noteIds: Array.from(ids).sort((a, b) => a.localeCompare(b, "sv")),
	});

	return !isFavorite;
}

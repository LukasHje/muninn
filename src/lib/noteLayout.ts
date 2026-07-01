import type { LibraryItem } from "./vault";

export function getNoteLayout(note: LibraryItem) {
	return note.normalized.layout;
}

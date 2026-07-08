import type { LibraryItem } from "lib/vault";

export function getNoteLayout(note: LibraryItem) {
	return note.normalized.layout;
}

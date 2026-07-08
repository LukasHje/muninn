import type { LibraryItem } from "src/lib/vault";

export function getNoteLayout(note: LibraryItem) {
	return note.normalized.layout;
}

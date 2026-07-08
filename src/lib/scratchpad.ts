import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ui } from "i18n";
import { formatUiDateTime } from "i18n/format";
import { ensureScratchpadStateDir, SCRATCHPAD_STATE_DIR } from "lib/state";

export interface ScratchpadNote {
	id: string;
	content: string;
	title: string;
	preview: string;
	createdAt: string;
	updatedAt: string;
}

const scratchpadDir = SCRATCHPAD_STATE_DIR;

function normaliseLineBreaks(value: string) {
	return value.replace(/\r\n/g, "\n").trim();
}

function formatDate(value: Date) {
	return formatUiDateTime(value);
}

function buildTitle(content: string) {
	const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? ui.pages.scratchpad.untitledNote;
	return firstLine.length > 48 ? `${firstLine.slice(0, 48)}...` : firstLine;
}

function buildPreview(content: string) {
	const condensed = content.replace(/\s+/g, " ").trim();
	return condensed.length > 140 ? `${condensed.slice(0, 140)}...` : condensed;
}

function filePathForId(id: string) {
	return path.join(scratchpadDir, `${id}.txt`);
}

export async function ensureScratchpadDir() {
	await ensureScratchpadStateDir();
}

export async function getScratchpadNotes(): Promise<ScratchpadNote[]> {
	await ensureScratchpadDir();
	const entries = await readdir(scratchpadDir, { withFileTypes: true });
	const noteFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".txt"));

	const notes = await Promise.all(
		noteFiles.map(async (file) => {
			const id = file.name.replace(/\.txt$/, "");
			const fullPath = filePathForId(id);
			const [content, fileStat] = await Promise.all([
				readFile(fullPath, "utf8"),
				stat(fullPath),
			]);
			const cleanedContent = normaliseLineBreaks(content);

			return {
				id,
				content: cleanedContent,
				title: buildTitle(cleanedContent),
				preview: buildPreview(cleanedContent),
				createdAt: formatDate(fileStat.birthtime),
				updatedAt: formatDate(fileStat.mtime),
				sortKey: fileStat.mtimeMs,
			};
		})
	);

	return notes
		.sort((a, b) => b.sortKey - a.sortKey)
		.map(({ sortKey, ...note }) => note);
}

export async function getScratchpadNotesCount() {
	const notes = await getScratchpadNotes();
	return notes.length;
}

export async function getScratchpadNoteById(id: string) {
	const notes = await getScratchpadNotes();
	return notes.find((note) => note.id === id) ?? null;
}

export async function createScratchpadNote(content: string) {
	const cleanedContent = normaliseLineBreaks(content);

	if (!cleanedContent) {
		throw new Error(ui.pages.scratchpad.contentRequiredError);
	}

	await ensureScratchpadDir();
	const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
	await writeFile(filePathForId(id), `${cleanedContent}\n`, "utf8");
	return getScratchpadNoteById(id);
}

export async function deleteScratchpadNote(id: string) {
	await ensureScratchpadDir();
	await unlink(filePathForId(id));
}

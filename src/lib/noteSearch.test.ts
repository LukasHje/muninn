import assert from "node:assert/strict";
import test from "node:test";
import { buildNoteSearchDocuments, searchNoteDocuments } from "./noteSearch";
import type { LibraryItem } from "./vault";

const charonNote = {
	id: "charon",
	href: "/notes/charon",
	title: "Charon (Pi-hole)",
	relativePath: "07 Mitt Homelab/Charon (Pi-hole).md",
	content: "# Charon (Pi-hole)\nSyfte: = this.usecase\nCPU: `= this.cpu`",
	frontmatter: {},
	normalized: {
		aliases: [],
		metadata: {
			usecase: ["Blocklistning av annonser", "Blockering av tracking"],
			cpu: "Broadcom BCM2711",
		},
	},
	tags: [],
	domainIcon: "server",
	domainLabel: "Technology",
	favorite: false,
	updatedAt: 0,
	updatedLabel: "Today",
} as unknown as LibraryItem;

test("search documents resolve inline Dataview before matching and snippet generation", () => {
	const documents = buildNoteSearchDocuments([charonNote]);
	const results = searchNoteDocuments(documents, "Blocklistning");

	assert.equal(results.length, 1);
	assert.match(results[0].snippet, /Syfte: Blocklistning av annonser/);
	assert.doesNotMatch(results[0].snippet, /= this\.usecase/);
});

test("search does not index unresolved inline Dataview expressions", () => {
	const documents = buildNoteSearchDocuments([charonNote]);

	assert.equal(searchNoteDocuments(documents, "this.usecase").length, 0);
	assert.equal(searchNoteDocuments(documents, "Broadcom BCM2711").length, 1);
});

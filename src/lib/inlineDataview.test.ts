import assert from "node:assert/strict";
import test from "node:test";
import { replaceInlineDataviewExpressions } from "./inlineDataview";

const note = {
	title: "Charon (Pi-hole)",
	relativePath: "07 Mitt Homelab/spec-sheet - Charon (Pi-hole).md",
	frontmatter: {
		cpu: "Frontmatter CPU",
	},
	normalized: {
		metadata: {
			cpu: "Broadcom BCM2711",
			ram: "8 GB",
			usecase: ["DNS resolver", "Blocklistning"],
		},
	},
};

test("inline Dataview replacement resolves note identity and metadata", () => {
	const source = "# `= this.title`\n`= this.file.name`\nCPU: `= this.cpu`\nRAM: = this.ram";
	assert.equal(
		replaceInlineDataviewExpressions(source, note),
		"# Charon (Pi-hole)\nspec-sheet - Charon (Pi-hole)\nCPU: Broadcom BCM2711\nRAM: 8 GB"
	);
});

test("inline Dataview replacement joins collection fields", () => {
	assert.equal(
		replaceInlineDataviewExpressions("Syfte: `= this.usecase`", note),
		"Syfte: DNS resolver, Blocklistning"
	);
});

test("inline Dataview replacement preserves unsupported expressions", () => {
	assert.equal(
		replaceInlineDataviewExpressions("Value: `= this.missing`", note),
		"Value: `= this.missing`"
	);
});

test("file name replacement remains portable across vault path separators", () => {
	assert.equal(
		replaceInlineDataviewExpressions("`= this.file.name`", {
			...note,
			relativePath: "07 Mitt Homelab\\Charon (Pi-hole).md",
		}),
		"Charon (Pi-hole)",
	);
});

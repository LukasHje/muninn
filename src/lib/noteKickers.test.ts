import assert from "node:assert/strict";
import test from "node:test";
import { getNoteTypeKickerLabel } from "src/lib/noteKickers";

test("gear type is redundant with the Gear domain", () => {
	assert.equal(getNoteTypeKickerLabel("gear", "gear", "Gear"), null);
});

test("singular types are redundant with plural domain labels", () => {
	assert.equal(getNoteTypeKickerLabel("project", "projekt", "Projects"), null);
	assert.equal(getNoteTypeKickerLabel("recipe", "recept", "Recipes"), null);
	assert.equal(getNoteTypeKickerLabel("book", "bocker", "Books"), null);
});

test("localized equivalent labels are deduplicated", () => {
	assert.equal(getNoteTypeKickerLabel("träning", "traning", "Träning"), null);
});

test("more specific types remain visible", () => {
	assert.equal(
		getNoteTypeKickerLabel("travel-destination", "resor", "Travel"),
		"travel destination"
	);
	assert.equal(getNoteTypeKickerLabel("server", "teknik", "Technology"), "server");
});

test("generic note type remains hidden", () => {
	assert.equal(getNoteTypeKickerLabel("note", "ovrigt", "Other"), null);
});

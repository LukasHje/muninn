import assert from "node:assert/strict";
import test from "node:test";
import {
	getLibraryTagPreview,
	orderLibraryTagsForSearch,
} from "src/lib/libraryTagPreview";
import { highlightSearchText } from "src/lib/searchHighlight";

test("no query preserves source order without mutating it", () => {
	const source = ["first", "second", "third"];
	const ordered = orderLibraryTagsForSearch(source, "");

	assert.deepEqual(ordered, source);
	assert.notStrictEqual(ordered, source);
	assert.deepEqual(source, ["first", "second", "third"]);
});

test("one matching tag is promoted", () => {
	assert.deepEqual(
		orderLibraryTagsForSearch(["alpha", "bravo", "charlie"], "char"),
		["charlie", "alpha", "bravo"]
	);
});

test("matching and remaining tags preserve their relative source order", () => {
	assert.deepEqual(
		orderLibraryTagsForSearch(["alpha-one", "keep-one", "alpha-two", "keep-two"], "alpha"),
		["alpha-one", "alpha-two", "keep-one", "keep-two"]
	);
});

test("multiple query terms promote every matching tag in source order", () => {
	assert.deepEqual(
		orderLibraryTagsForSearch(["other", "svenska", "typescript", "last"], "TYPE Svenska"),
		["svenska", "typescript", "other", "last"]
	);
});

test("matching follows search normalization for case and Swedish characters", () => {
	assert.deepEqual(
		orderLibraryTagsForSearch(["other", "Översikt", "Ångström"], "oversikt ANGSTROM"),
		["Översikt", "Ångström", "other"]
	);
});

test("regex-special characters are handled as plain search input", () => {
	assert.deepEqual(
		orderLibraryTagsForSearch(["notes", "c++", "[draft]"], "c++ [draft]"),
		["c++", "[draft]", "notes"]
	);
});

test("promoted multi-term tag matches remain highlighted", () => {
	const html = highlightSearchText("svenska-typescript", "TYPE Svenska", { field: "tag" });

	assert.match(html, /<mark[^>]*>svenska<\/mark>/i);
	assert.match(html, /<mark[^>]*>type<\/mark>/i);
});

test("preview keeps the complete display order for responsive fitting", () => {
	const source = ["one", "matching", "three", "four", "five", "six"];
	const preview = getLibraryTagPreview(source, "match");

	assert.deepEqual(preview.orderedTags, ["matching", "one", "three", "four", "five", "six"]);
	assert.deepEqual(source, ["one", "matching", "three", "four", "five", "six"]);
});

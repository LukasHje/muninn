import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getCalloutAppearance } from "../components/obsidian/calloutDefinitions";

test("maps every supported Obsidian callout and alias to its canonical kind", () => {
	const aliases = {
		note: "note",
		abstract: "abstract",
		summary: "abstract",
		tldr: "abstract",
		info: "info",
		todo: "todo",
		tip: "tip",
		hint: "tip",
		important: "tip",
		success: "success",
		check: "success",
		done: "success",
		question: "question",
		help: "question",
		faq: "question",
		warning: "warning",
		caution: "warning",
		attention: "warning",
		failure: "failure",
		fail: "failure",
		missing: "failure",
		danger: "danger",
		error: "danger",
		bug: "bug",
		example: "example",
		quote: "quote",
		cite: "quote",
	} as const;

	for (const [type, kind] of Object.entries(aliases)) {
		assert.equal(getCalloutAppearance(type).kind, kind);
	}
});

test("normalizes type identifiers case-insensitively", () => {
	assert.equal(getCalloutAppearance("  BuG ").kind, "bug");
});

test("uses note presentation for unsupported callout types", () => {
	assert.deepEqual(getCalloutAppearance("custom-callout"), {
		kind: "note",
		icon: "notebook-pen",
		tone: "obsidian-callout--note",
	});
});

test("keeps bug and generic danger presentations distinct", () => {
	assert.equal(getCalloutAppearance("bug").icon, "bug");
	assert.equal(getCalloutAppearance("danger").icon, "zap");
	assert.notEqual(
		getCalloutAppearance("bug").tone,
		getCalloutAppearance("danger").tone,
	);
});

test("every callout definition references an icon rendered by the shared Icon component", async () => {
	const iconSource = await readFile(
		new URL("../components/Icon.astro", import.meta.url),
		"utf8",
	);
	const canonicalTypes = [
		"note",
		"abstract",
		"info",
		"todo",
		"tip",
		"success",
		"question",
		"warning",
		"failure",
		"danger",
		"bug",
		"example",
		"quote",
	];

	for (const type of canonicalTypes) {
		const icon = getCalloutAppearance(type).icon;
		assert.match(iconSource, new RegExp(`name === ["']${icon}["']`));
	}
});

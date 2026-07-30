import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { executeDataviewJs } from "./dataviewJs";
import { parseMarkdownDocument } from "./markdown/pipeline";
import type {
	CalloutSegment,
	DataviewJsSegment,
	MarkdownDocumentSegment,
	MarkdownParseContext,
} from "./markdown/types";
import type { LibraryItem } from "./vault";

const fixtureDirectory = new URL("./markdown/fixtures/", import.meta.url);

const note = {
	id: "dataview-fixture",
	title: "Dataview fixture",
	href: "/notes/dataview-fixture",
	slugPath: "dataview-fixture",
	domainKey: "ovrigt",
	domainLabel: "Other",
	domainIcon: "file-text",
	tone: "slate",
	excerpt: "",
	updatedLabel: "Today",
	tags: [],
	relativePath: "dataview-fixture.md",
	createdAt: 1,
	updatedAt: 1,
	content: "",
	frontmatter: {},
	normalized: {
		title: "Dataview fixture",
		path: "dataview-fixture.md",
		slug: "dataview-fixture",
		domain: "ovrigt",
		type: "note",
		layout: "plain",
		tags: [],
		aliases: [],
		metadata: {},
	},
	imageReferences: {},
} satisfies LibraryItem;

const context = {
	note,
	allNotes: [],
	noteLookup: new Map(),
	assetIndex: {
		entries: [],
		byRelativePath: new Map(),
		byLowercaseFilename: new Map(),
		byNormalizedFilename: new Map(),
	},
} satisfies MarkdownParseContext;

async function readFixture(filename: string) {
	return readFile(new URL(filename, fixtureDirectory), "utf8");
}

function walkSegments(segments: MarkdownDocumentSegment[]): MarkdownDocumentSegment[] {
	return segments.flatMap((segment) => {
		if (segment.type === "callout") {
			return [segment, ...walkSegments(segment.children)];
		}

		if (segment.type === "multi-column") {
			return [segment, ...segment.columns.flatMap((column) => walkSegments(column))];
		}

		return [segment];
	});
}

test("preserves a Dataview block between tables and ordinary markdown", async () => {
	const segments = await parseMarkdownDocument(await readFixture("dataview-table.md"), context);

	assert.deepEqual(segments.map((segment) => segment.type), ["markdown", "dataview", "markdown"]);
	assert.match((segments[0] as { text: string }).text, /\| Name \| Status \|/);
	assert.match((segments[2] as { text: string }).text, /Markdown after the query/);
});

test("preserves and executes every DataviewJS block in document order", async () => {
	const segments = await parseMarkdownDocument(await readFixture("dataviewjs-multiple.md"), context);
	const dataviewSegments = segments.filter(
		(segment): segment is DataviewJsSegment => segment.type === "dataviewjs"
	);

	assert.equal(dataviewSegments.length, 2);
	assert.ok(dataviewSegments.every((segment) => segment.result.type === "blocks"));
	assert.deepEqual(segments.map((segment) => segment.type), [
		"markdown",
		"dataviewjs",
		"markdown",
		"dataviewjs",
		"markdown",
	]);
});

test("preserves DataviewJS nodes inside standard and folded callouts", async () => {
	const segments = await parseMarkdownDocument(await readFixture("dataviewjs-callouts.md"), context);
	const callouts = segments.filter(
		(segment): segment is CalloutSegment => segment.type === "callout"
	);

	assert.equal(callouts.length, 2);
	assert.equal(callouts[0].collapsible, false);
	assert.equal(callouts[1].collapsible, true);
	assert.equal(callouts[1].collapsed, true);
	assert.equal(callouts[0].children.filter((segment) => segment.type === "dataviewjs").length, 1);
	assert.deepEqual(callouts[1].children.map((segment) => segment.type), [
		"dataviewjs",
		"markdown",
		"dataview",
		"markdown",
		"dataviewjs",
	]);
	assert.ok(
		callouts[1].children
			.filter((segment): segment is DataviewJsSegment => segment.type === "dataviewjs")
			.every((segment) => segment.result.type === "blocks")
	);
});

test("preserves lazy DataviewJS code continuations inside folded callouts", async () => {
	const segments = await parseMarkdownDocument(await readFixture("dataviewjs-lazy-callout.md"), context);
	const callouts = segments.filter(
		(segment): segment is CalloutSegment => segment.type === "callout"
	);

	assert.equal(callouts.length, 2);
	assert.deepEqual(segments.map((segment) => segment.type), [
		"markdown",
		"callout",
		"markdown",
		"callout",
		"markdown",
	]);
	assert.ok(
		callouts.every(
			(callout) =>
				callout.children.length === 1 &&
				callout.children[0].type === "dataviewjs" &&
				callout.children[0].result.type === "blocks"
		)
	);
});

test("preserves DataviewJS through two nested callout levels", async () => {
	const segments = await parseMarkdownDocument(await readFixture("dataviewjs-nested-callouts.md"), context);
	const allSegments = walkSegments(segments);
	const callouts = allSegments.filter(
		(segment): segment is CalloutSegment => segment.type === "callout"
	);
	const dataviewSegments = allSegments.filter(
		(segment): segment is DataviewJsSegment => segment.type === "dataviewjs"
	);

	assert.equal(callouts.length, 2);
	assert.equal(callouts[0].collapsed, false);
	assert.equal(callouts[1].collapsed, true);
	assert.equal(dataviewSegments.length, 1);
	assert.equal(dataviewSegments[0].result.type, "blocks");
});

test("supports DataviewJS collection helpers and markdown-producing output methods", async () => {
	const result = await executeDataviewJs(
		`
		const values = dv.array([3, 1, 2]);
		const filtered = dv.where(values, value => value > 1);
		const sorted = dv.sort(filtered, value => value, "asc");
		const pages = dv.pages();
		dv.header(3, "Result");
		dv.paragraph(sorted.join(", "));
		dv.paragraph("Pages: " + pages.length);
		dv.span("Inline ");
		dv.span("output");
		dv.el("br");
		dv.paragraph(dv.date("2024-01-02").toFormat("yyyy-MM-dd"));
		`,
		[],
		note
	);

	assert.equal(result.type, "blocks");
	if (result.type !== "blocks") {
		return;
	}

	assert.deepEqual(result.blocks, [
		{ type: "markdown", markdown: "<h3>Result</h3>" },
		{ type: "markdown", markdown: "2, 3" },
		{ type: "markdown", markdown: "Pages: 0" },
		{ type: "markdown", markdown: "Inline output<br>" },
		{ type: "markdown", markdown: "2024-01-02" },
	]);
});

test("keeps consecutive Markdown list items from dv.span on separate lines", async () => {
	const result = await executeDataviewJs(
		`
		dv.span("- **First** — 10 days");
		dv.span("- **Second** — 20 days");
		`,
		[],
		note
	);

	assert.equal(result.type, "blocks");
	if (result.type !== "blocks") {
		return;
	}

	assert.deepEqual(result.blocks, [
		{ type: "markdown", markdown: "- **First** — 10 days\n- **Second** — 20 days" },
	]);
});

test("passes DataviewJS-generated markdown back through the document pipeline", async () => {
	const result = await executeDataviewJs(
		`
		dv.paragraph("Ordinary **Markdown**");
		dv.el("div", "> [!info]- Generated callout\\n> Callout body");
		`,
		[],
		note
	);

	assert.equal(result.type, "blocks");
	if (result.type !== "blocks") {
		return;
	}

	const renderedSegments = (
		await Promise.all(
			result.blocks
				.filter((block) => block.type === "markdown")
				.map((block) => parseMarkdownDocument(block.markdown, context))
		)
	).flat();

	assert.deepEqual(renderedSegments.map((segment) => segment.type), ["markdown", "callout"]);
	const generatedCallout = renderedSegments[1] as CalloutSegment;
	assert.equal(generatedCallout.collapsible, true);
	assert.equal(generatedCallout.collapsed, true);
	assert.match((generatedCallout.children[0] as { text: string }).text, /Callout body/);
});

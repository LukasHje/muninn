import assert from "node:assert/strict";
import test from "node:test";
import { executeDataviewLite } from "./dataviewLite";
import type { LibraryItem } from "./vault";

function createNote(
	title: string,
	status: string,
	fields: Record<string, string>,
	relativePath = `07 Mitt Homelab/07.05 Hardware_specs/${title}.md`
) {
	return {
		id: relativePath,
		title,
		href: `/notes/${title.toLowerCase()}`,
		slugPath: title.toLowerCase(),
		domainKey: "teknik",
		domainLabel: "Technology",
		domainIcon: "file-text",
		tone: "slate",
		excerpt: "",
		updatedLabel: "Today",
		tags: [],
		relativePath,
		createdAt: 1,
		updatedAt: 1,
		content: "",
		frontmatter: { title, type: "server", status, ...fields },
		normalized: {
			title,
			path: relativePath,
			slug: title.toLowerCase(),
			domain: "teknik",
			type: "server",
			layout: "plain",
			tags: [],
			aliases: [],
			metadata: { status },
		},
		imageReferences: {},
	} satisfies LibraryItem;
}

test("renders lifecycle tables with frontmatter fields, link and choice expressions", () => {
	const current = createNote("Truenas", "active", {
		purchase_date: "2025-02-14",
		expected_eol: "2027-05-14",
		life_expectancy: "2",
		replacement_plan: "Replace platform",
	});
	const planned = createNote("Phoebe", "planned", {
		purchase_date: "",
		expected_eol: "",
		life_expectancy: "5",
		replacement_plan: "",
	});

	const result = executeDataviewLite(
		`table without id
			link(file.link, title) as "System",
			choice(status="active", "🟩", "🟨") as "Status",
			purchase_date as "Köpt",
			expected_eol as "Planerad EoL",
			life_expectancy as "Livslängd",
			replacement_plan as "Ersättningsplan"
		from "07 Mitt Homelab/07.05 Hardware_specs"
		where type = "server"
		sort expected_eol asc`,
		[current, planned],
		current
	);

	assert.equal(result.type, "table");
	if (result.type !== "table") {
		return;
	}

	assert.deepEqual(result.columns.map((column) => column.label), [
		"System",
		"Status",
		"Köpt",
		"Planerad EoL",
		"Livslängd",
		"Ersättningsplan",
	]);
	assert.deepEqual(result.rows, [
		[
			{ kind: "link", href: "/notes/phoebe", label: "Phoebe" },
			{ kind: "text", value: "🟨" },
			{ kind: "empty" },
			{ kind: "empty" },
			{ kind: "text", value: "5" },
			{ kind: "empty" },
		],
		[
			{ kind: "link", href: "/notes/truenas", label: "Truenas" },
			{ kind: "text", value: "🟩" },
			{ kind: "date", timestamp: new Date("2025-02-14").getTime() },
			{ kind: "date", timestamp: new Date("2027-05-14").getTime() },
			{ kind: "text", value: "2" },
			{ kind: "text", value: "Replace platform" },
		],
	]);
});

test("supports multiple source folders, existence filters and rounded division", () => {
	const current = createNote(
		"Current server",
		"active",
		{ cost: "17354", life_expectancy: "2" },
		"07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current/current.md"
	);
	const planned = createNote(
		"Planned server",
		"planned",
		{ cost: "26000", life_expectancy: "8" },
		"07 Mitt Homelab/07.05 Hardware_specs/07.05.02 Planned/planned.md"
	);
	const unrelated = createNote(
		"Unrelated server",
		"active",
		{ cost: "99999", life_expectancy: "1" },
		"Elsewhere/unrelated.md"
	);

	const result = executeDataviewLite(
		`table without id
			link(file.link, title) as "System",
			cost as "Inköpskostnad (SEK)",
			(round(cost / life_expectancy)) as "Kostnad/år (SEK)"
		from "07 Mitt Homelab/07.05 Hardware_specs/07.05.01 Current" or "07 Mitt Homelab/07.05 Hardware_specs/07.05.02 Planned"
		where cost
		sort cost desc`,
		[current, planned, unrelated],
		current
	);

	assert.equal(result.type, "table");
	if (result.type !== "table") {
		return;
	}

	assert.deepEqual(result.rows.map((row) => row[0]), [
		{ kind: "link", href: "/notes/planned server", label: "Planned server" },
		{ kind: "link", href: "/notes/current server", label: "Current server" },
	]);
	assert.deepEqual(result.rows.map((row) => row[2]), [
		{ kind: "text", value: "3250" },
		{ kind: "text", value: "8677" },
	]);
});

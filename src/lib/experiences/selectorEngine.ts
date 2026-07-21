import type { FrontmatterValue, LibraryItem } from "src/lib/vault";

export interface FrontmatterExperienceSelector {
	type: "frontmatter";
	field: string;
	value: string | string[];
}

export interface PathExperienceSelector {
	type: "path";
	value: string;
}

export type ExperienceSelector = FrontmatterExperienceSelector | PathExperienceSelector;

function normalizeComparableValue(value: string) {
	return value.trim().replace(/^["']|["']$/g, "").toLocaleLowerCase("en");
}

function normalizePath(value: string) {
	return value
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "")
		.replace(/\/{2,}/g, "/")
		.trim()
		.toLocaleLowerCase("en");
}

function getFrontmatterValue(note: LibraryItem, field: string): FrontmatterValue | undefined {
	const directValue = note.frontmatter[field];
	if (directValue !== undefined) {
		return directValue;
	}

	const normalizedField = field.toLocaleLowerCase("en");
	const matchingEntry = Object.entries(note.frontmatter).find(
		([key]) => key.toLocaleLowerCase("en") === normalizedField
	);
	return matchingEntry?.[1];
}

function matchesFrontmatterSelector(note: LibraryItem, selector: FrontmatterExperienceSelector) {
	const rawValue = getFrontmatterValue(note, selector.field);
	const values = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
	const expectedValues = (Array.isArray(selector.value) ? selector.value : [selector.value]).map(
		normalizeComparableValue
	);

	return values.some((value) => expectedValues.includes(normalizeComparableValue(value)));
}

function matchesPathSelector(note: LibraryItem, selector: PathExperienceSelector) {
	const selectorPath = normalizePath(selector.value);
	if (!selectorPath) {
		return false;
	}

	const notePath = normalizePath(note.relativePath);
	return notePath === selectorPath || notePath.startsWith(`${selectorPath}/`);
}

export function matchesExperienceSelector(note: LibraryItem, selector: ExperienceSelector) {
	switch (selector.type) {
		case "frontmatter":
			return matchesFrontmatterSelector(note, selector);
		case "path":
			return matchesPathSelector(note, selector);
	}
}

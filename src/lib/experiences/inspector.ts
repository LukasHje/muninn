import { extractHeadingSections } from "src/lib/markdown/core";
import type { ExperienceDefinition } from "src/lib/experiences/registry";
import type { LibraryItem } from "src/lib/vault";

export interface InspectorSection {
	title: string;
	content: string;
}

export interface ExperienceInspectorModel {
	note: LibraryItem;
	sections: InspectorSection[];
	noteHref: string;
	redirectTo: string;
}

function normalizeTitle(value: string) {
	return value.trim().toLocaleLowerCase("en");
}

function normalizeListLine(value: string) {
	return value.trim().replace(/^[-*•]\s*/, "");
}

export function buildInspectorSections(note: LibraryItem, definition: ExperienceDefinition): InspectorSection[] {
	const sections = extractHeadingSections(note.content, 2);
	const sectionMap = new Map(sections.map((section) => [section.normalizedTitle, section]));

	return definition.inspectorSections
		.map((title) => sectionMap.get(normalizeTitle(title)))
		.filter(Boolean)
		.map((section) => ({
			title: section!.title,
			content: section!.content,
		}));
}

export function buildExperienceInspectorModel(
	note: LibraryItem,
	definition: ExperienceDefinition,
	redirectTo: string
): ExperienceInspectorModel {
	return {
		note,
		sections: buildInspectorSections(note, definition),
		noteHref: note.href,
		redirectTo,
	};
}

export function getInspectorBulletItems(content: string): string[] {
	return content
		.split(/\r?\n/g)
		.map(normalizeListLine)
		.filter(Boolean);
}

export function getInspectorFirstParagraph(content: string): string {
	return content
		.split(/\r?\n\s*\r?\n/g)
		.map((paragraph) => paragraph.trim())
		.find(Boolean) ?? "";
}

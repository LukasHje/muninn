import { extractHeadingSections } from "src/lib/markdown/core";
import type { ExperienceDefinition } from "src/lib/experiences/registry";
import type { LibraryItem } from "src/lib/vault";

export interface InspectorSection {
	title: string;
	content: string;
}

function normalizeTitle(value: string) {
	return value.trim().toLocaleLowerCase("en");
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

import { stripMarkdown } from "src/lib/parser";
import type { ExperienceMetadataIconDescriptor } from "src/lib/experiences/metadataIcons";
import { getMetadataIcon } from "src/lib/experiences/metadataIcons";
import { getCanonicalExperienceStatus } from "src/lib/experiences/status";
import type { LibraryItem, FrontmatterValue } from "src/lib/vault";
import type { ExperienceDefinition, ExperienceKey } from "src/lib/experiences/registry";

export interface ExperienceMetadataEntry {
	key: string;
	label: string;
	value: string;
	icon: ExperienceMetadataIconDescriptor;
}

function normalizeStringValue(value: string) {
	const normalized = value.trim();
	return normalized && normalized.toLowerCase() !== "null" ? normalized : null;
}

function normalizeMetadataValue(value: FrontmatterValue | undefined) {
	if (Array.isArray(value)) {
		return value.map((entry) => normalizeStringValue(entry)).filter(Boolean) as string[];
	}

	if (typeof value === "string") {
		const normalized = normalizeStringValue(value);
		return normalized ? [normalized] : [];
	}

	return [];
}

function humanizeValue(value: string) {
	return value
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

const metadataLabels: Record<string, string> = {
	type: "Type",
	status: "Status",
	category: "Category",
	manufacturer: "Manufacturer",
	variant: "Variant",
	rating: "Rating",
	updated: "Updated",
	tags: "Tags",
};

function cleanImageReference(value: string) {
	return value
		.replace(/^\[\[|\]\]$/g, "")
		.replace(/\|.*$/, "")
		.trim();
}

function resolveConfiguredImage(note: LibraryItem, key: string) {
	const rawValue = note.frontmatter[key];
	const [value] = normalizeMetadataValue(rawValue);
	if (!value) {
		return null;
	}

	if (/^(?:https?:)?\//i.test(value)) {
		return value;
	}

	const cleaned = cleanImageReference(value);
	return note.imageReferences[value] ?? note.imageReferences[cleaned] ?? null;
}


const experienceNoteSelectors: Record<ExperienceKey, (note: LibraryItem) => boolean> = {
	gear: (note) => note.normalized.type === "gear",
};

export function matchesExperienceDefinition(note: LibraryItem, definition: ExperienceDefinition) {
	return experienceNoteSelectors[definition.key]?.(note) ?? false;
}

export function getExperienceNotes(items: LibraryItem[], definition: ExperienceDefinition) {
	return items.filter((item) => matchesExperienceDefinition(item, definition));
}

export function getNoteMetadataValues(note: LibraryItem, key: string) {
	if (key === "type") {
		return note.normalized.type && note.normalized.type !== "note" ? [note.normalized.type] : [];
	}

	if (key === "updated") {
		return note.updatedLabel ? [note.updatedLabel] : [];
	}

	if (key === "status") {
		const [rawStatus] = normalizeMetadataValue(note.frontmatter[key] ?? note.normalized.metadata[key]);
		const canonicalStatus = getCanonicalExperienceStatus(rawStatus);
		return canonicalStatus ? [canonicalStatus] : [];
	}

	if (key === "tags") {
		const explicitTags = normalizeMetadataValue(note.frontmatter.tags);
		return explicitTags.length > 0 ? explicitTags : note.tags;
	}

	return normalizeMetadataValue(note.frontmatter[key] ?? note.normalized.metadata[key]);
}

export function getNoteMetadataValue(note: LibraryItem, key: string) {
	return getNoteMetadataValues(note, key)[0] ?? null;
}

export function getReadableMetadataValue(value: string) {
	return humanizeValue(value);
}

export function getReadableMetadataLabel(key: string) {
	return metadataLabels[key] ?? humanizeValue(key);
}

export function getExperienceMetadataEntries(note: LibraryItem, keys: string[]) {
	return keys
		.map((key) => {
			const values = getNoteMetadataValues(note, key);
			const value = values[0] ?? null;
			return value && values.length > 0
				? {
						key,
						label: getReadableMetadataLabel(key),
						value: values.map((entry) => getReadableMetadataValue(entry)).join(", "),
						icon: getMetadataIcon(key, value),
					}
				: null;
		})
		.filter(Boolean) as ExperienceMetadataEntry[];
}

export function getExperienceContextTags(note: LibraryItem, max = 4) {
	const noteTags = getNoteMetadataValues(note, "tags");
	return noteTags
		.slice(0, max)
		.map((tag) => getReadableMetadataValue(tag));
}

export function getCardImage(note: LibraryItem, definition: ExperienceDefinition) {
	return (
		resolveConfiguredImage(note, "thumbnail") ??
		resolveConfiguredImage(note, "cover") ??
		note.imageUrl ??
		definition.placeholderThumbnail
	);
}

export function getInspectorImage(note: LibraryItem, definition: ExperienceDefinition) {
	return (
		resolveConfiguredImage(note, "cover") ??
		resolveConfiguredImage(note, "thumbnail") ??
		note.imageUrl ??
		definition.placeholderThumbnail
	);
}

export function isPlaceholderExperienceImage(imageUrl: string, definition: ExperienceDefinition) {
	return imageUrl === definition.placeholderThumbnail;
}

export function getNoteSummary(note: LibraryItem) {
	const lines = note.content.split("\n");
	const summaryLines: string[] = [];
	let hasReachedBody = false;

	for (const line of lines) {
		if (!hasReachedBody) {
			if (/^#\s+/.test(line.trim())) {
				hasReachedBody = true;
			}
			continue;
		}

		if (/^##\s+/.test(line.trim())) {
			break;
		}

		summaryLines.push(line);
	}

	const summary = stripMarkdown(summaryLines.join("\n")).trim();
	return summary || note.excerpt;
}

import { stripMarkdown } from "src/lib/parser";
import type { ExperienceMetadataIconDescriptor } from "src/lib/experiences/metadataIcons";
import { getMetadataIcon } from "src/lib/experiences/metadataIcons";
import { getRecipeKindFromSignals } from "src/lib/experiences/recipeKinds";
import { getCanonicalExperienceStatus } from "src/lib/experiences/status";
import { getVehicleCategory } from "src/lib/experiences/vehicleCategories";
import { matchesExperienceSelector } from "src/lib/experiences/selectorEngine";
import type { LibraryItem, FrontmatterValue } from "src/lib/vault";
import type { ExperienceDefinition } from "src/lib/experiences/registry";

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
	description: "Description",
	ingredients: "Ingredients",
	prep_time: "Prep time",
	cook_time: "Cook time",
	total_time: "Total time",
	difficulty: "Difficulty",
	servings: "Servings",
	cuisine: "Cuisine",
	collection: "Collections",
	reviewed: "Reviewed",
	favorite: "Favorite",
	recipe_kind: "Recipe kind",
	vehicle_status: "Status",
	vehicle_category: "Vehicle category",
	body_style: "Body style",
	drivetrain: "Drivetrain",
	fuel: "Fuel",
	transmission: "Transmission",
	model: "Model",
	generation: "Generation",
	year: "Year",
	mileage: "Mileage",
	owner: "Owner",
	location: "Location",
	updated: "Updated",
	tags: "Tags",
};

const metadataAliases: Record<string, string[]> = {
	category: ["category", "categories", "kategori"],
	categories: ["category", "categories", "kategori"],
	collection: ["collection", "collections"],
	collections: ["collection", "collections"],
	ingredients: ["ingredients", "ingredient"],
	manufacturer: ["manufacturer", "make", "brand", "märke", "marke", "tillverkare"],
	model: ["model", "modell"],
	generation: ["generation", "gen", "variant"],
	year: ["year", "årsmodell", "arsmodell", "model_year"],
	body_style: ["body_style", "body", "category", "categories", "kaross", "karosstyp", "fordonstyp"],
	drivetrain: ["drivetrain", "drive", "drivlina", "drift", "wheel_drive"],
	fuel: ["fuel", "fuel_type", "bränsle", "bransle"],
	transmission: ["transmission", "gearbox", "växellåda", "vaxellada"],
	mileage: ["mileage", "odometer", "mil", "miltal", "km", "kilometer"],
	owner: ["owner", "ägare", "agare"],
	location: ["location", "plats", "garage"],
	rating: ["rating", "betyg"],
	servings: ["servings", "portioner"],
};

const plannedVehicleMetadataFallbacks: Record<string, string> = {
	drivetrain: "target_drivetrain",
	fuel: "target_fuel",
	transmission: "target_transmission",
};

function normalizeVehicleStatus(value: string | null) {
	const normalized = value?.trim().toLocaleLowerCase("en") ?? "";

	if (!normalized) {
		return null;
	}

	if (["owned", "own", "active", "current", "ägda", "ägd", "agda", "agd"].includes(normalized)) {
		return "owned";
	}

	if (
		[
			"planned",
			"planning",
			"planerad",
			"planerat",
			"plan",
			"wishlist",
			"wish",
			"wanted",
			"candidate",
			"considered",
			"önskelista",
			"onskelista",
		].includes(normalized)
	) {
		return "planned";
	}

	if (["reviewed", "tested", "utvärderad", "utvarderad"].includes(normalized)) {
		return "reviewed";
	}

	if (["archived", "archive", "retired", "sold", "såld", "sald"].includes(normalized)) {
		return "archived";
	}

	return normalized;
}

function isVehicleNote(note: LibraryItem) {
	return ["vehicle", "vehicles", "fordon"].includes(note.normalized.type.trim().toLocaleLowerCase("en"));
}

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


export function matchesExperienceDefinition(note: LibraryItem, definition: ExperienceDefinition) {
	return matchesExperienceSelector(note, definition.selector);
}

export function getExperienceNotes(items: LibraryItem[], definition: ExperienceDefinition) {
	return items.filter((item) => matchesExperienceDefinition(item, definition));
}

export function getNoteMetadataValues(note: LibraryItem, key: string): string[] {
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

	if (key === "favorite") {
		const explicitFavorite = normalizeMetadataValue(note.frontmatter.favorite)[0]?.toLocaleLowerCase("en");
		return note.favorite || ["true", "yes", "1"].includes(explicitFavorite ?? "") ? ["true"] : [];
	}

	if (key === "reviewed") {
		const explicitReviewed = normalizeMetadataValue(note.frontmatter.reviewed)[0]?.toLocaleLowerCase("en");
		return [["true", "yes", "1", "done", "reviewed"].includes(explicitReviewed ?? "") ? "true" : "false"];
	}

	if (key === "vehicle_status") {
		const [rawStatus] = ["vehicle_status", "status", "state"].flatMap((metadataKey) =>
			normalizeMetadataValue(note.frontmatter[metadataKey] ?? note.normalized.metadata[metadataKey])
		);
		const normalizedStatus = normalizeVehicleStatus(rawStatus);
		return normalizedStatus ? [normalizedStatus] : [];
	}

	if (key === "vehicle_category") {
		return Array.from(
			new Set(getNoteMetadataValues(note, "body_style").map((value) => getVehicleCategory(value)))
		);
	}

	if (key === "recipe_kind") {
		return [
			getRecipeKindFromSignals({
				title: note.title,
				path: note.relativePath,
				tags: note.tags,
				categories: getNoteMetadataValues(note, "category"),
				cuisine: getNoteMetadataValue(note, "cuisine"),
				collections: getNoteMetadataValues(note, "collection"),
				content: note.content,
			}),
		];
	}

	const aliasedKeys = metadataAliases[key] ?? [key];
	const values = aliasedKeys.flatMap((metadataKey) =>
		normalizeMetadataValue(note.frontmatter[metadataKey] ?? note.normalized.metadata[metadataKey])
	);
	const targetFallbackKey = plannedVehicleMetadataFallbacks[key];
	const targetValues = values.length === 0
		&& targetFallbackKey
		&& isVehicleNote(note)
		&& getNoteMetadataValues(note, "vehicle_status").includes("planned")
		? normalizeMetadataValue(
				note.frontmatter[targetFallbackKey] ?? note.normalized.metadata[targetFallbackKey]
			)
		: [];
	const resolvedValues = values.length > 0 ? values : targetValues;

	if (key === "drivetrain" && resolvedValues.length === 0) {
		return ["Other"];
	}

	return Array.from(new Set(resolvedValues));
}

export function getNoteMetadataValue(note: LibraryItem, key: string): string | null {
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

export function getExperienceContextTags(note: LibraryItem, max = 4): string[] {
	const noteTags = getNoteMetadataValues(note, "tags");
	return noteTags
		.slice(0, max)
		.map((tag) => getReadableMetadataValue(tag));
}

export function getCardImage(
	note: LibraryItem,
	definition: ExperienceDefinition,
	placeholderThumbnail = definition.assets.placeholderThumbnail
) {
	return (
		resolveConfiguredImage(note, "thumbnail") ??
		resolveConfiguredImage(note, "cover") ??
		note.imageUrl ??
		placeholderThumbnail
	);
}

export function getInspectorImage(
	note: LibraryItem,
	definition: ExperienceDefinition,
	placeholderThumbnail = definition.assets.placeholderThumbnail
) {
	return (
		resolveConfiguredImage(note, "cover") ??
		resolveConfiguredImage(note, "thumbnail") ??
		note.imageUrl ??
		placeholderThumbnail
	);
}

export function isPlaceholderExperienceImage(imageUrl: string | null, definition: ExperienceDefinition) {
	const placeholders = [
		definition.assets.placeholderThumbnail,
		...Object.values(definition.assets.placeholderThumbnailsByCategory ?? {}),
	];
	return Boolean(imageUrl && placeholders.includes(imageUrl));
}

export function getNoteSummary(note: LibraryItem) {
	const [description] = normalizeMetadataValue(note.frontmatter.description);
	if (description) {
		return description;
	}

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

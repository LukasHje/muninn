import { buildMetadataFilterOptions, type ExperienceFilterOption } from "src/lib/experiences/filters";
import { getRecipeKindFromSignals, normalizeRecipeKindText, type RecipeKind } from "src/lib/experiences/recipeKinds";
import { getNoteMetadataValue, getNoteMetadataValues } from "src/lib/experiences/selectors";
import type { LibraryItem } from "src/lib/vault";

export interface RecipeMetadata {
	ingredients: string[];
	prepTime: string | null;
	cookTime: string | null;
	totalTime: string | null;
	difficulty: string | null;
	servings: string | null;
	rating: number | null;
	reviewed: boolean;
	favorite: boolean;
	categories: string[];
	collections: string[];
	cuisine: string | null;
	status: RecipeLifecycleStatus | null;
}

export type RecipeLifecycleStatus = "made" | "to-try";

export interface RecipeCuisineShare extends ExperienceFilterOption {
	percentage: number;
}

export interface RecipeDashboardModel {
	totalRecipes: number;
	favoriteRecipes: number;
	ratedRecipes: number;
	featured: LibraryItem[];
	recent: LibraryItem[];
	categories: ExperienceFilterOption[];
	collections: ExperienceFilterOption[];
	quickMeals: number;
	vegetarian: number;
	needsReview: number;
	averageTotalMinutes: number | null;
	averageRating: number | null;
	mostCommonCuisine: string | null;
	recipeKinds: RecipeKindCount[];
	cuisineSplit: RecipeCuisineShare[];
}

export interface RecipeKindCount {
	value: RecipeKind;
	label: string;
	count: number;
	icon: string;
}

export interface RecipeServingPresentation {
	icon: "cookie" | "users";
	label: "Pieces" | "Servings";
}

function parseBoolean(value: string | null) {
	return ["true", "yes", "1", "done", "reviewed"].includes(value?.trim().toLocaleLowerCase("en") ?? "");
}

function parseRating(value: string | null) {
	if (!value) {
		return null;
	}

	const rating = Number.parseFloat(value.replace(",", "."));
	return Number.isFinite(rating) ? rating : null;
}

function normalizeRecipeStatus(value: string | null): RecipeLifecycleStatus | null {
	const normalized = normalizeRecipeText(value ?? "").replace(/[-_]+/g, " ");

	if (["made", "cooked", "tried", "done", "lagad", "tillagad", "provad"].includes(normalized)) {
		return "made";
	}

	if (
		[
			"to try",
			"try",
			"planned",
			"wishlist",
			"want to try",
			"ska provas",
			"att prova",
		].includes(normalized)
	) {
		return "to-try";
	}

	return null;
}

export function getRecipeServingPresentation(
	note: LibraryItem,
	servings: string | null
): RecipeServingPresentation {
	const describesPieces = /(?:^|\s)(?:ca\.?\s*)?\d+(?:[.,]\d+)?\s*(?:st\.?|stycken)(?:\s|$)/i.test(
		servings ?? ""
	);
	const recipeIdentity = normalizeRecipeKindText(
		[note.title, note.relativePath, ...note.tags, ...getNoteMetadataValues(note, "category")].join(" ")
	);
	const isCookieRecipe = /\b(?:cookie|cookies|biscuit|biscuits|kex|smakaka|smakakor|snittkaka|snittkakor|snittar)\b/.test(
		recipeIdentity
	);

	return describesPieces && isCookieRecipe
		? { icon: "cookie", label: "Pieces" }
		: { icon: "users", label: "Servings" };
}

export function parseRecipeDurationMinutes(value: string | null) {
	if (!value) {
		return null;
	}

	const normalized = value.trim().toLocaleLowerCase("en");
	const isoMatch = normalized.match(/^pt(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?$/i);
	if (isoMatch) {
		const hours = Number.parseFloat(isoMatch[1] ?? "0");
		const minutes = Number.parseFloat(isoMatch[2] ?? "0");
		return Math.round(hours * 60 + minutes);
	}

	const hourMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours|tim|timmar)\b/);
	const minuteMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:m|min|mins|minute|minutes|minuter)\b/);
	if (hourMatch || minuteMatch) {
		const hours = Number.parseFloat((hourMatch?.[1] ?? "0").replace(",", "."));
		const minutes = Number.parseFloat((minuteMatch?.[1] ?? "0").replace(",", "."));
		return Math.round(hours * 60 + minutes);
	}

	const plainMinutes = normalized.match(/^~?(\d+)$/);
	return plainMinutes ? Number.parseInt(plainMinutes[1], 10) : null;
}

function normalizeRecipeText(value: string) {
	return normalizeRecipeKindText(value);
}

function cleanMarkdownIngredientLine(line: string) {
	return line
		.trim()
		.replace(/^[-*+]\s+/, "")
		.replace(/^\d+[.)]\s+/, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, "$1")
		.replace(/\*\*|__|`/g, "")
		.replace(/\([^)]*\)/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function extractIngredientLinesFromContent(content: string) {
	const lines = content.split("\n");
	const ingredients: string[] = [];
	let ingredientHeadingDepth: number | null = null;

	for (const line of lines) {
		const trimmed = line.trim();
		const headingMatch = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);

		if (headingMatch) {
			const headingDepth = headingMatch[1].length;
			const heading = normalizeRecipeText(headingMatch[2]);
			if (/^(ingredients?|ingredienser|ingredienserna|det har behovs|du behover)/.test(heading)) {
				ingredientHeadingDepth = headingDepth;
			} else if (ingredientHeadingDepth !== null && headingDepth <= ingredientHeadingDepth) {
				ingredientHeadingDepth = null;
			}
			continue;
		}

		if (ingredientHeadingDepth === null) {
			continue;
		}

		if (/^---+$/.test(trimmed)) {
			break;
		}

		if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
			const cleaned = cleanMarkdownIngredientLine(trimmed);
			if (cleaned) {
				ingredients.push(cleaned);
			}
		}
	}

	return ingredients;
}

function getRawRecipeIngredients(note: LibraryItem) {
	return [
		...getNoteMetadataValues(note, "ingredients"),
		...extractIngredientLinesFromContent(note.content),
	];
}

function isFeaturedRecipe(metadata: RecipeMetadata) {
	return metadata.favorite || (metadata.rating ?? 0) >= 4;
}

function getRecipeKind(note: LibraryItem, metadata: RecipeMetadata): RecipeKindCount["value"] {
	return getRecipeKindFromSignals({
		title: note.title,
		path: note.relativePath,
		tags: note.tags,
		categories: metadata.categories,
		cuisine: metadata.cuisine,
		collections: metadata.collections,
		content: note.content,
	});
}

function buildRecipeKindCounts(items: Array<{ note: LibraryItem; metadata: RecipeMetadata }>): RecipeKindCount[] {
	const definitions: RecipeKindCount[] = [
		{ value: "food", label: "Food", count: 0, icon: "utensils" },
		{ value: "drink", label: "Drink", count: 0, icon: "martini" },
		{ value: "dessert", label: "Dessert", count: 0, icon: "ice-cream-bowl" },
		{ value: "other", label: "Other", count: 0, icon: "circle-help" },
	];
	const counts = new Map<RecipeKindCount["value"], number>(definitions.map((definition) => [definition.value, 0]));

	for (const item of items) {
		const kind = getRecipeKind(item.note, item.metadata);
		counts.set(kind, (counts.get(kind) ?? 0) + 1);
	}

	return definitions.map((definition) => ({ ...definition, count: counts.get(definition.value) ?? 0 }));
}

function buildCuisineSplit(options: ExperienceFilterOption[]): RecipeCuisineShare[] {
	const total = options.reduce((sum, option) => sum + option.count, 0);
	if (total === 0) {
		return [];
	}

	const visible = options.slice(0, 5);
	const remainingCount = options.slice(5).reduce((sum, option) => sum + option.count, 0);
	const grouped = remainingCount > 0
		? [...visible, { value: "other", label: "Other", count: remainingCount }]
		: visible;

	return grouped.map((option) => ({
		...option,
		percentage: Math.round((option.count / total) * 100),
	}));
}

export function getRecipeMetadata(note: LibraryItem): RecipeMetadata {
	const ingredients = getRawRecipeIngredients(note);

	return {
		ingredients,
		prepTime: getNoteMetadataValue(note, "prep_time"),
		cookTime: getNoteMetadataValue(note, "cook_time"),
		totalTime: getNoteMetadataValue(note, "total_time"),
		difficulty: getNoteMetadataValue(note, "difficulty"),
		servings: getNoteMetadataValue(note, "servings"),
		rating: parseRating(getNoteMetadataValue(note, "rating")),
		reviewed: parseBoolean(getNoteMetadataValue(note, "reviewed")),
		favorite: getNoteMetadataValues(note, "favorite").includes("true"),
		categories: getNoteMetadataValues(note, "category"),
		collections: getNoteMetadataValues(note, "collection"),
		cuisine: getNoteMetadataValue(note, "cuisine"),
		status: normalizeRecipeStatus(getNoteMetadataValue(note, "recipe_status")),
	};
}

function compareFeatured(left: LibraryItem, right: LibraryItem) {
	const leftMetadata = getRecipeMetadata(left);
	const rightMetadata = getRecipeMetadata(right);

	if (leftMetadata.favorite !== rightMetadata.favorite) {
		return leftMetadata.favorite ? -1 : 1;
	}

	if ((leftMetadata.rating ?? 0) !== (rightMetadata.rating ?? 0)) {
		return (rightMetadata.rating ?? 0) - (leftMetadata.rating ?? 0);
	}

	return right.updatedAt - left.updatedAt;
}

export function buildRecipeDashboardModel(notes: LibraryItem[]): RecipeDashboardModel {
	const metadata = notes.map((note) => ({ note, metadata: getRecipeMetadata(note) }));
	const totalMinutes = metadata
		.map(({ metadata: item }) => parseRecipeDurationMinutes(item.totalTime ?? item.cookTime))
		.filter((value): value is number => value !== null);
	const categories = buildMetadataFilterOptions(notes, "category");
	const collections = buildMetadataFilterOptions(notes, "collection");
	const cuisines = buildMetadataFilterOptions(notes, "cuisine");
	const ratings = metadata
		.map(({ metadata: item }) => item.rating)
		.filter((value): value is number => value !== null);

	return {
		totalRecipes: notes.length,
		favoriteRecipes: metadata.filter(({ metadata: item }) => item.favorite).length,
		ratedRecipes: ratings.length,
		featured: metadata
			.filter(({ metadata: item }) => isFeaturedRecipe(item))
			.map(({ note }) => note)
			.sort(compareFeatured)
			.slice(0, 3),
		recent: [...notes].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 4),
		categories: categories.slice(0, 6),
		collections: collections.slice(0, 6),
		quickMeals: metadata.filter(({ metadata: item }) => {
			const duration = parseRecipeDurationMinutes(item.totalTime ?? item.cookTime);
			return duration !== null && duration <= 30;
		}).length,
		vegetarian: metadata.filter(({ metadata: item }) =>
			item.categories.some((category) => category.toLocaleLowerCase("en").includes("vegetar"))
		).length,
		needsReview: metadata.filter(({ metadata: item }) => !item.reviewed).length,
		averageTotalMinutes:
			totalMinutes.length > 0
				? Math.round(totalMinutes.reduce((sum, value) => sum + value, 0) / totalMinutes.length)
				: null,
		averageRating:
			ratings.length > 0
				? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
				: null,
		mostCommonCuisine: cuisines[0]?.label ?? null,
		recipeKinds: buildRecipeKindCounts(metadata),
		cuisineSplit: buildCuisineSplit(cuisines),
	};
}

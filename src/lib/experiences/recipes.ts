import { buildMetadataFilterOptions, type ExperienceFilterOption } from "src/lib/experiences/filters";
import { getRecipeKindFromSignals, normalizeRecipeKindText, type RecipeKind } from "src/lib/experiences/recipeKinds";
import { getNoteMetadataValue, getNoteMetadataValues } from "src/lib/experiences/selectors";
import type { LibraryItem } from "src/lib/vault";

export interface RecipeMetadata {
	ingredients: string[];
	ingredientGroups: ExperienceFilterOption[];
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
	ingredients: RecipeIngredientOption[];
	collections: ExperienceFilterOption[];
	quickMeals: number;
	vegetarian: number;
	needsReview: number;
	averageTotalMinutes: number | null;
	averageRating: number | null;
	mostCommonCuisine: string | null;
	mostCommonIngredient: string | null;
	recipeKinds: RecipeKindCount[];
	cuisineSplit: RecipeCuisineShare[];
}

export interface RecipeKindCount {
	value: RecipeKind;
	label: string;
	count: number;
	icon: string;
}

export interface RecipeIngredientOption extends ExperienceFilterOption {
	icon: string;
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

function titleCase(value: string) {
	return value
		.split(" ")
		.filter(Boolean)
		.map((part) => part.charAt(0).toLocaleUpperCase("en") + part.slice(1))
		.join(" ");
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

function stripIngredientAmount(value: string) {
	return value
		.replace(
			/^(?:ca\.?|cirka|about|approx\.?)?\s*(?:\d+(?:[.,/]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(?:x\s*)?(?:dl|cl|ml|l|g|kg|mg|oz|ounce|ounces|tbsp|tsk|msk|tsp|tablespoons?|teaspoons?|st|st\.|pcs?|paket|package|packages|burk|cans?|klyftor?|dash|nypa|pinch)?\s+/i,
			""
		)
		.replace(/^(?:dash|pinch|nypa)\s+(?:of\s+)?/i, "")
		.replace(/\s+(?:for|to)\s+(?:the\s+)?(?:rim|garnish|serving).*$/i, "")
		.trim();
}

function extractIngredientLinesFromContent(content: string) {
	const lines = content.split("\n");
	const ingredients: string[] = [];
	let insideIngredients = false;

	for (const line of lines) {
		const trimmed = line.trim();
		const headingMatch = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);

		if (headingMatch) {
			const heading = normalizeRecipeText(headingMatch[2]);
			insideIngredients = /^(ingredients?|ingredienser|ingredienserna|det har behovs|du behover)/.test(heading);
			continue;
		}

		if (!insideIngredients) {
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

const ingredientCategoryMatchers: Array<{ label: string; icon: string; match: RegExp }> = [
	{ label: "Beer", icon: "beer", match: /\b(beer|ol|öl|lager|ipa|stout|porter|ale)\b/ },
	{ label: "Wine", icon: "wine", match: /\b(wine|vin|red wine|rott vin|rött vin|white wine|vitt vin|rose|rosé|champagne|prosecco)\b/ },
	{ label: "Water", icon: "glass-water", match: /\b(water|vatten|mineral water|mineralvatten|sparkling water|kolsyrat vatten)\b/ },
	{ label: "Soda", icon: "cup-soda", match: /\b(soda|läsk|lask|cola|tonic|lemonade|sprite|fanta)\b/ },
	{ label: "Cocktail", icon: "martini", match: /\b(cocktail|drink|shot|martini|margarita|mojito|negroni)\b/ },
	{ label: "Alcohol", icon: "bottle-wine", match: /\b(vodka|whisk(?:y|ey)|rum|rom|gin|tequila|mezcal|liqueur|likor|likör|brandy|bourbon|cognac|vermouth|bacardi|fireball)\b/ },
	{ label: "Coffee", icon: "coffee", match: /\b(coffee|kaffe|espresso|cold brew|tea|te|chai|hot chocolate|varm choklad|cocoa|kakao)\b/ },
	{ label: "Shrimp", icon: "shrimp", match: /\b(shrimp|prawn|rakor|raka|räkor|räka)\b/ },
	{ label: "Seafood", icon: "shrimp", match: /\b(lobster|hummer|crab|krabba|mussel|musslor|scallop|pilgrimsmussla)\b/ },
	{ label: "Fish", icon: "fish", match: /\b(fish|fisk|salmon|lax|cod|torsk|tuna|tonfisk|herring|sill)\b/ },
	{ label: "Chicken", icon: "drumstick", match: /\b(chicken|kyckling|turkey|kalkon)\b/ },
	{ label: "Beef", icon: "beef", match: /\b(beef|notkott|nötkött|hogrev|högrev|lamb|lamm|far|får)\b/ },
	{ label: "Pork", icon: "ham", match: /\b(pork|flask|fläsk|bacon|ham|skinka)\b/ },
	{ label: "Egg", icon: "egg", match: /\b(egg|eggs|agg|ägg)\b/ },
	{ label: "Milk", icon: "milk", match: /\b(milk|mjolk|mjölk|cream|gradde|grädde|yogurt|yoghurt|creme fraiche|crème fraîche)\b/ },
	{ label: "Apple", icon: "apple", match: /\b(apple|apples|applen|äpple|äpplen|apple juice|appeljuice|äppeljuice|cider)\b/ },
	{ label: "Banana", icon: "banana", match: /\b(banana|banan|bananas|bananer)\b/ },
	{ label: "Citrus", icon: "citrus", match: /\b(citrus|orange|apelsin|lemon|citron|lime|grapefruit)\b/ },
	{ label: "Juice", icon: "blender", match: /\b(juice|smoothie|must|nectar)\b/ },
	{ label: "Berries", icon: "cherry", match: /\b(berries|bar|bär|strawberry|strawberries|jordgubb|jordgubbar|raspberry|raspberries|hallon|blueberry|blueberries|blabar|blåbär|lingon|cherry|cherries|korsbar|körsbär)\b/ },
	{ label: "Fruit", icon: "apple", match: /\b(fruit|frukt|pear|paron|päron)\b/ },
	{ label: "Nuts", icon: "nut", match: /\b(nut|nuts|not|nöt|notter|nötter|almond|almonds|mandel|mandlar|hazelnut|hazelnuts|hasselnot|hasselnöt|hasselnotter|hasselnötter|walnut|walnuts|valnot|valnöt|valnotter|valnötter|cashew|cashews|peanut|peanuts|jordnot|jordnöt|jordnotter|jordnötter|pistachio|pistachios|pecan|pecans)\b/ },
	{ label: "Spices", icon: "chili-pepper", match: /\b(chili|chilli|chile|pepper|peppar|spice|spices|krydda|kryddor|paprika|cayenne|jalapeno|jalapeño|sriracha|tabasco|hot sauce)\b/ },
	{ label: "Vegetables", icon: "carrot", match: /\b(carrot|morot|morotter|morötter|onion|lok|lök|garlic|vitlok|vitlök|tomato|tomat|potato|potatis)\b/ },
	{ label: "Leafy greens", icon: "leafy-green", match: /\b(lettuce|sallad|spinach|spenat|kale|gronkal|grönkål|ruccola|arugula)\b/ },
	{ label: "Soup", icon: "soup", match: /\b(soup|soppa|gryta|stew)\b/ },
	{ label: "Breakfast", icon: "croissant", match: /\b(breakfast|frukost|croissant|granola|pancake|pannkaka|waffle|vaffla|våffla)\b/ },
	{ label: "Cake", icon: "cake", match: /\b(cake|kaka|tarta|tårta|muffin|cupcake)\b/ },
	{ label: "Cookies", icon: "cookie", match: /\b(cookie|cookies|biscuit|biscuits|kex|smakaka|småkaka|smakakor|småkakor)\b/ },
	{ label: "Dessert", icon: "ice-cream-bowl", match: /\b(dessert|ice cream|glass|vanilla|vanilj|chocolate|choklad)\b/ },
	{ label: "Sandwich", icon: "sandwich", match: /\b(sandwich|macka|smorgas|smörgås|toast)\b/ },
	{ label: "Pizza", icon: "pizza", match: /\b(pizza|mozzarella|pepperoni)\b/ },
	{ label: "Burger", icon: "hamburger", match: /\b(burger|hamburger|cheeseburger)\b/ },
	{ label: "Cinnamon", icon: "shopping-basket", match: /\b(cinnamon|kanel)\b/ },
	{ label: "Ice", icon: "snowflake", match: /\b(ice|is|ice cubes|isbitar|krossad is|crushed ice|frozen|fryst)\b/ },
	{ label: "Sugar", icon: "candy-cane", match: /\b(sugar|socker|candy|godis|syrup|sirap)\b/ },
	{ label: "Wheat", icon: "wheat", match: /\b(wheat|vete|flour|mjol|mjöl|bread|brod|bröd|pasta)\b/ },
];

function getIngredientIcon(label: string) {
	return ingredientCategoryMatchers.find((matcher) => matcher.label === label)?.icon ?? "shopping-basket";
}

function getIngredientCategory(value: string) {
	const cleaned = stripIngredientAmount(value);
	const normalized = normalizeRecipeText(cleaned);
	const matched = ingredientCategoryMatchers.find(({ match }) => match.test(normalized));

	if (matched) {
		return matched.label;
	}

	const fallback = normalized
		.replace(/\b(fresh|ground|chopped|hackad|hackade|finhackad|finhackade|skivad|skivade)\b/g, "")
		.replace(/\s+/g, " ")
		.trim();

	return fallback ? titleCase(fallback) : null;
}

function buildRecipeIngredientGroups(note: LibraryItem) {
	const rawIngredients = [
		...getNoteMetadataValues(note, "ingredients"),
		...extractIngredientLinesFromContent(note.content),
	];

	return Array.from(new Set(rawIngredients.map(getIngredientCategory).filter(Boolean) as string[]));
}

function buildRecipeIngredientOptions(notes: LibraryItem[]) {
	const counts = new Map<string, number>();

	for (const note of notes) {
		for (const ingredient of buildRecipeIngredientGroups(note)) {
			counts.set(ingredient, (counts.get(ingredient) ?? 0) + 1);
		}
	}

	return Array.from(counts.entries())
		.sort((left, right) => {
			if (left[1] !== right[1]) {
				return right[1] - left[1];
			}

			return left[0].localeCompare(right[0], "sv");
		})
		.map(([value, count]) => ({ value, label: value, count, icon: getIngredientIcon(value) }));
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
	const ingredientGroups = buildRecipeIngredientGroups(note);

	return {
		ingredients: ingredientGroups,
		ingredientGroups: ingredientGroups.map((value) => ({ value, label: value, count: 1 })),
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
	const ingredients = buildRecipeIngredientOptions(notes);
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
		ingredients,
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
		mostCommonIngredient: ingredients[0]?.label ?? null,
		recipeKinds: buildRecipeKindCounts(metadata),
		cuisineSplit: buildCuisineSplit(cuisines),
	};
}

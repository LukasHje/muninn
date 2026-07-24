import assert from "node:assert/strict";
import test from "node:test";
import { buildMetadataFilterOptions, filterExperienceNotes } from "./experiences/filters";
import { buildRecipeDashboardModel, getRecipeMetadata, parseRecipeDurationMinutes } from "./experiences/recipes";
import { getExperienceDefinition } from "./experiences/registry";
import { getExperienceNotes, getNoteMetadataValues } from "./experiences/selectors";
import { buildExperienceStatistics } from "./experiences/statistics";
import type { LibraryItem } from "./vault";

function createRecipe(
	id: string,
	frontmatter: LibraryItem["frontmatter"],
	overrides: Partial<LibraryItem> = {}
): LibraryItem {
	return {
		id,
		title: id,
		href: `/notes/${id}`,
		slugPath: id,
		domainKey: "recept",
		domainLabel: "Recipe",
		domainIcon: "utensils",
		tone: "amber",
		excerpt: `${id} excerpt`,
		updatedLabel: "Today",
		tags: [],
		relativePath: `${id}.md`,
		createdAt: 1,
		updatedAt: 1,
		content: `# ${id}`,
		frontmatter,
		normalized: {
			title: id,
			path: `${id}.md`,
			slug: id,
			domain: "recept",
			type: String(frontmatter.type ?? "recipe"),
			layout: "plain",
			tags: [],
			aliases: [],
			metadata: Object.fromEntries(
				Object.entries(frontmatter).filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
			),
		},
		imageReferences: {},
		...overrides,
	};
}

test("Recipes selector accepts recipe, recipes and recept without route-specific matching", () => {
	const definition = getExperienceDefinition("recipes");
	assert.ok(definition);
	const notes = [
		createRecipe("singular", { type: "recipe" }),
		createRecipe("plural", { type: "recipes" }),
		createRecipe("swedish", { type: "recept" }),
		createRecipe("other", { type: "gear" }),
	];

	assert.deepEqual(getExperienceNotes(notes, definition).map((note) => note.id), ["singular", "plural", "swedish"]);
});

test("recipe metadata merges singular and plural aliases without mutating source arrays", () => {
	const categories = ["Dinner", "Vegetarian"];
	const collections = ["Weeknight", "Family"];
	const note = createRecipe("pasta", {
		type: "recipe",
		categories,
		collections,
		ingredients: ["Tomato", "Garlic"],
	});

	assert.deepEqual(getNoteMetadataValues(note, "category"), categories);
	assert.deepEqual(getNoteMetadataValues(note, "collection"), collections);
	assert.deepEqual(categories, ["Dinner", "Vegetarian"]);
	assert.deepEqual(collections, ["Weeknight", "Family"]);
});

test("multi-value filters match any metadata value and count every unique value per note", () => {
	const notes = [
		createRecipe("one", { type: "recipe", ingredients: ["Tomato", "Garlic"] }),
		createRecipe("two", { type: "recipe", ingredients: ["Garlic", "Butter"] }),
	];
	const filtered = filterExperienceNotes(notes, {
		metadata: { ingredients: "Garlic" },
		tag: null,
		selected: null,
		inspector: "closed",
	});

	assert.deepEqual(filtered.map((note) => note.id), ["one", "two"]);
	assert.deepEqual(buildMetadataFilterOptions(notes, "ingredients"), [
		{ value: "Garlic", label: "Garlic", count: 2 },
		{ value: "Butter", label: "Butter", count: 1 },
		{ value: "Tomato", label: "Tomato", count: 1 },
	]);
});

test("recipe duration parsing supports ISO, hours and plain minutes", () => {
	assert.equal(parseRecipeDurationMinutes("PT1H30M"), 90);
	assert.equal(parseRecipeDurationMinutes("1 h 15 min"), 75);
	assert.equal(parseRecipeDurationMinutes("45 minutes"), 45);
	assert.equal(parseRecipeDurationMinutes("30"), 30);
	assert.equal(parseRecipeDurationMinutes(null), null);
});

test("dashboard aggregation prioritizes favorites and ratings while deriving cookbook insights", () => {
	const notes = [
		createRecipe("favorite", {
			type: "recipe",
			favorite: "true",
			rating: "4.5",
			total_time: "25 min",
			cuisine: "Italian",
			categories: ["Dinner", "Vegetarian"],
			ingredients: ["Tomato", "Garlic"],
			collection: "Weeknight",
			reviewed: "true",
			recipe_status: "made",
		}),
		createRecipe("rated", {
			type: "recipe",
			rating: "5",
			total_time: "1 h",
			cuisine: "Italian",
			category: "Dinner",
			ingredients: ["Tomato", "Butter"],
			recipe_status: "to_try",
		}),
	];
	const dashboard = buildRecipeDashboardModel(notes);

	assert.equal(dashboard.featured[0].id, "favorite");
	assert.equal(dashboard.quickMeals, 1);
	assert.equal(dashboard.vegetarian, 1);
	assert.equal(dashboard.needsReview, 1);
	assert.equal(dashboard.averageTotalMinutes, 43);
	assert.equal(dashboard.averageRating, 4.8);
	assert.equal(dashboard.totalRecipes, 2);
	assert.equal(dashboard.favoriteRecipes, 1);
	assert.equal(dashboard.ratedRecipes, 2);
	assert.equal(dashboard.mostCommonCuisine, "Italian");
	assert.equal(dashboard.mostCommonIngredient, "Vegetables");
	assert.deepEqual(dashboard.cuisineSplit, [
		{ value: "Italian", label: "Italian", count: 2, percentage: 100 },
	]);
	assert.equal(getRecipeMetadata(notes[0]).rating, 4.5);
	assert.equal(getRecipeMetadata(notes[0]).status, "made");
	assert.equal(getRecipeMetadata(notes[1]).status, "to-try");
});

test("recipe lifecycle status supports explicit English and Swedish aliases", () => {
	assert.equal(
		getRecipeMetadata(createRecipe("made", { type: "recipe", recipeStatus: "cooked" })).status,
		"made"
	);
	assert.equal(
		getRecipeMetadata(createRecipe("planned", { type: "recipe", recept_status: "att prova" })).status,
		"to-try"
	);
	assert.equal(
		getRecipeMetadata(createRecipe("unset", { type: "recipe", status: "published" })).status,
		null
	);
});

test("Swedish recipe frontmatter populates cards and dashboard statistics", () => {
	const note = createRecipe(
		"Brysselkex med sylt",
		{
			title: "Brysselkex med sylt",
			type: "recept",
			kategori: "bakverk",
			tags: ["småkakor", "fika", "mördeg", "hallon", "bakning", "svenskt"],
			portioner: "50 st",
			tid: "1 tim 50 min",
			betyg: "4.9",
			recipe_status: "made",
			datum: "2026-07-23",
			cover: "[[brysselkex-med-sylt.jpeg]]",
			källa: "https://receptfavoriter.se/recept/brysselkex-med-sylt.html",
		},
		{
			tags: ["småkakor", "fika", "mördeg", "hallon", "bakning", "svenskt"],
		}
	);
	const metadata = getRecipeMetadata(note);
	const dashboard = buildRecipeDashboardModel([note]);

	assert.deepEqual(metadata.categories, ["bakverk"]);
	assert.equal(metadata.servings, "50 st");
	assert.equal(metadata.totalTime, "1 tim 50 min");
	assert.equal(metadata.rating, 4.9);
	assert.equal(metadata.status, "made");
	assert.equal(dashboard.averageTotalMinutes, 110);
	assert.equal(dashboard.averageRating, 4.9);
	assert.equal(
		dashboard.recipeKinds.find(({ value }) => value === "dessert")?.count,
		1
	);
});

test("recipe dashboard exposes Food, Dessert, and Drink counts with cuisine percentages", () => {
	const notes = [
		createRecipe("main", { type: "recipe", cuisine: "Italian" }, {
			content: "# Pasta\n\n## Ingredients\n- pasta",
		}),
		createRecipe("dessert", { type: "recipe", cuisine: "Swedish" }, {
			content: "# Chocolate cake\n\n## Ingredients\n- chocolate",
		}),
		createRecipe("drink", { type: "recipe", cuisine: "Italian" }, {
			content: "# Cocktail\n\n## Ingredients\n- gin",
		}),
	];
	const dashboard = buildRecipeDashboardModel(notes);

	assert.deepEqual(
		dashboard.recipeKinds.map(({ value, count }) => ({ value, count })),
		[
			{ value: "food", count: 1 },
			{ value: "drink", count: 1 },
			{ value: "dessert", count: 1 },
			{ value: "other", count: 0 },
		]
	);
	assert.deepEqual(dashboard.cuisineSplit, [
		{ value: "Italian", label: "Italian", count: 2, percentage: 67 },
		{ value: "Swedish", label: "Swedish", count: 1, percentage: 33 },
	]);
});

test("recipe dashboard treats highly rated recipes as featured without requiring a favorite flag", () => {
	const notes = [
		createRecipe("ordinary", { type: "recipe", rating: "3.5" }),
		createRecipe("rated", { type: "recipe", rating: "4/5" }),
	];
	const dashboard = buildRecipeDashboardModel(notes);

	assert.deepEqual(dashboard.featured.map((note) => note.id), ["rated"]);
});

test("recipe dashboard derives ingredient categories from markdown ingredient sections", () => {
	const cocktail = createRecipe(
		"cocktail",
		{ type: "recept", kategori: "drink", betyg: "4.8", portioner: "1" },
		{
			content: [
				"# Hot Apple Pie Cocktail",
				"",
				"## Ingredienser",
				"- 1 ounce [vanilla vodka](https://example.com/vodka)",
				"- 1 ounce Fireball Cinnamon Whisky",
				"- 4 ounces apple juice",
				"- dash of ground cinnamon",
				"- 2 dl wheat flour",
				"- 1 dl milk",
				"- 1 dl blueberries",
				"- 1 tbsp almonds",
				"- 2 cookies",
				"- ice",
				"- chili flakes",
				"",
				"## Instruktioner",
				"Shake and serve.",
			].join("\n"),
			tags: ["cocktail", "alkohol"],
		}
	);
	const dashboard = buildRecipeDashboardModel([cocktail]);

	assert.equal(getRecipeMetadata(cocktail).rating, 4.8);
	assert.deepEqual(getRecipeMetadata(cocktail).categories, ["drink"]);
	assert.deepEqual(
		dashboard.ingredients.map(({ label, count, icon }) => ({ label, count, icon })),
		[
			{ label: "Alcohol", count: 1, icon: "bottle-wine" },
			{ label: "Apple", count: 1, icon: "apple" },
			{ label: "Berries", count: 1, icon: "cherry" },
			{ label: "Cinnamon", count: 1, icon: "shopping-basket" },
			{ label: "Cookies", count: 1, icon: "cookie" },
			{ label: "Ice", count: 1, icon: "snowflake" },
			{ label: "Milk", count: 1, icon: "milk" },
			{ label: "Nuts", count: 1, icon: "nut" },
			{ label: "Spices", count: 1, icon: "chili-pepper" },
			{ label: "Wheat", count: 1, icon: "wheat" },
		]
	);
	assert.deepEqual(
		dashboard.recipeKinds.map(({ value, count }) => ({ value, count })),
		[
			{ value: "food", count: 0 },
			{ value: "drink", count: 1 },
			{ value: "dessert", count: 0 },
			{ value: "other", count: 0 },
		]
	);
});

test("recipe kind filters use the dashboard categories without requiring frontmatter category values", () => {
	const drink = createRecipe("cocktail", { type: "recept", kategori: "drink" }, {
		content: "# Cocktail\n\n## Ingredienser\n- 4 cl gin",
	});
	const dessert = createRecipe("cake", { type: "recipe" }, {
		content: "# Chocolate cake\n\n## Ingredients\n- chocolate",
	});
	const coffee = createRecipe("chai", { type: "recipe" }, {
		content: "# Chai\n\n## Ingredients\n- tea",
	});
	const notes = [drink, dessert, coffee];

	assert.deepEqual(filterExperienceNotes(notes, {
		metadata: { recipe_kind: "drink" },
		tag: null,
		selected: null,
		inspector: "closed",
	}).map((note) => note.id), ["cocktail"]);
	assert.deepEqual(filterExperienceNotes(notes, {
		metadata: { recipe_kind: "food" },
		tag: null,
		selected: null,
		inspector: "closed",
	}).map((note) => note.id), []);
	assert.deepEqual(filterExperienceNotes(notes, {
		metadata: { recipe_kind: "dessert" },
		tag: null,
		selected: null,
		inspector: "closed",
	}).map((note) => note.id), ["cake"]);
	assert.deepEqual(filterExperienceNotes(notes, {
		metadata: { recipe_kind: "other" },
		tag: null,
		selected: null,
		inspector: "closed",
	}).map((note) => note.id), ["chai"]);
});

test("Recipes hero statistics use declarative summary metrics", () => {
	const definition = getExperienceDefinition("recipes");
	assert.ok(definition);
	const notes = [
		createRecipe("one", {
			type: "recipe",
			favorite: "true",
			collection: "Weeknight",
			ingredients: ["Tomato", "Garlic"],
		}, { tags: ["dinner", "quick"] }),
	];

	assert.deepEqual(buildExperienceStatistics(notes, definition).map(({ label, value }) => ({ label, value })), [
		{ label: "Recipes", value: "1" },
		{ label: "Favorites", value: "1" },
		{ label: "Collections", value: "1" },
		{ label: "Ingredients", value: "2" },
		{ label: "Tags", value: "2" },
	]);
});

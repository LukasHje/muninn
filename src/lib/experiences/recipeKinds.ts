export type RecipeKind = "food" | "drink" | "dessert" | "other";

export interface RecipeKindSignals {
	title: string;
	path: string;
	tags: string[];
	categories: string[];
	cuisine: string | null;
	collections: string[];
	content: string;
}

export function normalizeRecipeKindText(value: string) {
	return value
		.toLocaleLowerCase("en")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function getRecipeKindFromSignals(signals: RecipeKindSignals): RecipeKind {
	const haystack = normalizeRecipeKindText(
		[
			signals.title,
			signals.path,
			...signals.tags,
			...signals.categories,
			signals.cuisine,
			...signals.collections,
			signals.content.slice(0, 1000),
		]
			.filter(Boolean)
			.join(" ")
	);

	if (/\b(drink|drinks|cocktail|cocktails|mocktail|shot|shots|alkohol|vodka|whisk(?:y|ey)|rum|rom|gin|tequila|mezcal|liqueur|likor|likör|brandy|bourbon|cognac|vermouth|bacardi|fireball|beer|ol|öl|wine|vin)\b/.test(haystack)) {
		return "drink";
	}

	if (/\b(dessert|desserts|cake|cakes|kaka|kakor|tarta|tårta|muffin|muffins|cupcake|cupcakes|ice cream|glass|candy|godis|chocolate|choklad|paj|pie)\b/.test(haystack)) {
		return "dessert";
	}

	if (/\b(coffee|kaffe|espresso|cold brew|tea|te|chai|hot chocolate|varm choklad|cocoa|kakao)\b/.test(haystack)) {
		return "other";
	}

	if (/\b(other|ovrigt|övrigt|misc)\b/.test(haystack)) {
		return "other";
	}

	return "food";
}

export type InspectorHighlightKey = "usecase" | "keyfeatures" | "limitations" | "notes" | "ingredients" | "instructions";

const inspectorHighlightIcons: Record<InspectorHighlightKey, string> = {
	usecase: "mountain",
	keyfeatures: "circle-check",
	limitations: "circle-alert",
	notes: "notes",
	ingredients: "shopping-basket",
	instructions: "list",
};

export function getInspectorHighlightIconName(key: InspectorHighlightKey): string {
	return inspectorHighlightIcons[key];
}

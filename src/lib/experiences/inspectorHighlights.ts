export type InspectorHighlightKey = "usecase" | "keyfeatures" | "limitations" | "notes";

const inspectorHighlightIcons: Record<InspectorHighlightKey, string> = {
	usecase: "mountain",
	keyfeatures: "circle-check",
	limitations: "circle-alert",
	notes: "notes",
};

export function getInspectorHighlightIconName(key: InspectorHighlightKey): string {
	return inspectorHighlightIcons[key];
}

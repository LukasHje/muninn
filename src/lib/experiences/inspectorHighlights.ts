export type InspectorHighlightKey = "usecase" | "keyfeatures" | "limitations" | "notes";

const inspectorHighlightBasePath = "/experiences/icon-collection/inspector-highlights";

const inspectorHighlightIcons: Record<InspectorHighlightKey, string> = {
	usecase: `${inspectorHighlightBasePath}/experiences-inspector-highlight-usecase.webp`,
	keyfeatures: `${inspectorHighlightBasePath}/experiences-inspector-highlight-keyfeatures.webp`,
	limitations: `${inspectorHighlightBasePath}/experiences-inspector-highlight-limitations.webp`,
	notes: `${inspectorHighlightBasePath}/experiences-inspector-highlight-notes.webp`,
};

export function getInspectorHighlightIconSrc(key: InspectorHighlightKey): string {
	return inspectorHighlightIcons[key];
}

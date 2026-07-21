import { getExperienceStatusColor } from "src/lib/experiences/status";

export interface ExperienceMetadataIconDescriptor {
	kind: "svg";
	name: string;
	color?: string;
}

const metadataIconColor = "#585E66";

const metadataSvgFallbacks: Record<string, string> = {
	type: "metadata-type",
	status: "status",
	category: "metadata-category",
	manufacturer: "factory",
	variant: "layers-3",
	updated: "metadata-calendar",
	tags: "metadata-tags",
};

export function getMetadataIcon(key: string, value?: string | null): ExperienceMetadataIconDescriptor {
	if (key === "status") {
		return {
			kind: "svg",
			name: metadataSvgFallbacks.status,
			color: getExperienceStatusColor(value),
		};
	}

	return {
		kind: "svg",
		name: metadataSvgFallbacks[key] ?? "metadata-tags",
		color: metadataIconColor,
	};
}

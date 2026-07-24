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
	prep_time: "clock-3",
	cook_time: "clock-3",
	total_time: "clock-3",
	difficulty: "chef-hat",
	servings: "users",
	cuisine: "utensils",
	collection: "layers-3",
	rating: "star",
	ingredients: "shopping-basket",
	vehicle_status: "status",
	body_style: "car-front",
	drivetrain: "gauge",
	fuel: "fuel",
	transmission: "sliders-horizontal",
	model: "car-front",
	generation: "layers-3",
	year: "metadata-calendar",
	mileage: "gauge",
	owner: "users",
	location: "map",
};

export function getMetadataIcon(key: string, value?: string | null): ExperienceMetadataIconDescriptor {
	if (key === "status" || key === "vehicle_status") {
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

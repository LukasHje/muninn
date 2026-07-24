import { buildMetadataFilterOptions, type ExperienceFilterOption } from "src/lib/experiences/filters";
import type { ExperienceDefinition } from "src/lib/experiences/registry";
import { getNoteMetadataValue, getNoteMetadataValues } from "src/lib/experiences/selectors";
import { getVehicleCategory } from "src/lib/experiences/vehicleCategories";
import type { LibraryItem } from "src/lib/vault";

export { getVehicleCategory, getVehicleCategoryIcon } from "src/lib/experiences/vehicleCategories";

export interface VehicleMetadata {
	status: string | null;
	manufacturer: string | null;
	model: string | null;
	generation: string | null;
	year: string | null;
	bodyStyle: string | null;
	drivetrain: string | null;
	fuel: string | null;
	transmission: string | null;
	mileage: string | null;
	owner: string | null;
	location: string | null;
	rating: number | null;
	categories: string[];
	tags: string[];
}

export interface VehicleDashboardModel {
	total: number;
	owned: number;
	planned: number;
	wishlist: number;
	reviewed: number;
	averageRating: number | null;
	statuses: VehicleDashboardOption[];
	categories: VehicleDashboardOption[];
	bodyStyles: VehicleDashboardOption[];
	drivetrains: VehicleDashboardOption[];
	fuels: VehicleDashboardOption[];
	manufacturers: VehicleDashboardOption[];
	recent: LibraryItem[];
}

export interface VehicleDashboardOption extends ExperienceFilterOption {
	icon?: string;
}

export function resolveVehiclePlaceholderThumbnail(
	definition: ExperienceDefinition,
	bodyStyle: string | null
) {
	if (!bodyStyle) {
		return definition.assets.placeholderThumbnail;
	}

	const category = getVehicleCategory(bodyStyle);
	return definition.assets.placeholderThumbnailsByCategory?.[category] ?? null;
}

const vehicleStatusLabels: Record<string, string> = {
	owned: "Owned",
	planned: "Planned",
	reviewed: "Reviewed",
	archived: "Archived",
};

const vehicleStatusIcons: Record<string, string> = {
	owned: "circle-check",
	planned: "clock-3",
	reviewed: "badge-check",
	archived: "archive",
};

function parseRating(value: string | null) {
	if (!value) {
		return null;
	}

	const rating = Number.parseFloat(value.replace(",", "."));
	return Number.isFinite(rating) ? rating : null;
}

function titleCase(value: string) {
	return value
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.split(" ")
		.filter(Boolean)
		.map((part) => part.charAt(0).toLocaleUpperCase("en") + part.slice(1))
		.join(" ");
}

function buildVehicleStatusOptions(notes: LibraryItem[]): VehicleDashboardOption[] {
	const counts = new Map<string, number>([
		["owned", 0],
		["planned", 0],
		["reviewed", 0],
	]);

	for (const note of notes) {
		for (const status of new Set(getNoteMetadataValues(note, "vehicle_status"))) {
			counts.set(status, (counts.get(status) ?? 0) + 1);
		}
	}

	return Array.from(counts.entries()).map(([value, count]) => ({
		value,
		label: vehicleStatusLabels[value] ?? titleCase(value),
		count,
		icon: vehicleStatusIcons[value],
	}));
}

function countByMetadata(notes: LibraryItem[], key: string, limit?: number): VehicleDashboardOption[] {
	const options = buildMetadataFilterOptions(notes, key);
	return (limit ? options.slice(0, limit) : options)
		.map((item) => ({ ...item, label: titleCase(item.label) }));
}

function countByMetadataWithOther(notes: LibraryItem[], key: string, limit = 6): VehicleDashboardOption[] {
	const counts = new Map<string, number>();

	for (const note of notes) {
		const values = getNoteMetadataValues(note, key);
		for (const value of values.length > 0 ? new Set(values) : ["Other"]) {
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}
	}

	return Array.from(counts.entries())
		.sort((left, right) => {
			if (left[1] !== right[1]) {
				return right[1] - left[1];
			}

			if (left[0] === "Other") {
				return 1;
			}

			if (right[0] === "Other") {
				return -1;
			}

			return left[0].localeCompare(right[0], "sv");
		})
		.slice(0, limit)
		.map(([value, count]) => ({ value, label: titleCase(value), count }));
}

export function getVehicleMetadata(note: LibraryItem): VehicleMetadata {
	return {
		status: getNoteMetadataValue(note, "vehicle_status"),
		manufacturer: getNoteMetadataValue(note, "manufacturer"),
		model: getNoteMetadataValue(note, "model"),
		generation: getNoteMetadataValue(note, "generation"),
		year: getNoteMetadataValue(note, "year"),
		bodyStyle: getNoteMetadataValue(note, "body_style"),
		drivetrain: getNoteMetadataValue(note, "drivetrain"),
		fuel: getNoteMetadataValue(note, "fuel"),
		transmission: getNoteMetadataValue(note, "transmission"),
		mileage: getNoteMetadataValue(note, "mileage"),
		owner: getNoteMetadataValue(note, "owner"),
		location: getNoteMetadataValue(note, "location"),
		rating: parseRating(getNoteMetadataValue(note, "rating")),
		categories: getNoteMetadataValues(note, "category"),
		tags: getNoteMetadataValues(note, "tags"),
	};
}

export function getVehicleTitleParts(note: LibraryItem) {
	const metadata = getVehicleMetadata(note);
	const titleParts = [metadata.manufacturer, metadata.model].filter(Boolean);
	const subtitleParts = [metadata.generation, metadata.year, metadata.bodyStyle].filter(Boolean);

	return {
		title: titleParts.length > 0 ? titleParts.join(" ") : note.title,
		subtitle: subtitleParts.join(" · ") || null,
	};
}

export function buildVehicleDashboardModel(notes: LibraryItem[]): VehicleDashboardModel {
	const metadata = notes.map((note) => getVehicleMetadata(note));
	const ratings = metadata
		.map((item) => item.rating)
		.filter((rating): rating is number => rating !== null);

	return {
		total: notes.length,
		owned: metadata.filter((item) => item.status === "owned").length,
		planned: metadata.filter((item) => item.status === "planned").length,
		wishlist: 0,
		reviewed: metadata.filter((item) => item.status === "reviewed" || item.rating !== null).length,
		averageRating: ratings.length > 0
			? Number((ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1))
			: null,
		statuses: buildVehicleStatusOptions(notes),
		categories: countByMetadata(notes, "vehicle_category"),
		bodyStyles: countByMetadata(notes, "body_style"),
		drivetrains: countByMetadataWithOther(notes, "drivetrain", 5),
		fuels: countByMetadata(notes, "fuel"),
		manufacturers: countByMetadata(notes, "manufacturer"),
		recent: [...notes].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 4),
	};
}

export function formatVehicleStatus(value: string | null) {
	return value ? vehicleStatusLabels[value] ?? titleCase(value) : null;
}

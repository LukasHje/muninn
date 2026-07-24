import type { ExperienceCardFamily } from "src/lib/experiences/cardFamilies";
import type { ExperienceSelector } from "src/lib/experiences/selectorEngine";
import type { Tone } from "src/lib/vault";

export type ExperienceId =
	| "gear"
	| "vehicles"
	| "travel"
	| "recipes"
	| "books"
	| "technology"
	| "homelab";

export type ExperienceLandingPage = "gear" | "recipes" | "vehicles";
export type ExperienceInspector = "gear" | "recipes" | "vehicles";

export type ExperienceStatisticMetric =
	| { type: "total"; label: string; helper?: string }
	| { type: "favorites"; label: string; helper?: string }
	| { type: "unique-metadata"; key: string; label: string; helper?: string }
	| { type: "unique-tags"; label: string; helper?: string };

export type ExperienceStatisticsDefinition =
	| {
			type: "metadata-breakdown";
			metadataKey: string;
			maxValues: number;
	  }
	| {
			type: "summary";
			metrics: ExperienceStatisticMetric[];
	  };

export interface ExperienceDefinition {
	id: ExperienceId;
	title: string;
	description: string;
	selector: ExperienceSelector;
	theme: Tone;
	icons: {
		sidebar: string;
		hero: string;
	};
	assets: {
		heroArtwork: string | null;
		placeholderThumbnail: string | null;
		placeholderThumbnailsByCategory?: Record<string, string>;
	};
	href: string;
	libraryHref: string;
	sidebar: {
		label: string;
	};
	cardFamily: ExperienceCardFamily;
	landingPage?: ExperienceLandingPage;
	inspector?: ExperienceInspector;
	featureSections: string[];
	metadataFilters: string[];
	showMetadataFilters?: boolean;
	cardMetadata: string[];
	inspectorMetadata: string[];
	inspectorSections: string[];
	statistics: ExperienceStatisticsDefinition;
}

const commonInspectorSections = [
	"Use case",
	"Key features",
	"Specifications",
	"Intended setup",
	"Limitations",
	"Wishlist notes",
	"Review",
	"Links",
];

const gearFeatureSections = [
	"Key features",
	"Features",
	"Highlights",
	"Specifications",
	"Technical highlights",
];

const defaultExperienceConfig = {
	libraryHref: "/notes",
	cardFamily: "generic-note",
	featureSections: [],
	metadataFilters: ["status", "category"],
	cardMetadata: ["type", "category", "updated"],
	inspectorMetadata: ["type", "status", "category", "tags", "updated"],
	inspectorSections: commonInspectorSections,
	statistics: {
		type: "metadata-breakdown",
		metadataKey: "category",
		maxValues: 4,
	},
} satisfies Partial<ExperienceDefinition>;

export const experienceDefinitions = [
	{
		id: "gear",
		title: "Gear",
		description:
			"Field equipment, outdoor tools, navigation, power, transport, and supporting kit.",
		selector: {
			type: "frontmatter",
			field: "type",
			value: "gear",
		},
		theme: "emerald",
		icons: {
			sidebar: "gear",
			hero: "gear",
		},
		assets: {
			heroArtwork: "/experiences/gear/experiences-heroart-gear-v2.webp",
			placeholderThumbnail: "/assets/experiences/gear/placeholder-thumbnail.webp",
		},
		href: "/gear",
		libraryHref: "/notes?category=gear",
		sidebar: {
			label: "Gear",
		},
		cardFamily: "product",
		landingPage: "gear",
		inspector: "gear",
		featureSections: gearFeatureSections,
		metadataFilters: ["status", "category"],
		cardMetadata: ["status", "category", "manufacturer"],
		inspectorMetadata: ["type", "status", "category", "manufacturer", "variant", "tags", "updated"],
		inspectorSections: commonInspectorSections,
		statistics: {
			type: "metadata-breakdown",
			metadataKey: "status",
			maxValues: 4,
		},
	},
	{
		...defaultExperienceConfig,
		id: "vehicles",
		title: "Vehicles",
		description:
			"A curated garage of machines, past, present, and future. Built for exploration and service.",
		selector: { type: "frontmatter", field: "type", value: ["vehicle", "vehicles", "fordon"] },
		theme: "slate",
		icons: { sidebar: "car-front", hero: "car-front" },
		assets: {
			heroArtwork: "/experiences/vehicles/experiences-heroart-vehicles-v2.webp",
			placeholderThumbnail: "/assets/placeholders/vehicle-suv-placeholder-thumbnail.webp",
			placeholderThumbnailsByCategory: {
				Hatchback: "/assets/placeholders/vehicle-hatchback-placeholder.webp",
				Moped: "/assets/placeholders/vehicle-moped-placeholder.webp",
				Motorcycle: "/assets/placeholders/vehicle-motorcycle-placeholder.webp",
				"Station Wagon": "/assets/placeholders/vehicle-station-wagon-placeholder.webp",
				SUV: "/assets/placeholders/vehicle-suv-placeholder.webp",
				"Terrain Vehicle": "/assets/placeholders/vehicle-terrain-vehicle-placeholder.webp",
			},
		},
		href: "/vehicles",
		sidebar: { label: "Vehicles" },
		cardFamily: "vehicle",
		landingPage: "vehicles",
		inspector: "vehicles",
		featureSections: ["Overview", "Specs", "Specifications", "Ownership", "Planning", "Maintenance", "Notes", "Files"],
		metadataFilters: ["vehicle_status", "vehicle_category", "drivetrain", "fuel"],
		showMetadataFilters: false,
		cardMetadata: ["manufacturer", "model", "year", "drivetrain", "fuel", "body_style"],
		inspectorMetadata: [
			"vehicle_status",
			"manufacturer",
			"model",
			"generation",
			"year",
			"body_style",
			"drivetrain",
			"fuel",
			"transmission",
			"mileage",
			"owner",
			"location",
			"rating",
			"tags",
			"updated",
		],
		inspectorSections: ["Overview", "Specs", "Specifications", "Ownership", "Planning", "Maintenance", "Notes", "Files"],
		statistics: {
			type: "summary",
			metrics: [
				{ type: "total", label: "Vehicles" },
				{ type: "unique-metadata", key: "manufacturer", label: "Makes" },
				{ type: "unique-metadata", key: "body_style", label: "Body styles" },
				{ type: "unique-metadata", key: "drivetrain", label: "Drivetrains" },
			],
		},
	},
	{
		...defaultExperienceConfig,
		id: "travel",
		title: "Travel",
		description: "Destinations, journeys, field notes, and plans for future travel.",
		selector: { type: "frontmatter", field: "type", value: "travel-destination" },
		theme: "emerald",
		icons: { sidebar: "travel", hero: "travel" },
		assets: {
			heroArtwork: "/experiences/travel/experiences-heroart-travel-v2.webp",
			placeholderThumbnail: null,
		},
		href: "/travel",
		sidebar: { label: "Travel" },
	},
	{
		...defaultExperienceConfig,
		id: "recipes",
		title: "Recipes",
		description: "Recipes, cooking notes, techniques, and meals worth returning to.",
		selector: { type: "frontmatter", field: "type", value: ["recipe", "recipes", "recept"] },
		theme: "amber",
		icons: { sidebar: "chef-hat", hero: "chef-hat" },
		assets: {
			heroArtwork: "/experiences/recipes-assets/recipes-hero-v2.webp",
			placeholderThumbnail: null,
		},
		href: "/recipes",
		sidebar: { label: "Recipes" },
		cardFamily: "recipe",
		landingPage: "recipes",
		inspector: "recipes",
		featureSections: ["Ingredients", "Instructions", "Method", "Directions", "Notes", "Review"],
		metadataFilters: ["recipe_kind", "favorite", "reviewed", "cuisine"],
		showMetadataFilters: false,
		cardMetadata: ["total_time", "cook_time", "difficulty", "cuisine"],
		inspectorMetadata: [
			"prep_time",
			"cook_time",
			"total_time",
			"difficulty",
			"servings",
			"cuisine",
			"collection",
			"recipe_status",
			"rating",
			"tags",
		],
		inspectorSections: ["Ingredients", "Instructions", "Method", "Directions", "Notes", "Review"],
		statistics: {
			type: "summary",
			metrics: [
				{ type: "total", label: "Recipes" },
				{ type: "favorites", label: "Favorites" },
				{ type: "unique-metadata", key: "collection", label: "Collections" },
				{ type: "unique-metadata", key: "ingredients", label: "Ingredients" },
				{ type: "unique-tags", label: "Tags" },
			],
		},
	},
	{
		...defaultExperienceConfig,
		id: "books",
		title: "Books",
		description: "Books, reading notes, references, and ideas gathered from the library.",
		selector: { type: "frontmatter", field: "type", value: "books" },
		theme: "slate",
		icons: { sidebar: "books", hero: "books" },
		assets: {
			heroArtwork: "/experiences/books/experiences-heroart-books-v2.webp",
			placeholderThumbnail: null,
		},
		href: "/books",
		sidebar: { label: "Books" },
	},
	{
		...defaultExperienceConfig,
		id: "technology",
		title: "Technology",
		description: "Technology notes, systems, devices, software, and technical references.",
		selector: { type: "frontmatter", field: "type", value: "technology" },
		theme: "violet",
		icons: { sidebar: "cpu", hero: "cpu" },
		assets: {
			heroArtwork: null,
			placeholderThumbnail: null,
		},
		href: "/technology",
		sidebar: { label: "Technology" },
	},
	{
		...defaultExperienceConfig,
		id: "homelab",
		title: "Homelab",
		description: "Servers, infrastructure, networking, services, and operational notes from the homelab.",
		selector: { type: "path", value: "07 Mitt homelab" },
		theme: "sky",
		icons: { sidebar: "server", hero: "server" },
		assets: {
			heroArtwork: "/experiences/homelab/experiences-heroart-homelab-v2.webp",
			placeholderThumbnail: null,
		},
		href: "/homelab",
		sidebar: { label: "Homelab" },
	},
] satisfies ExperienceDefinition[];

const experienceDefinitionMap = new Map(experienceDefinitions.map((definition) => [definition.id, definition]));

export function getExperienceDefinitions() {
	return experienceDefinitions;
}

export function getExperienceDefinition(id: string) {
	return experienceDefinitionMap.get(id as ExperienceId) ?? null;
}

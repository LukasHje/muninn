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

export type ExperienceLandingPage = "gear" | "recipes" | "vehicles" | "books" | "homelab";
export type ExperienceInspector = "gear" | "recipes" | "vehicles" | "books" | "homelab";

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
			placeholderThumbnail: "/experiences/gear/gear-placeholder-thumbnail.webp",
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
			} as Record<string, string>,
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
		featureSections: ["Ingredients", "Ingredienser", "Instructions", "Instruktioner", "Method", "Directions", "Notes", "Anteckningar", "Review"],
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
		inspectorSections: ["Ingredients", "Ingredienser", "Instructions", "Instruktioner", "Method", "Directions", "Notes", "Anteckningar", "Review"],
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
		description: "A personal library of stories, ideas, highlights, and reading notes.",
		selector: { type: "frontmatter", field: "type", value: ["book", "books", "bok", "böcker"] },
		theme: "amber",
		icons: { sidebar: "books", hero: "books" },
		assets: {
			heroArtwork: "/experiences/books/experiences-heroart-books-v2.webp",
			placeholderThumbnail: null,
		},
		href: "/books",
		sidebar: { label: "Books" },
		cardFamily: "book",
		landingPage: "books",
		inspector: "books",
		featureSections: ["Description", "Overview", "Summary", "Review", "Highlights", "Reading notes", "Notes"],
		metadataFilters: [],
		showMetadataFilters: false,
		cardMetadata: ["author", "publication_year", "genres"],
		inspectorMetadata: ["author", "publication_year", "publisher", "language", "pages", "format", "series", "isbn", "tags"],
		inspectorSections: ["Description", "Overview", "Summary", "Review", "Highlights", "Reading notes", "Notes"],
		statistics: {
			type: "summary",
			metrics: [{ type: "total", label: "Books" }],
		},
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
			placeholderThumbnailsByCategory: {
				documentation: "/assets/placeholders/homelab-documentation-placeholder.webp",
				specification: "/assets/placeholders/homelab-specification-placeholder.webp",
				server: "/assets/placeholders/homelab-server-node-placeholder.webp",
				nas: "/assets/placeholders/homelab-service-storage-placeholder.webp",
				network: "/assets/placeholders/homelab-network-device-placeholder.webp",
				workstation: "/assets/placeholders/homelab-workstation-placeholder.webp",
				"workstation-desktop": "/assets/placeholders/homelab-workstation-placeholder.webp",
				"workstation-laptop": "/assets/placeholders/homelab-laptop-placeholder.webp",
				"workstation-all-in-one": "/assets/placeholders/homelab-all-in-one-placeholder.webp",
				"workstation-mini-pc": "/assets/placeholders/homelab-mini-computer-placeholder.webp",
				"server-rack": "/assets/placeholders/homelab-server-node-placeholder.webp",
				"server-tower": "/assets/placeholders/homelab-server-node-placeholder.webp",
				"server-desktop": "/assets/placeholders/homelab-desktop-server-placeholder.webp",
				"server-mini-pc": "/assets/placeholders/homelab-mini-computer-placeholder.webp",
				desktop: "/assets/placeholders/homelab-workstation-placeholder.webp",
				laptop: "/assets/placeholders/homelab-laptop-placeholder.webp",
				"all-in-one": "/assets/placeholders/homelab-all-in-one-placeholder.webp",
				tower: "/assets/placeholders/homelab-workstation-placeholder.webp",
				rack: "/assets/placeholders/homelab-server-node-placeholder.webp",
				"mini-pc": "/assets/placeholders/homelab-mini-computer-placeholder.webp",
				appliance: "/assets/placeholders/homelab-network-device-placeholder.webp",
				embedded: "/assets/placeholders/homelab-embedded-placeholder.webp",
				smartphone: "/assets/placeholders/homelab-smartphone-placeholder.webp",
				handheld: "/assets/placeholders/homelab-smartphone-placeholder.webp",
				tablet: "/assets/placeholders/homelab-smartphone-placeholder.webp",
				"mini-computer": "/assets/placeholders/homelab-mini-computer-placeholder.webp",
				"service-applications": "/assets/placeholders/homelab-service-applications-placeholder.webp",
				"service-automation": "/assets/placeholders/homelab-service-automation-placeholder.webp",
				"service-development": "/assets/placeholders/homelab-service-development-placeholder.webp",
				"service-infrastructure": "/assets/placeholders/homelab-service-infrastructure-placeholder.webp",
				"service-media": "/assets/placeholders/homelab-service-media-placeholder.webp",
				"service-monitoring": "/assets/placeholders/homelab-service-monitoring-placeholder.webp",
				"service-networking": "/assets/placeholders/homelab-service-networking-placeholder.webp",
				"service-other": "/assets/placeholders/homelab-service-generic-placeholder.webp",
				"service-security": "/assets/placeholders/homelab-service-security-placeholder.webp",
				"service-storage": "/assets/placeholders/homelab-service-storage-placeholder.webp",
			} as Record<string, string>,
		},
		href: "/homelab",
		sidebar: { label: "Homelab" },
		cardFamily: "homelab",
		landingPage: "homelab",
		inspector: "homelab",
		metadataFilters: ["homelab_entity", "homelab_form_factor", "homelab_lifecycle", "homelab_status", "homelab_service_category"],
		showMetadataFilters: false,
		cardMetadata: ["hostname", "os", "cpu", "ram", "storage", "location"],
		inspectorMetadata: [
			"platform", "hostname", "os", "cpu", "ram", "storage", "network", "location", "status",
			"version", "host", "runtime", "dependencies", "ports",
			"manufacturer", "model", "generation", "interfaces", "expansion", "drive_bays",
			"purpose", "widgets", "sources", "refresh", "category", "references", "related", "tags",
		],
		inspectorSections: ["Overview", "Specifikationer", "Specifications", "Services", "Storage", "Network", "Kommentarer", "Notes", "Maintenance log", "Relaterat"],
		statistics: { type: "summary", metrics: [{ type: "total", label: "Documents" }] },
	},
] satisfies ExperienceDefinition[];

const experienceDefinitionMap = new Map(experienceDefinitions.map((definition) => [definition.id, definition]));

export function getExperienceDefinitions() {
	return experienceDefinitions;
}

export function getExperienceDefinition(id: string) {
	return experienceDefinitionMap.get(id as ExperienceId) ?? null;
}

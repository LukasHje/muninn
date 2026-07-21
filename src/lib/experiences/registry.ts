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

export type ExperienceLandingPage = "gear";
export type ExperienceInspector = "gear";

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
	cardMetadata: string[];
	inspectorMetadata: string[];
	inspectorSections: string[];
	statistics: {
		metadataKey: string;
		maxValues: number;
	};
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

function getExperienceHeroArtworkPath(id: ExperienceId) {
	return `/experiences/${id}/experiences-heroart-${id}.webp`;
}

const defaultExperienceConfig = {
	libraryHref: "/notes",
	cardFamily: "generic-note",
	featureSections: [],
	metadataFilters: ["status", "category"],
	cardMetadata: ["type", "category", "updated"],
	inspectorMetadata: ["type", "status", "category", "tags", "updated"],
	inspectorSections: commonInspectorSections,
	statistics: {
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
			heroArtwork: getExperienceHeroArtworkPath("gear"),
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
			metadataKey: "status",
			maxValues: 4,
		},
	},
	{
		...defaultExperienceConfig,
		id: "vehicles",
		title: "Vehicles",
		description: "Vehicles, ownership notes, maintenance records, and transport references.",
		selector: { type: "frontmatter", field: "type", value: "vehicle" },
		theme: "slate",
		icons: { sidebar: "vehicles", hero: "vehicles" },
		assets: {
			heroArtwork: getExperienceHeroArtworkPath("vehicles"),
			placeholderThumbnail: "/assets/placeholders/car_placeholder_thumbnail.webp",
		},
		href: "/vehicles",
		sidebar: { label: "Vehicles" },
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
			heroArtwork: getExperienceHeroArtworkPath("travel"),
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
		selector: { type: "frontmatter", field: "type", value: ["recipes", "recept"] },
		theme: "amber",
		icons: { sidebar: "recipes", hero: "recipes" },
		assets: {
			heroArtwork: getExperienceHeroArtworkPath("recipes"),
			placeholderThumbnail: null,
		},
		href: "/recipes",
		sidebar: { label: "Recipes" },
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
			heroArtwork: getExperienceHeroArtworkPath("books"),
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
			heroArtwork: null,
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

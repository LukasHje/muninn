import type { Tone } from "src/lib/vault";

export type ExperienceKey = "gear";

export interface ExperienceDefinition {
	key: ExperienceKey;
	title: string;
	description: string;
	icon: string;
	tone: Tone;
	href: string;
	libraryHref: string;
	heroArtwork: string;
	placeholderThumbnail: string;
	sidebar: {
		label: string;
	};
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

export const experienceDefinitions = [
	{
		key: "gear",
		title: "Gear",
		description:
			"Field equipment, outdoor tools, navigation, power, transport, and supporting kit.",
		icon: "cpu",
		tone: "emerald",
		href: "/gear",
		libraryHref: "/notes?category=gear",
		heroArtwork: "/experiences/gear/gear-hero.webp",
		placeholderThumbnail: "/assets/experiences/gear/placeholder-thumbnail.webp",
		sidebar: {
			label: "Gear",
		},
		metadataFilters: ["status", "category"],
		cardMetadata: ["status", "category", "manufacturer"],
		inspectorMetadata: ["type", "status", "category", "manufacturer", "variant", "updated"],
		inspectorSections: commonInspectorSections,
		statistics: {
			metadataKey: "status",
			maxValues: 4,
		},
	},
] satisfies ExperienceDefinition[];

const experienceDefinitionMap = new Map(experienceDefinitions.map((definition) => [definition.key, definition]));

export function getExperienceDefinitions() {
	return experienceDefinitions;
}

export function getExperienceDefinition(key: string) {
	return experienceDefinitionMap.get(key as ExperienceKey) ?? null;
}

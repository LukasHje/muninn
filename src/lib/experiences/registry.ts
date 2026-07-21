import type { Tone } from "src/lib/vault";
import type { ExperienceCardFamily } from "src/lib/experiences/cardFamilies";

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
	cardFamily: ExperienceCardFamily;
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

type ExperienceDefinitionConfig = Omit<ExperienceDefinition, "heroArtwork">;

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

function getExperienceHeroArtworkPath(key: string) {
	return `/experiences/${key}/experiences-heroart-${key}.webp`;
}

const experienceDefinitionConfigs: ExperienceDefinitionConfig[] = [
	{
		key: "gear",
		title: "Gear",
		description:
			"Field equipment, outdoor tools, navigation, power, transport, and supporting kit.",
		icon: "cpu",
		tone: "emerald",
		href: "/gear",
		libraryHref: "/notes?category=gear",
		placeholderThumbnail: "/assets/experiences/gear/placeholder-thumbnail.webp",
		sidebar: {
			label: "Gear",
		},
		cardFamily: "product",
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
] satisfies ExperienceDefinitionConfig[];

export const experienceDefinitions = experienceDefinitionConfigs.map((definition) => ({
	...definition,
	heroArtwork: getExperienceHeroArtworkPath(definition.key),
})) satisfies ExperienceDefinition[];

const experienceDefinitionMap = new Map(experienceDefinitions.map((definition) => [definition.key, definition]));

export function getExperienceDefinitions() {
	return experienceDefinitions;
}

export function getExperienceDefinition(key: string) {
	return experienceDefinitionMap.get(key as ExperienceKey) ?? null;
}

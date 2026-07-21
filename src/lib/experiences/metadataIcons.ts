import { getCanonicalExperienceStatus } from "src/lib/experiences/status";

export type ExperienceMetadataTheme = "light" | "dark";
export const currentExperienceMetadataTheme: ExperienceMetadataTheme = "light";

export type ExperienceMetadataIconDescriptor =
	| {
			kind: "image";
			lightThemeSrc: string;
			darkThemeSrc: string;
		}
	| {
			kind: "svg";
			name: string;
		};

const iconBasePath = "/experiences/icon-collection/metadata";

const metadataSvgFallbacks: Record<string, string> = {
	type: "package",
	status: "circle",
	category: "folder",
	manufacturer: "factory",
	variant: "layers-3",
	updated: "clock-3",
	tags: "tag",
};

const themeAwareMetadataIcons: Record<string, string> = {
	type: "experiances-metdata-type",
	category: "experiances-metdata-category",
	tags: "experiances-metdata-tag",
	updated: "experiances-metdata-updated",
};

const fixedMetadataIcons: Record<string, string> = {
	owned: "experiances-metdata-status-owned",
	considered_wishlist: "experiances-metdata-status-considered_wishlist",
};

function buildThemeAwareIconPair(name: string) {
	return {
		kind: "image" as const,
		lightThemeSrc: `${iconBasePath}/${name}-dark.webp`,
		darkThemeSrc: `${iconBasePath}/${name}.webp`,
	};
}

function buildFixedIcon(name: string) {
	return {
		kind: "image" as const,
		lightThemeSrc: `${iconBasePath}/${name}.webp`,
		darkThemeSrc: `${iconBasePath}/${name}.webp`,
	};
}

function normalizeValue(value?: string | null) {
	return value?.trim().toLocaleLowerCase("en") ?? "";
}

function getStatusIconName(value?: string | null) {
	const normalizedValue = getCanonicalExperienceStatus(normalizeValue(value));

	if (normalizedValue === "owned") {
		return fixedMetadataIcons.owned;
	}

	if (normalizedValue === "considered") {
		return fixedMetadataIcons.considered_wishlist;
	}

	if (normalizedValue === "archived") {
		return "experiances-metdata-status-archived";
	}

	return null;
}

export function getMetadataIcon(key: string, value?: string | null): ExperienceMetadataIconDescriptor {
	if (key === "status") {
		const statusIconName = getStatusIconName(value);
		if (statusIconName === fixedMetadataIcons.owned || statusIconName === fixedMetadataIcons.considered_wishlist) {
			return buildFixedIcon(statusIconName);
		}

		if (statusIconName) {
			return buildThemeAwareIconPair(statusIconName);
		}
	}

	const themeAwareIconName = themeAwareMetadataIcons[key];
	if (themeAwareIconName) {
		return buildThemeAwareIconPair(themeAwareIconName);
	}

	return {
		kind: "svg",
		name: metadataSvgFallbacks[key] ?? "tag",
	};
}

export function getMetadataIconSrc(
	key: string,
	value: string | null | undefined,
	theme: ExperienceMetadataTheme
) {
	const icon = getMetadataIcon(key, value);
	if (icon.kind === "svg") {
		return null;
	}

	return theme === "dark" ? icon.darkThemeSrc : icon.lightThemeSrc;
}

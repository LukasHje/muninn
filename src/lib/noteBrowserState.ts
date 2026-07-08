const APP_ORIGIN = "http://muninn.local";

export const noteBrowserPaths = new Set(["/notes", "/favorites", "/recent"]);

export interface NoteBrowserState {
	query: string;
	category: string;
	tags: string[];
	sort: "updated" | "title";
	layout: "list" | "grid";
}

function normalizeTagValue(value: string | null | undefined) {
	const normalized = value?.trim();
	if (!normalized || normalized === "all") {
		return null;
	}

	return normalized;
}

function getSelectedTags(searchParams: URLSearchParams) {
	const tagValues = searchParams.getAll("tag");
	const normalizedTags = (tagValues.length > 0 ? tagValues : [searchParams.get("tag")])
		.map((value) => normalizeTagValue(value))
		.filter((value): value is string => Boolean(value));

	return Array.from(new Set(normalizedTags));
}

export function getNoteBrowserState(searchParams: URLSearchParams): NoteBrowserState {
	return {
		query: searchParams.get("q")?.trim() ?? "",
		category: searchParams.get("category")?.trim() || "all",
		tags: getSelectedTags(searchParams),
		sort: searchParams.get("sort")?.trim() === "title" ? "title" : "updated",
		layout: searchParams.get("layout") === "grid" ? "grid" : "list",
	};
}

export function parseAppUrl(value: string | null | undefined): URL | null {
	if (!value) {
		return null;
	}

	try {
		const url = new URL(value, APP_ORIGIN);
		if (url.origin !== APP_ORIGIN || !url.pathname.startsWith("/")) {
			return null;
		}

		return url;
	} catch {
		return null;
	}
}

export function toRelativeAppUrl(url: URL) {
	return `${url.pathname}${url.search}${url.hash}`;
}

export function getSharedSearchContext(url: URL) {
	if (noteBrowserPaths.has(url.pathname)) {
		return {
			action: url.pathname,
			state: getNoteBrowserState(url.searchParams),
		};
	}

	const returnToUrl = parseAppUrl(url.searchParams.get("returnTo"));
	if (returnToUrl && noteBrowserPaths.has(returnToUrl.pathname)) {
		return {
			action: returnToUrl.pathname,
			state: getNoteBrowserState(returnToUrl.searchParams),
		};
	}

	return null;
}

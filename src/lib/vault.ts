import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ui } from "src/i18n";
import { formatRelativeDateLabel, formatUiDate, formatUiNumber } from "src/i18n/format";
import {
	extractImageReferences,
	parseFrontmatter,
	slugifySegment,
	stripMarkdown,
} from "src/lib/parser";
import type { NormalizedNote } from "src/lib/normalizeNote";
import { normalizeNote } from "src/lib/normalizeNote";
import { parseObsidianAssetRef, resolveObsidianAsset } from "src/lib/resolveObsidianAsset";
import { getVaultAssetIndex } from "src/lib/vaultAssetIndex";
import { RESOLVED_VAULT_PATH } from "src/lib/config";
import { getFavoriteNoteIdSet } from "src/lib/favorites";
import { listVaultFilesRecursively } from "src/lib/vaultTraversal";

export type DomainKey =
	| "gear"
	| "projekt"
	| "recept"
	| "bocker"
	| "resor"
	| "teknik"
	| "journal"
	| "traning"
	| "ovrigt";

export type Tone = "slate" | "amber" | "sky" | "emerald" | "rose" | "violet";
export type FrontmatterValue = string | string[];
export type VaultFrontmatter = Record<string, FrontmatterValue | undefined>;

export interface SidebarNavigationItem {
	label: string;
	href: string;
	icon: string;
	count?: number;
}

export interface DashboardMetric {
	label: string;
	value: string;
	helper: string;
	icon: string;
	tone: Tone;
}

export interface LibraryItem {
	id: string;
	title: string;
	href: string;
	slugPath: string;
	domainKey: DomainKey;
	domainLabel: string;
	domainIcon: string;
	tone: Tone;
	excerpt: string;
	updatedLabel: string;
	imageUrl?: string;
	tags: string[];
	favorite?: boolean;
	relativePath: string;
	createdAt: number;
	updatedAt: number;
	content: string;
	frontmatter: VaultFrontmatter;
	normalized: NormalizedNote;
	imageReferences: Record<string, string>;
}

export interface PopularTag {
	label: string;
	count: number;
	tone: Tone;
}

export interface TodayEntry {
	date: string;
	excerpt: string;
	imageUrl?: string;
	href: string;
}

export interface FavoriteLink {
	title: string;
	href: string;
	starred: boolean;
}

export interface VaultNoteDetail {
	title: string;
	relativePath: string;
	content: string;
	domainLabel: string;
	tags: string[];
	updatedLabel: string;
	imageUrl?: string;
}

let vaultNotesPromise: Promise<LibraryItem[]> | null = null;
let noteLookupPromise: Promise<Map<string, string>> | null = null;

export function invalidateVaultDataCache() {
	vaultNotesPromise = null;
	noteLookupPromise = null;
}

export function getSidebarNavigation() {
	return [
		{ label: ui.navigation.home, href: "/", icon: "home" },
		{ label: ui.navigation.allNotes, href: "/notes", icon: "file-text" },
		{ label: ui.navigation.favorites, href: "/favorites", icon: "star" },
		{ label: ui.navigation.recentlyUpdated, href: "/recent", icon: "clock-3" },
		{ label: ui.navigation.scratchpad, href: "/scratchpad", icon: "notebook-pen" },
	];
}

const domainMeta: Record<
	DomainKey,
	{ icon: string; tone: Tone; href: string }
> = {
	gear: { icon: "cpu", tone: "emerald", href: "/gear" },
	projekt: { icon: "folder", tone: "sky", href: "/notes?category=projekt" },
	recept: { icon: "utensils", tone: "amber", href: "/recipes" },
	bocker: { icon: "book", tone: "slate", href: "/books" },
	resor: { icon: "map", tone: "emerald", href: "/notes?category=resor" },
	teknik: { icon: "cpu", tone: "violet", href: "/notes?category=teknik" },
	journal: { icon: "notebook-pen", tone: "rose", href: "/notes?category=journal" },
	traning: { icon: "weight", tone: "rose", href: "/notes?category=traning" },
	ovrigt: { icon: "circle", tone: "slate", href: "/notes?category=ovrigt" },
};

function getDomainLabel(domainKey: DomainKey) {
	switch (domainKey) {
		case "gear":
			return ui.domains.gear;
		case "projekt":
			return ui.domains.project;
		case "recept":
			return ui.domains.recipe;
		case "bocker":
			return ui.domains.book;
		case "resor":
			return ui.domains.travel;
		case "teknik":
			return ui.domains.technology;
		case "journal":
			return ui.domains.journal;
		case "traning":
			return ui.domains.training;
		case "ovrigt":
			return ui.domains.other;
	}
}

function formatRelativePath(value: string) {
	return value.split(path.sep).join("/");
}

function formatUpdatedLabel(timestamp: number) {
	return formatRelativeDateLabel(timestamp);
}

function toNoteHref(relativePath: string) {
	const withoutExtension = relativePath.replace(/\.md$/i, "");
	const segments = withoutExtension.split("/").map(slugifySegment).filter(Boolean);
	return `/notes/${segments.join("/")}`;
}

function toNoteSlugPath(relativePath: string) {
	return toNoteHref(relativePath).replace(/^\/notes\//, "");
}

function extractDateFromFilename(filename: string) {
	const match = filename.match(/\b(\d{4}-\d{2}-\d{2})\b/);
	return match?.[1] ?? null;
}

function buildExcerpt(content: string) {
	const plain = stripMarkdown(content);
	return plain.length > 160 ? `${plain.slice(0, 160)}...` : plain;
}

function buildLookupKeys(value: string) {
	const cleaned = value.replace(/^\/+/, "").replace(/\.md$/i, "").trim();
	if (!cleaned) {
		return [];
	}

	const segments = cleaned.split("/").map((segment) => segment.trim()).filter(Boolean);
	const basename = segments.at(-1) ?? cleaned;
	const strippedBasename = basename.replace(/^(?:on\s*\/\s*)?for\s+/i, "").trim();
	const candidates = new Set<string>([cleaned, basename]);

	if (strippedBasename && strippedBasename !== basename) {
		candidates.add(strippedBasename);
		if (segments.length > 1) {
			candidates.add([...segments.slice(0, -1), strippedBasename].join("/"));
		}
	}

	return Array.from(
		new Set(
			Array.from(candidates).flatMap((candidate) => {
				const normalizedCandidate = candidate.replace(/^\/+/, "").replace(/\.md$/i, "").trim();
				if (!normalizedCandidate) {
					return [];
				}

				const normalizedSegments = normalizedCandidate.split("/").map((segment) => segment.trim()).filter(Boolean);
				const relativeLower = normalizedCandidate.toLowerCase();
				const slugPath = normalizedSegments
					.map((segment) => slugifySegment(segment))
					.filter(Boolean)
					.join("/");
				const candidateBasename = normalizedSegments.at(-1) ?? normalizedCandidate;
				const slugBase = slugifySegment(candidateBasename);

				return [relativeLower, slugPath, candidateBasename.toLowerCase(), slugBase].filter(Boolean);
			})
		)
	);
}

async function loadVaultNotes(): Promise<LibraryItem[]> {
	if (vaultNotesPromise) {
		return vaultNotesPromise;
	}

	const loadingPromise = (async () => {
		const allFiles = await listVaultFilesRecursively(RESOLVED_VAULT_PATH);
		const markdownFiles = allFiles.filter((file) => file.endsWith(".md"));
		const assetIndex = await getVaultAssetIndex();

		const notes = await Promise.all(
			markdownFiles.map(async (filePath) => {
				const relativePath = formatRelativePath(path.relative(RESOLVED_VAULT_PATH, filePath));
				const raw = await readFile(filePath, "utf8");
				const fileStat = await stat(filePath);
				const { body, data } = parseFrontmatter(raw);
				const frontmatter = data as VaultFrontmatter;
				const normalized = normalizeNote({
					title: path.basename(filePath, ".md"),
					relativePath,
					frontmatter,
					content: body,
				});
				const title = normalized.title;
				const domainKey = normalized.domain as DomainKey;
				const rawImageReferences = extractImageReferences(frontmatter, body);
				const resolvedImages = Object.fromEntries(
					rawImageReferences
						.flatMap((reference) => {
							const resolved = resolveObsidianAsset(reference, relativePath, assetIndex);
							if (!resolved.found || !resolved.url) {
								return [];
							}

							const parsedReference = parseObsidianAssetRef(reference);
							const keys = Array.from(
								new Set([
									reference.replace(/^["']|["']$/g, "").trim(),
									parsedReference.path,
									path.basename(parsedReference.path),
								].filter(Boolean))
							);

							return keys.map((key) => [key, resolved.url!] as [string, string]);
						})
						.filter(Boolean) as Array<[string, string]>
				);
				const coverReference =
					normalized.cover ? resolveObsidianAsset(normalized.cover, relativePath, assetIndex) : null;
				const imageUrl = (
					coverReference?.found ? coverReference.url : Object.values(resolvedImages)[0]
				) ?? undefined;

				return {
					id: relativePath,
					title,
					href: toNoteHref(relativePath),
					slugPath: normalized.slug || toNoteSlugPath(relativePath),
					domainKey,
					domainLabel: getDomainLabel(domainKey),
					domainIcon: domainMeta[domainKey].icon,
					tone: domainMeta[domainKey].tone,
					excerpt: buildExcerpt(body),
					updatedLabel: formatUpdatedLabel(fileStat.mtimeMs),
					imageUrl,
					tags: normalized.tags,
					favorite: false,
					relativePath,
					createdAt: fileStat.birthtimeMs || fileStat.ctimeMs || fileStat.mtimeMs,
					updatedAt: fileStat.mtimeMs,
					content: body.trim(),
					frontmatter,
					normalized,
					imageReferences: resolvedImages,
				} satisfies LibraryItem;
			})
		);

		return notes.sort((a, b) => b.updatedAt - a.updatedAt);
	})();
	vaultNotesPromise = loadingPromise;

	return loadingPromise;
}

export async function getLibraryItems() {
	const [items, favoriteIds] = await Promise.all([loadVaultNotes(), getFavoriteNoteIdSet()]);
	return items.map((item) => ({
		...item,
		favorite: favoriteIds.has(item.id),
	}));
}

export async function getFavoriteLibraryItems() {
	const items = await getLibraryItems();
	return items.filter((item) => item.favorite);
}

export async function getRecentVaultItemsWithinDay() {
	const items = await getLibraryItems();
	const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
	return items.filter((item) => item.createdAt >= dayAgo || item.updatedAt >= dayAgo);
}

export async function getNoteLookupIndex() {
	if (noteLookupPromise) {
		return noteLookupPromise;
	}

	noteLookupPromise = (async () => {
		const items = await loadVaultNotes();
		const index = new Map<string, string>();

		for (const item of items) {
			const variants = [
				item.title,
				item.relativePath,
				item.relativePath.replace(/\.md$/i, ""),
				item.slugPath,
				...item.normalized.aliases,
			];

			for (const variant of variants) {
				for (const key of buildLookupKeys(variant)) {
					if (!index.has(key)) {
						index.set(key, item.href);
					}
				}
			}
		}

		return index;
	})();

	return noteLookupPromise;
}

export async function getDashboardHero() {
	const items = await getLibraryItems();
	const countLabel = formatUiNumber(items.length);
	return {
		title: ui.dashboard.title,
		description: ui.dashboard.description(countLabel),
		imageUrl:
			"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
	};
}

export async function getDashboardMetrics(): Promise<DashboardMetric[]> {
	const items = await getLibraryItems();
	const allTags = items.flatMap((item) => item.tags);
	const uniqueTags = new Set(allTags);
	const withImages = items.filter((item) => item.imageUrl).length;
	const latest = items[0];

	return [
		{
			label: ui.metrics.notes.label,
			value: formatUiNumber(items.length),
			helper: ui.metrics.notes.helper,
			icon: "file-text",
			tone: "slate",
		},
		{
			label: ui.metrics.tags.label,
			value: formatUiNumber(uniqueTags.size),
			helper: ui.metrics.tags.helper,
			icon: "tag",
			tone: "amber",
		},
		{
			label: ui.metrics.images.label,
			value: formatUiNumber(withImages),
			helper: ui.metrics.images.helper,
			icon: "image",
			tone: "sky",
		},
		{
			label: ui.metrics.latestUpdated.label,
			value: latest ? formatUiDate(latest.updatedAt, { month: "short", day: "numeric" }) : "-",
			helper: latest ? latest.updatedLabel : ui.metrics.latestUpdated.helper,
			icon: "clock-3",
			tone: "emerald",
		},
	];
}

export async function getPopularTags(): Promise<PopularTag[]> {
	const items = await getLibraryItems();
	const counts = new Map<string, number>();

	for (const item of items) {
		for (const tag of item.tags) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}

	return Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([label, count], index) => ({
			label,
			count,
			tone: (["amber", "slate", "sky", "emerald", "rose", "violet"] as Tone[])[index % 6],
		}));
}

export async function getRecentItems() {
	const items = await getLibraryItems();
	return items.slice(0, 4);
}

export async function getFavoriteLinks(): Promise<FavoriteLink[]> {
	const items = await getFavoriteLibraryItems();
	return items.slice(0, 5).map((item) => ({
		title: item.title,
		href: item.href,
		starred: true,
	}));
}

export async function getTodayEntry(): Promise<TodayEntry | null> {
	const items = await getLibraryItems();
	const journal = items.find((item) => item.domainKey === "journal") ?? items[0];
	if (!journal) {
		return null;
	}

	const dateFromFilename = extractDateFromFilename(journal.relativePath);
	return {
		date:
			dateFromFilename ??
			formatUiDate(new Date(journal.updatedAt)),
		excerpt: journal.excerpt,
		imageUrl:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
		href: journal.href,
	};
}

export async function getItemsByDomain(domainKey: DomainKey) {
	const items = await getLibraryItems();
	return items.filter((item) => item.domainKey === domainKey);
}

export async function getNoteByHrefSlug(slugPath: string) {
	const items = await getLibraryItems();
	return (
		items.find((item) => item.href === `/notes/${slugPath}`) ?? null
	);
}

export async function getAllNotesCount() {
	const items = await getLibraryItems();
	return items.length;
}

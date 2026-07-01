import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
	extractImageReferences,
	parseFrontmatter,
	slugifySegment,
	stripMarkdown,
} from "./parser";
import type { NormalizedNote } from "./normalizeNote";
import { normalizeNote } from "./normalizeNote";
import { parseObsidianAssetRef, resolveObsidianAsset } from "./resolveObsidianAsset";
import { getVaultAssetIndex } from "./vaultAssetIndex";
import { RESOLVED_VAULT_PATH } from "./config";
import { getFavoriteNoteIdSet } from "./favorites";

export type CategoryKey =
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

export interface SidebarCategory {
	label: string;
	href: string;
	count: number;
	icon: string;
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
	categoryKey: CategoryKey;
	categoryLabel: string;
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
	categoryLabel: string;
	tags: string[];
	updatedLabel: string;
	imageUrl?: string;
}

let vaultNotesPromise: Promise<LibraryItem[]> | null = null;
let noteLookupPromise: Promise<Map<string, string>> | null = null;

export const sidebarNavigation: SidebarNavigationItem[] = [
	{ label: "Hem", href: "/", icon: "home" },
	{ label: "Alla anteckningar", href: "/notes", icon: "file-text" },
	{ label: "Favoriter", href: "/favorites", icon: "star" },
	{ label: "Nyligen uppdaterade", href: "/recent", icon: "clock-3" },
	{ label: "Anteckningsblock", href: "/scratchpad", icon: "notebook-pen" },
];

const categoryMeta: Record<
	CategoryKey,
	{ label: string; icon: string; tone: Tone; href: string }
> = {
	projekt: { label: "Projekt", icon: "folder", tone: "sky", href: "/notes?category=projekt" },
	recept: { label: "Recept", icon: "utensils", tone: "amber", href: "/recipes" },
	bocker: { label: "Böcker", icon: "book", tone: "slate", href: "/books" },
	resor: { label: "Resor", icon: "map", tone: "emerald", href: "/notes?category=resor" },
	teknik: { label: "Teknik", icon: "cpu", tone: "violet", href: "/notes?category=teknik" },
	journal: { label: "Journal", icon: "notebook-pen", tone: "rose", href: "/notes?category=journal" },
	traning: { label: "Träning", icon: "dumbbell", tone: "rose", href: "/notes?category=traning" },
	ovrigt: { label: "Övrigt", icon: "circle", tone: "slate", href: "/notes?category=ovrigt" },
};

function formatRelativePath(value: string) {
	return value.split(path.sep).join("/");
}

async function listFilesRecursively(directory: string): Promise<string[]> {
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return [];
		}
		throw error;
	}
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				return listFilesRecursively(fullPath);
			}
			return fullPath;
		})
	);

	return files.flat();
}

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("sv-SE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

function formatUpdatedLabel(timestamp: number) {
	const diffMs = Date.now() - timestamp;
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) {
		return `Idag ${new Intl.DateTimeFormat("sv-SE", {
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(timestamp))}`;
	}

	if (diffDays === 1) {
		return `Igår ${new Intl.DateTimeFormat("sv-SE", {
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(timestamp))}`;
	}

	return `${diffDays} dagar sedan`;
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

	const relativeLower = cleaned.toLowerCase();
	const slugPath = cleaned
		.split("/")
		.map((segment) => slugifySegment(segment))
		.filter(Boolean)
		.join("/");
	const basename = cleaned.split("/").at(-1) ?? cleaned;
	const slugBase = slugifySegment(basename);

	return Array.from(new Set([relativeLower, slugPath, basename.toLowerCase(), slugBase].filter(Boolean)));
}

async function loadVaultNotes(): Promise<LibraryItem[]> {
	if (vaultNotesPromise) {
		return vaultNotesPromise;
	}

	vaultNotesPromise = (async () => {
		const allFiles = await listFilesRecursively(RESOLVED_VAULT_PATH);
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
				const categoryKey = normalized.category as CategoryKey;
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
				const imageUrl = coverReference?.found ? coverReference.url : Object.values(resolvedImages)[0];

				return {
					id: relativePath,
					title,
					href: toNoteHref(relativePath),
					slugPath: normalized.slug || toNoteSlugPath(relativePath),
					categoryKey,
					categoryLabel: categoryMeta[categoryKey].label,
					tone: categoryMeta[categoryKey].tone,
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

	return vaultNotesPromise;
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

export async function getSidebarCategories(): Promise<SidebarCategory[]> {
	const items = await getLibraryItems();
	return Object.entries(categoryMeta).map(([key, meta]) => ({
		label: meta.label,
		href: meta.href,
		count: items.filter((item) => item.categoryKey === key).length,
		icon: meta.icon,
	}));
}

export async function getDashboardHero() {
	const items = await getLibraryItems();
	return {
		title: "Välkommen till Muninn",
		description: `Vaultet innehåller ${items.length} anteckningar just nu.`,
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
		{ label: "Anteckningar", value: `${items.length}`, helper: "Totalt", icon: "file-text", tone: "slate" },
		{ label: "Taggar", value: `${uniqueTags.size}`, helper: "Unika", icon: "tag", tone: "amber" },
		{ label: "Bilder", value: `${withImages}`, helper: "Med cover eller bild", icon: "image", tone: "sky" },
		{
			label: "Senast ändrad",
			value: latest ? latest.updatedLabel.split(" ")[0] : "-",
			helper: latest ? latest.updatedLabel : "Ingen data",
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
	const journal = items.find((item) => item.categoryKey === "journal") ?? items[0];
	if (!journal) {
		return null;
	}

	const dateFromFilename = extractDateFromFilename(journal.relativePath);
	return {
		date:
			dateFromFilename ??
			formatDate(new Date(journal.updatedAt)).split(" ")[0],
		excerpt: journal.excerpt,
		imageUrl:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
		href: journal.href,
	};
}

export async function getItemsByCategory(categoryKey: CategoryKey) {
	const items = await getLibraryItems();
	return items.filter((item) => item.categoryKey === categoryKey);
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

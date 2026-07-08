import path from "node:path";
import { slugifySegment } from "lib/parser";

export type NormalizedCategory =
	| "projekt"
	| "recept"
	| "bocker"
	| "resor"
	| "teknik"
	| "journal"
	| "traning"
	| "ovrigt";

export type NormalizedLayout = "travel" | "cover" | "plain";
export type NormalizeableValue = string | string[] | undefined;
export type NormalizedMetadata = Record<string, string | string[]>;

export interface NormalizeNoteInput {
	title?: string;
	relativePath: string;
	frontmatter?: Record<string, NormalizeableValue>;
	content?: string;
}

export interface NormalizedNote {
	title: string;
	path: string;
	slug: string;
	category: NormalizedCategory;
	type: string;
	layout: NormalizedLayout;
	cover?: string;
	tags: string[];
	aliases: string[];
	created?: string;
	updated?: string;
	metadata: NormalizedMetadata;
}

const metadataExclusions = new Set(["title", "tags", "aliases", "cover"]);
const singularExceptions = /(as|is|os|ss|us|xs|z)$/i;

function normalizeScalar(value: string) {
	return value.trim().replace(/^["']|["']$/g, "");
}

function splitCollectionValue(value: string) {
	const trimmed = normalizeScalar(value);
	if (!trimmed) {
		return [];
	}

	const withoutBrackets =
		trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;

	return withoutBrackets
		.split(/[\n,]/)
		.map((part) => normalizeScalar(part))
		.filter(Boolean);
}

function normalizeTagToken(value: string) {
	return normalizeScalar(value)
		.replace(/[\[\]]/g, "")
		.replace(/^#+/, "")
		.trim()
		.toLowerCase();
}

function extractTagsFromValue(value: NormalizeableValue) {
	if (Array.isArray(value)) {
		return value.flatMap((entry) => extractTagsFromValue(entry));
	}

	if (typeof value !== "string") {
		return [];
	}

	const chunks = splitCollectionValue(value);
	if (chunks.length > 1) {
		return chunks.flatMap((chunk) => extractTagsFromValue(chunk));
	}

	const hashtagMatches = Array.from(value.matchAll(/(^|[\s(])#([A-Za-z][A-Za-z0-9/_-]*)/g)).map(
		(match) => match[2]
	);
	if (hashtagMatches.length > 0) {
		return hashtagMatches
			.map((tag) => normalizeTagToken(tag))
			.filter((tag) => tag && !/^[a-f0-9]{3,8}$/i.test(tag));
	}

	const normalized = normalizeTagToken(value);
	return normalized ? [normalized] : [];
}

function uniqueSorted(values: string[]) {
	return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "sv"));
}

function singularizeTag(tag: string) {
	if (tag.includes("-") || !tag.endsWith("s") || tag.length <= 3 || singularExceptions.test(tag)) {
		return null;
	}

	return tag.slice(0, -1);
}

function stripFolderPrefix(segment: string) {
	return segment
		.replace(/^\d+(?:[.\-_]\d+)*(?:\s+|[.\-_]+)?/, "")
		.replace(/^[^\p{L}\p{N}]+/u, "")
		.trim();
}

function deriveFolderTags(relativePath: string) {
	const directory = path.posix.dirname(relativePath);
	if (!directory || directory === ".") {
		return [];
	}

	const derived = directory
		.split("/")
		.map((segment) => slugifySegment(stripFolderPrefix(segment)))
		.filter(Boolean)
		.flatMap((tag) => {
			const singular = singularizeTag(tag);
			return singular ? [tag, singular] : [tag];
		});

	return uniqueSorted(derived);
}

function extractInlineTags(content: string) {
	return uniqueSorted(
		Array.from(content.matchAll(/(^|[\s(])#([A-Za-z][A-Za-z0-9/_-]*)/g))
			.map((match) => normalizeTagToken(match[2]))
			.filter((tag) => tag && !/^[a-f0-9]{3,8}$/i.test(tag))
	);
}

function normalizeAliases(value: NormalizeableValue) {
	const raw = Array.isArray(value) ? value : typeof value === "string" ? splitCollectionValue(value) : [];
	const seen = new Set<string>();

	return raw
		.map((alias) => normalizeScalar(alias))
		.filter((alias) => {
			if (!alias) {
				return false;
			}
			const key = alias.toLowerCase();
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		});
}

function readString(value: NormalizeableValue) {
	if (Array.isArray(value)) {
		return value.find((entry) => normalizeScalar(entry))?.trim();
	}
	if (typeof value === "string") {
		const normalized = normalizeScalar(value);
		return normalized || undefined;
	}
	return undefined;
}

function inferType(
	frontmatter: Record<string, NormalizeableValue>,
	tags: string[],
	relativePath: string
) {
	const explicitType = readString(frontmatter.type)?.toLowerCase();
	if (explicitType) {
		return explicitType;
	}

	if (
		readString(frontmatter["travel-type"]) ||
		tags.includes("travel") ||
		tags.includes("destination")
	) {
		return "travel";
	}

	if (tags.includes("recept") || tags.includes("recipe") || tags.includes("drink")) {
		return "recept";
	}

	if (tags.includes("bok") || tags.includes("book") || tags.includes("literature")) {
		return "book";
	}

	if (tags.includes("journal") || tags.includes("review") || tags.includes("reviews")) {
		return "journal";
	}

	if (tags.includes("träning") || tags.includes("traning") || tags.includes("training")) {
		return "training";
	}

	if (tags.includes("tech") || tags.includes("linux") || tags.includes("docker")) {
		return "reference";
	}

	const pathLower = relativePath.toLowerCase();
	if (pathLower.includes("/travel/")) {
		return "travel";
	}
	if (pathLower.includes("calendar notes")) {
		return "journal";
	}
	if (pathLower.includes("cheatsheets") || pathLower.includes("tech")) {
		return "reference";
	}
	if (pathLower.includes("efforts")) {
		return "project";
	}

	return "note";
}

function inferCategory(type: string, tags: string[], relativePath: string): NormalizedCategory {
	const pathLower = relativePath.toLowerCase();

	if (type === "travel" || type.startsWith("travel-") || pathLower.includes("/travel/")) {
		return "resor";
	}
	if (
		type === "recept" ||
		type === "recipe" ||
		tags.includes("recept") ||
		tags.includes("recipe") ||
		tags.includes("drink")
	) {
		return "recept";
	}
	if (
		type === "book" ||
		type === "literature" ||
		tags.includes("book") ||
		tags.includes("bok") ||
		tags.includes("literature")
	) {
		return "bocker";
	}
	if (type === "journal" || pathLower.includes("calendar notes")) {
		return "journal";
	}
	if (
		type === "training" ||
		tags.includes("training") ||
		tags.includes("traning") ||
		tags.includes("träning")
	) {
		return "traning";
	}
	if (
		type === "reference" ||
		type === "server" ||
		type === "display" ||
		tags.includes("linux") ||
		tags.includes("docker") ||
		tags.includes("homelab") ||
		pathLower.includes("cheatsheets") ||
		pathLower.includes("tech")
	) {
		return "teknik";
	}
	if (
		type === "project" ||
		pathLower.includes("efforts") ||
		tags.includes("project") ||
		tags.includes("projekt")
	) {
		return "projekt";
	}
	return "ovrigt";
}

function inferLayout(type: string, cover: string | undefined, metadata: NormalizedMetadata): NormalizedLayout {
	if (type === "travel" || type.startsWith("travel-") || metadata["travel-type"]) {
		return "travel";
	}
	if (cover) {
		return "cover";
	}
	return "plain";
}

function buildMetadata(frontmatter: Record<string, NormalizeableValue>) {
	const metadata: NormalizedMetadata = {};

	for (const [key, value] of Object.entries(frontmatter)) {
		if (metadataExclusions.has(key) || value == null) {
			continue;
		}

		if (Array.isArray(value)) {
			const cleaned = value.map((entry) => normalizeScalar(entry)).filter(Boolean);
			if (cleaned.length > 0) {
				metadata[key] = cleaned;
			}
			continue;
		}

		const cleaned = normalizeScalar(value);
		if (cleaned) {
			metadata[key] = cleaned;
		}
	}

	return metadata;
}

export function normalizeNote(note: NormalizeNoteInput): NormalizedNote {
	const frontmatter = note.frontmatter ?? {};
	const normalizedTitle =
		readString(frontmatter.title) ??
		(note.title?.trim() || path.basename(note.relativePath, path.extname(note.relativePath)));
	const folderTags = deriveFolderTags(note.relativePath);
	const tags = uniqueSorted([
		...extractTagsFromValue(frontmatter.tags),
		...extractInlineTags(note.content ?? ""),
		...folderTags,
	]);
	const aliases = normalizeAliases(frontmatter.aliases);
	const created = readString(frontmatter.created);
	const updated = readString(frontmatter.updated);
	const cover = readString(frontmatter.cover);
	const metadata = buildMetadata(frontmatter);
	const type = inferType(frontmatter, tags, note.relativePath);
	const category = inferCategory(type, tags, note.relativePath);
	const slug = note.relativePath
		.replace(/\.md$/i, "")
		.split("/")
		.map((segment) => slugifySegment(segment))
		.filter(Boolean)
		.join("/");

	return {
		title: normalizedTitle,
		path: note.relativePath,
		slug,
		category,
		type,
		layout: inferLayout(type, cover, metadata),
		cover,
		tags,
		aliases,
		created,
		updated,
		metadata,
	};
}

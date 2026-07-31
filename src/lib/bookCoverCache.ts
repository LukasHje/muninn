import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { BOOK_COVER_STATE_DIR } from "src/lib/state";

const MAX_COVER_BYTES = 8 * 1024 * 1024;
const MISSING_RETRY_MS = 7 * 24 * 60 * 60 * 1000;
const INVALID_RETRY_MS = 24 * 60 * 60 * 1000;
const NETWORK_RETRY_MS = 15 * 60 * 1000;
const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const pendingDownloads = new Map<string, Promise<CachedBookCover | null>>();

export interface CachedBookCover {
	bytes: Uint8Array;
	contentType: string;
	modifiedAt: Date;
}

interface CoverMetadata {
	contentType: string;
}

interface NegativeCoverMetadata {
	reason: "missing" | "invalid" | "network";
	retryAfter: number;
}

function normalizeIsbn(value: string) {
	const isbn = value.replace(/[^0-9X]/gi, "").toUpperCase();
	return /^(?:\d{9}[\dX]|\d{13})$/.test(isbn) ? isbn : null;
}

function coverPaths(directory: string, isbn: string) {
	return {
		image: path.join(directory, `${isbn}.image`),
		metadata: path.join(directory, `${isbn}.json`),
		negative: path.join(directory, `${isbn}.negative.json`),
	};
}

async function hasActiveNegativeCache(directory: string, isbn: string) {
	const negativePath = coverPaths(directory, isbn).negative;
	try {
		const metadata = JSON.parse(await readFile(negativePath, "utf8")) as NegativeCoverMetadata;
		if (
			(metadata.reason === "missing" || metadata.reason === "invalid" || metadata.reason === "network") &&
			Number.isFinite(metadata.retryAfter) &&
			metadata.retryAfter > Date.now()
		) {
			return true;
		}
		await unlink(negativePath).catch(() => undefined);
		return false;
	} catch {
		return false;
	}
}

async function writeNegativeCache(
	directory: string,
	isbn: string,
	reason: NegativeCoverMetadata["reason"],
	retryInMs: number,
) {
	await mkdir(directory, { recursive: true });
	const negativePath = coverPaths(directory, isbn).negative;
	const temporaryPath = `${negativePath}.${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
	try {
		await writeFile(temporaryPath, JSON.stringify({ reason, retryAfter: Date.now() + retryInMs } satisfies NegativeCoverMetadata));
		await rename(temporaryPath, negativePath);
	} finally {
		await unlink(temporaryPath).catch(() => undefined);
	}
}

async function readCachedCover(directory: string, isbn: string): Promise<CachedBookCover | null> {
	const files = coverPaths(directory, isbn);
	try {
		const [bytes, rawMetadata, fileStats] = await Promise.all([
			readFile(files.image),
			readFile(files.metadata, "utf8"),
			stat(files.image),
		]);
		const metadata = JSON.parse(rawMetadata) as CoverMetadata;
		if (!allowedContentTypes.has(metadata.contentType) || bytes.byteLength === 0 || bytes.byteLength > MAX_COVER_BYTES) {
			return null;
		}
		return { bytes, contentType: metadata.contentType, modifiedAt: fileStats.mtime };
	} catch {
		return null;
	}
}

async function downloadCover(
	directory: string,
	isbn: string,
	fetcher: typeof fetch,
): Promise<CachedBookCover | null> {
	let response: Response;
	try {
		response = await fetcher(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`, {
			headers: { "User-Agent": "Muninn book-cover cache" },
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		await writeNegativeCache(directory, isbn, "network", NETWORK_RETRY_MS);
		return null;
	}
	if (!response.ok) {
		await writeNegativeCache(
			directory,
			isbn,
			response.status === 404 ? "missing" : "network",
			response.status === 404 ? MISSING_RETRY_MS : NETWORK_RETRY_MS,
		);
		return null;
	}
	const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
	const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
	if (!allowedContentTypes.has(contentType) || declaredLength > MAX_COVER_BYTES) {
		await writeNegativeCache(directory, isbn, "invalid", INVALID_RETRY_MS);
		return null;
	}
	let bytes: Uint8Array;
	try {
		bytes = new Uint8Array(await response.arrayBuffer());
	} catch {
		await writeNegativeCache(directory, isbn, "network", NETWORK_RETRY_MS);
		return null;
	}
	if (bytes.byteLength === 0 || bytes.byteLength > MAX_COVER_BYTES) {
		await writeNegativeCache(directory, isbn, "invalid", INVALID_RETRY_MS);
		return null;
	}

	await mkdir(directory, { recursive: true });
	const files = coverPaths(directory, isbn);
	const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
	const temporaryImage = `${files.image}.${nonce}.tmp`;
	const temporaryMetadata = `${files.metadata}.${nonce}.tmp`;
	try {
		await writeFile(temporaryImage, bytes);
		await writeFile(temporaryMetadata, JSON.stringify({ contentType } satisfies CoverMetadata));
		await rename(temporaryImage, files.image);
		await rename(temporaryMetadata, files.metadata);
	} finally {
		await Promise.all([
			unlink(temporaryImage).catch(() => undefined),
			unlink(temporaryMetadata).catch(() => undefined),
		]);
	}
	const fileStats = await stat(files.image);
	await unlink(files.negative).catch(() => undefined);
	return { bytes, contentType, modifiedAt: fileStats.mtime };
}

export async function getBookCover(
	rawIsbn: string,
	options: { directory?: string; fetcher?: typeof fetch } = {},
) {
	const isbn = normalizeIsbn(rawIsbn);
	if (!isbn) return null;
	const directory = options.directory ?? BOOK_COVER_STATE_DIR;
	const cached = await readCachedCover(directory, isbn);
	if (cached) return cached;
	if (await hasActiveNegativeCache(directory, isbn)) return null;

	const existing = pendingDownloads.get(`${directory}:${isbn}`);
	if (existing) return existing;
	const download = downloadCover(directory, isbn, options.fetcher ?? fetch)
		.catch(() => null)
		.finally(() => pendingDownloads.delete(`${directory}:${isbn}`));
	pendingDownloads.set(`${directory}:${isbn}`, download);
	return download;
}

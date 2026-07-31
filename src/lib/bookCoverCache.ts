import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { BOOK_COVER_STATE_DIR } from "src/lib/state";

const MAX_COVER_BYTES = 8 * 1024 * 1024;
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

function normalizeIsbn(value: string) {
	const isbn = value.replace(/[^0-9X]/gi, "").toUpperCase();
	return /^(?:\d{9}[\dX]|\d{13})$/.test(isbn) ? isbn : null;
}

function coverPaths(directory: string, isbn: string) {
	return {
		image: path.join(directory, `${isbn}.image`),
		metadata: path.join(directory, `${isbn}.json`),
	};
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
	const response = await fetcher(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`, {
		headers: { "User-Agent": "Muninn book-cover cache" },
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) return null;
	const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
	const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
	if (!allowedContentTypes.has(contentType) || declaredLength > MAX_COVER_BYTES) return null;
	const bytes = new Uint8Array(await response.arrayBuffer());
	if (bytes.byteLength === 0 || bytes.byteLength > MAX_COVER_BYTES) return null;

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

	const existing = pendingDownloads.get(`${directory}:${isbn}`);
	if (existing) return existing;
	const download = downloadCover(directory, isbn, options.fetcher ?? fetch)
		.catch(() => null)
		.finally(() => pendingDownloads.delete(`${directory}:${isbn}`));
	pendingDownloads.set(`${directory}:${isbn}`, download);
	return download;
}

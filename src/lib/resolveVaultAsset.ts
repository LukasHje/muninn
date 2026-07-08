import { readdir } from "node:fs/promises";
import path from "node:path";
import { cleanImageReference } from "lib/parser";
import { RESOLVED_VAULT_PATH } from "lib/config";

export interface VaultAssetIndex {
	assetFiles: string[];
	byBaseName: Map<string, string[]>;
}

export const vaultAssetExtensions = new Set([
	".png",
	".jpg",
	".jpeg",
	".webp",
	".gif",
	".svg",
	".pdf",
]);

let assetIndexPromise: Promise<VaultAssetIndex> | null = null;

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

export async function getVaultAssetIndex(): Promise<VaultAssetIndex> {
	if (assetIndexPromise) {
		return assetIndexPromise;
	}

	assetIndexPromise = (async () => {
		const allFiles = await listFilesRecursively(RESOLVED_VAULT_PATH);
		const assetFiles = allFiles
			.filter((file) => vaultAssetExtensions.has(path.extname(file).toLowerCase()))
			.map((file) => formatRelativePath(path.relative(RESOLVED_VAULT_PATH, file)));
		const byBaseName = new Map<string, string[]>();

		for (const relativePath of assetFiles) {
			const key = path.basename(relativePath).toLowerCase();
			const existing = byBaseName.get(key) ?? [];
			existing.push(relativePath);
			byBaseName.set(key, existing);
		}

		return { assetFiles, byBaseName };
	})();

	return assetIndexPromise;
}

export function toVaultAssetUrl(relativeAssetPath: string) {
	return `/vault-assets/${relativeAssetPath
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/")}`;
}

function normalizeReference(reference: string) {
	return cleanImageReference(reference).replace(/^["']|["']$/g, "").trim();
}

function findCommonFolderMatch(reference: string, assetIndex: VaultAssetIndex) {
	const normalized = reference.toLowerCase();
	return assetIndex.assetFiles.find((asset) => asset.toLowerCase().endsWith(normalized));
}

export function resolveVaultAsset(
	reference: string,
	noteRelativePath: string,
	assetIndex: VaultAssetIndex
) {
	const cleaned = normalizeReference(reference);
	if (!cleaned || cleaned.startsWith("blob:")) {
		return undefined;
	}

	if (/^(https?:|data:)/i.test(cleaned)) {
		return cleaned;
	}

	if (cleaned.startsWith("/vault-assets/")) {
		return cleaned;
	}

	const directMatch = cleaned.replace(/^\/+/, "");
	if (!directMatch) {
		return undefined;
	}

	const candidates = assetIndex.byBaseName.get(path.basename(directMatch).toLowerCase());
	if (candidates && !directMatch.includes("/") && candidates[0]) {
		return toVaultAssetUrl(candidates[0]);
	}

	const absoluteLike = formatRelativePath(path.normalize(directMatch)).replace(/^(\.\.\/)+/, "");
	if (assetIndex.assetFiles.includes(absoluteLike)) {
		return toVaultAssetUrl(absoluteLike);
	}

	const noteDirectory = path.posix.dirname(noteRelativePath);
	const relativeCandidate = formatRelativePath(path.posix.normalize(path.posix.join(noteDirectory, absoluteLike)));
	if (assetIndex.assetFiles.includes(relativeCandidate)) {
		return toVaultAssetUrl(relativeCandidate);
	}

	const commonFolderMatch = findCommonFolderMatch(absoluteLike, assetIndex);
	if (commonFolderMatch) {
		return toVaultAssetUrl(commonFolderMatch);
	}

	if (candidates?.[0]) {
		return toVaultAssetUrl(candidates[0]);
	}

	return undefined;
}

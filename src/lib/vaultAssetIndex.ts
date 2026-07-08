import { readdir } from "node:fs/promises";
import path from "node:path";
import { RESOLVED_VAULT_PATH } from "lib/config";

export interface VaultAssetEntry {
	absolutePath: string;
	relativePath: string;
	filename: string;
	lowercaseFilename: string;
	normalizedFilename: string;
	publicUrl: string;
}

export interface VaultAssetIndex {
	entries: VaultAssetEntry[];
	byRelativePath: Map<string, VaultAssetEntry>;
	byLowercaseFilename: Map<string, VaultAssetEntry[]>;
	byNormalizedFilename: Map<string, VaultAssetEntry[]>;
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

export function normalizeAssetName(value: string) {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9.]+/g, "");
}

export function toVaultAssetUrl(relativeAssetPath: string) {
	return `/vault-assets/${relativeAssetPath
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/")}`;
}

export async function getVaultAssetIndex(): Promise<VaultAssetIndex> {
	if (assetIndexPromise) {
		return assetIndexPromise;
	}

	assetIndexPromise = (async () => {
		const files = await listFilesRecursively(RESOLVED_VAULT_PATH);
		const assetFiles = files.filter((file) => vaultAssetExtensions.has(path.extname(file).toLowerCase()));
		const entries = assetFiles.map((absolutePath) => {
			const relativePath = formatRelativePath(path.relative(RESOLVED_VAULT_PATH, absolutePath));
			const filename = path.basename(relativePath);
			return {
				absolutePath,
				relativePath,
				filename,
				lowercaseFilename: filename.toLowerCase(),
				normalizedFilename: normalizeAssetName(filename),
				publicUrl: toVaultAssetUrl(relativePath),
			} satisfies VaultAssetEntry;
		});

		const byRelativePath = new Map<string, VaultAssetEntry>();
		const byLowercaseFilename = new Map<string, VaultAssetEntry[]>();
		const byNormalizedFilename = new Map<string, VaultAssetEntry[]>();

		for (const entry of entries) {
			byRelativePath.set(entry.relativePath.toLowerCase(), entry);
			byLowercaseFilename.set(entry.lowercaseFilename, [
				...(byLowercaseFilename.get(entry.lowercaseFilename) ?? []),
				entry,
			]);
			byNormalizedFilename.set(entry.normalizedFilename, [
				...(byNormalizedFilename.get(entry.normalizedFilename) ?? []),
				entry,
			]);
		}

		return {
			entries,
			byRelativePath,
			byLowercaseFilename,
			byNormalizedFilename,
		};
	})();

	return assetIndexPromise;
}

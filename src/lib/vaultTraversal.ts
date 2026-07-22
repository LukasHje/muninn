import { readdir } from "node:fs/promises";
import path from "node:path";

const ignoredVaultDirectoryNames = new Set([".stversions"]);
const ignoredVaultFileNameMarkers = [".sync-conflict-"];

export function shouldTraverseDirectory(name: string): boolean {
	return !ignoredVaultDirectoryNames.has(name.toLowerCase());
}

export function shouldIncludeVaultFile(name: string): boolean {
	const normalizedName = name.toLowerCase();
	return !ignoredVaultFileNameMarkers.some((marker) => normalizedName.includes(marker));
}

export async function listVaultFilesRecursively(directory: string): Promise<string[]> {
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
				return shouldTraverseDirectory(entry.name)
					? listVaultFilesRecursively(fullPath)
					: [];
			}
			return shouldIncludeVaultFile(entry.name) ? fullPath : [];
		})
	);

	return files.flat();
}

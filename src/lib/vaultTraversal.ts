import { readdir } from "node:fs/promises";
import path from "node:path";

const ignoredVaultDirectoryNames = new Set([".stversions"]);

export function shouldTraverseDirectory(name: string): boolean {
	return !ignoredVaultDirectoryNames.has(name.toLowerCase());
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
			return fullPath;
		})
	);

	return files.flat();
}

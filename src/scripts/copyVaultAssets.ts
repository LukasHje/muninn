import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { RESOLVED_VAULT_PATH } from "lib/config";
import { vaultAssetExtensions } from "lib/vaultAssetIndex";

const root = process.cwd();
const sourceRoot = RESOLVED_VAULT_PATH;
const targetRoot = path.join(root, "public", "vault-assets");

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

async function copyVaultAssets() {
	await mkdir(targetRoot, { recursive: true });
	const files = await listFilesRecursively(sourceRoot);
	const assetFiles = files.filter((file) => vaultAssetExtensions.has(path.extname(file).toLowerCase()));

	await Promise.all(
		assetFiles.map(async (file) => {
			const relativePath = path.relative(sourceRoot, file);
			const destination = path.join(targetRoot, relativePath);
			await mkdir(path.dirname(destination), { recursive: true });
			await cp(file, destination, { force: true });
		})
	);

	console.log(`Copied ${assetFiles.length} vault assets from ${sourceRoot} to public/vault-assets`);
}

copyVaultAssets().catch((error) => {
	console.error(error);
	process.exit(1);
});

import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { RESOLVED_VAULT_PATH } from "src/lib/config";
import { vaultAssetExtensions } from "src/lib/vaultAssetIndex";
import { listVaultFilesRecursively } from "src/lib/vaultTraversal";

const root = process.cwd();
const sourceRoot = RESOLVED_VAULT_PATH;
const targetRoot = path.join(root, "public", "vault-assets");

async function copyVaultAssets() {
	await mkdir(targetRoot, { recursive: true });
	const files = await listVaultFilesRecursively(sourceRoot);
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

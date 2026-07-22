import { invalidateLegacyVaultAssetIndexCache } from "src/lib/resolveVaultAsset";
import { invalidateVaultDataCache } from "src/lib/vault";
import { invalidateVaultAssetIndexCache } from "src/lib/vaultAssetIndex";

/**
 * Discards all in-memory data derived from the Obsidian vault.
 *
 * This function intentionally performs no filesystem work. The existing
 * loading pipeline rebuilds each cache lazily when it is requested again.
 */
export function invalidateVaultCaches() {
	invalidateVaultDataCache();
	invalidateVaultAssetIndexCache();
	invalidateLegacyVaultAssetIndexCache();
}

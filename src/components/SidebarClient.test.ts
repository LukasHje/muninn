import assert from "node:assert/strict";
import test from "node:test";
import { formatVaultReloadCooldown } from "src/components/SidebarClient";

test("vault reload cooldown uses minute labels until 59 seconds remain", () => {
	assert.equal(formatVaultReloadCooldown(120), "2min");
	assert.equal(formatVaultReloadCooldown(119), "2min");
	assert.equal(formatVaultReloadCooldown(60), "1min");
	assert.equal(formatVaultReloadCooldown(59), "59s");
	assert.equal(formatVaultReloadCooldown(1), "1s");
	assert.equal(formatVaultReloadCooldown(0), "0s");
});

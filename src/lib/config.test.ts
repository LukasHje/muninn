import assert from "node:assert/strict";
import test from "node:test";
import { readEnvironmentValue } from "src/lib/config";

test("runtime environment overrides the build environment", () => {
	assert.equal(
		readEnvironmentValue(
			"VAULT_PATH",
			{ VAULT_PATH: "/vault" },
			{ VAULT_PATH: "/tmp/muninn-build-vault" }
		),
		"/vault"
	);
});

test("build environment remains available as a local fallback", () => {
	assert.equal(
		readEnvironmentValue(
			"VAULT_PATH",
			{ VAULT_PATH: " " },
			{ VAULT_PATH: "./data/example-vault" }
		),
		"./data/example-vault"
	);
});

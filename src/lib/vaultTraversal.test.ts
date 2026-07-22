import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	listVaultFilesRecursively,
	shouldTraverseDirectory,
} from "./vaultTraversal";

test("shouldTraverseDirectory excludes Syncthing version metadata", () => {
	assert.equal(shouldTraverseDirectory(".stversions"), false);
	assert.equal(shouldTraverseDirectory("notes"), true);
});

test("listVaultFilesRecursively does not return files below .stversions", async () => {
	const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "muninn-vault-traversal-"));

	try {
		await mkdir(path.join(vaultRoot, "notes"));
		await mkdir(path.join(vaultRoot, ".stversions", "notes"), { recursive: true });
		await writeFile(path.join(vaultRoot, "notes", "current.md"), "# Current");
		await writeFile(path.join(vaultRoot, ".stversions", "notes", "archived.md"), "# Archived");

		const files = await listVaultFilesRecursively(vaultRoot);
		const relativeFiles = files.map((file) => path.relative(vaultRoot, file));

		assert.deepEqual(relativeFiles, [path.join("notes", "current.md")]);
	} finally {
		await rm(vaultRoot, { recursive: true, force: true });
	}
});

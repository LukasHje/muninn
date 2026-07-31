import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getBookCover } from "src/lib/bookCoverCache";

test("book covers are downloaded once and reused from persistent storage", async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "muninn-book-covers-"));
	let requests = 0;
	const fetcher = async () => {
		requests += 1;
		return new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "Content-Type": "image/jpeg" } });
	};
	try {
		const downloaded = await getBookCover("9780340822784", { directory, fetcher: fetcher as typeof fetch });
		const cached = await getBookCover("9780340822784", {
			directory,
			fetcher: (() => { throw new Error("offline"); }) as typeof fetch,
		});
		assert.deepEqual(Array.from(downloaded?.bytes ?? []), [1, 2, 3, 4]);
		assert.deepEqual(Array.from(cached?.bytes ?? []), [1, 2, 3, 4]);
		assert.equal(requests, 1);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("book-cover cache rejects invalid identifiers", async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "muninn-book-covers-"));
	try {
		assert.equal(await getBookCover("../../secret", {
			directory,
			fetcher: (() => { throw new Error("must not fetch"); }) as typeof fetch,
		}), null);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("book-cover cache suppresses repeated missing, invalid, and offline requests", async (context) => {
	const cases = [
		["missing", async () => new Response(null, { status: 404 })],
		["invalid", async () => new Response("not an image", { headers: { "Content-Type": "text/plain" } })],
		["network", async () => { throw new Error("offline"); }],
	] as const;

	for (const [name, responseFactory] of cases) {
		await context.test(name, async () => {
			const directory = await mkdtemp(path.join(os.tmpdir(), "muninn-book-covers-"));
			let requests = 0;
			const fetcher = async () => {
				requests += 1;
				return responseFactory();
			};
			try {
				assert.equal(await getBookCover("9780340822784", { directory, fetcher: fetcher as typeof fetch }), null);
				assert.equal(await getBookCover("9780340822784", { directory, fetcher: fetcher as typeof fetch }), null);
				assert.equal(requests, 1);
			} finally {
				await rm(directory, { recursive: true, force: true });
			}
		});
	}
});

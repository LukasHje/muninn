import assert from "node:assert/strict";
import test from "node:test";
import { highlightCode, normalizeCodeLanguage } from "src/lib/codeHighlight";

test("normalizes fenced code language labels", () => {
	assert.equal(normalizeCodeLanguage(" Python "), "python");
	assert.equal(normalizeCodeLanguage("ts title=example.ts"), "ts");
	assert.equal(normalizeCodeLanguage(""), "text");
});

test("highlights supported languages with grammar-aware token colors", async () => {
	const result = await highlightCode("const answer = 42;", "typescript");
	assert.equal(result.highlighted, true);
	assert.equal(result.language, "typescript");
	assert.match(result.html, /<span style="color:#[0-9a-fA-F]{6}">/);
	assert.match(result.html, /answer/);
});

test("escapes unsupported languages and falls back to plain code", async () => {
	const result = await highlightCode("<widget>&", "muninn-unknown");
	assert.equal(result.highlighted, false);
	assert.equal(result.html, "&lt;widget&gt;&amp;");
});

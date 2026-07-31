import assert from "node:assert/strict";
import test from "node:test";
import { getExperienceDefinition } from "./experiences/registry";
import { getCardImage, isPlaceholderExperienceImage } from "./experiences/selectors";
import type { LibraryItem } from "./vault";

function createGear(frontmatter: LibraryItem["frontmatter"] = {}): LibraryItem {
	return {
		id: "gear-without-artwork",
		title: "Gear without artwork",
		href: "/notes/gear-without-artwork",
		slugPath: "gear-without-artwork",
		domainKey: "ovrigt",
		domainLabel: "Gear",
		domainIcon: "gear",
		tone: "emerald",
		excerpt: "Gear excerpt",
		updatedLabel: "Today",
		tags: [],
		relativePath: "gear-without-artwork.md",
		createdAt: 1,
		updatedAt: 1,
		content: "# Gear without artwork",
		frontmatter: { type: "gear", ...frontmatter },
		normalized: {
			title: "Gear without artwork",
			path: "gear-without-artwork.md",
			slug: "gear-without-artwork",
			domain: "ovrigt",
			type: "gear",
			layout: "plain",
			tags: [],
			aliases: [],
			metadata: {},
		},
		imageReferences: {},
	};
}

test("Gear cards resolve the colocated Experience placeholder when artwork is absent", () => {
	const definition = getExperienceDefinition("gear");
	assert.ok(definition);
	assert.equal(definition.assets.placeholderThumbnail, "/experiences/gear/gear-placeholder-thumbnail.webp");
	const image = getCardImage(createGear(), definition);
	assert.equal(image, "/experiences/gear/gear-placeholder-thumbnail.webp");
	assert.equal(isPlaceholderExperienceImage(image, definition), true);
});

test("Gear card artwork still takes precedence over the Experience placeholder", () => {
	const definition = getExperienceDefinition("gear");
	assert.ok(definition);
	assert.equal(getCardImage(createGear({ thumbnail: "/vault-assets/gear.webp" }), definition), "/vault-assets/gear.webp");
});

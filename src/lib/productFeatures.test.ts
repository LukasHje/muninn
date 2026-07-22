import assert from "node:assert/strict";
import test from "node:test";
import { extractProductFeatures } from "./experiences/productFeatures";
import type { LibraryItem } from "./vault";

function createGearNote(content: string) {
	return { content } as LibraryItem;
}

test("extracts preferred rifle caliber, barrel length and approximate weight from specifications", () => {
	const note = createGearNote(`
## Specifications

| Specification | Value |
| --- | --- |
| Caliber | 7.62×51 NATO / .308 Winchester |
| Barrel length | 18" |
| Weight | ~3.9 kg |
`);

	assert.deepEqual(
		extractProductFeatures(note, ["Specifications"]),
		[
			{
				id: "caliber",
				label: "Caliber",
				value: ".308",
				iconName: "crosshair",
				priority: 89,
			},
			{
				id: "barrel-length",
				label: "Barrel length",
				value: '18"',
				iconName: "blade-length",
				priority: 88,
			},
			{
				id: "weight",
				label: "Weight",
				value: "~3.9 kg",
				iconName: "weight",
				priority: 74,
			},
		],
	);
});

test("preserves the complete metric rifle cartridge when no preferred decimal caliber exists", () => {
	const note = createGearNote(`
## Specifications

- Kaliber 7.62×51 NATO
- 18-tums kallhamrad pipa
`);
	const features = extractProductFeatures(note, ["Specifications"]);

	assert.equal(features.find((feature) => feature.id === "caliber")?.value, "7.62x51");
	assert.equal(features.find((feature) => feature.id === "barrel-length")?.value, '18"');
});

test("normalizes Rain Defender and Swedish water-repellent wording as water resistant", () => {
	const note = createGearNote(`
## Key features

- Rain Defender vattenavvisande behandling
`);
	const features = extractProductFeatures(note, ["Key features"]);

	assert.deepEqual(features[0], {
		id: "waterproof",
		label: "Water resistance",
		value: "Water resistant",
		iconName: "droplets",
		priority: 95,
	});
});

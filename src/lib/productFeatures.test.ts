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

test("distinguishes Bluetooth support from explicit Bluetooth absence", () => {
	const supported = createGearNote(`
## Key features

- Bluetooth 5.3 connectivity
`);
	const unsupported = createGearNote(`
## Key features

- Saknar Bluetooth
`);

	assert.deepEqual(extractProductFeatures(supported, ["Key features"])[0], {
		id: "bluetooth",
		label: "Bluetooth",
		value: "Bluetooth 5.3",
		iconName: "bluetooth",
		priority: 89,
	});
	assert.deepEqual(extractProductFeatures(unsupported, ["Key features"])[0], {
		id: "bluetooth",
		label: "Bluetooth",
		value: "No Bluetooth",
		iconName: "bluetooth-off",
		priority: 89,
	});
});

test("Bluetooth negation takes precedence over generic Bluetooth recognition", () => {
	const note = createGearNote(`
## Specifications

| Connectivity | Bluetooth is not supported |
`);

	const feature = extractProductFeatures(note, ["Specifications"])[0];
	assert.equal(feature?.value, "No Bluetooth");
	assert.equal(feature?.iconName, "bluetooth-off");
});

test("normalizes English and Swedish wireless wording for Gear spec bars", () => {
	const englishNote = createGearNote(`
## Key features

- Wireless ergonomic mouse
`);
	const swedishNote = createGearNote(`
## Key features

- Trådlös anslutning
`);

	for (const note of [englishNote, swedishNote]) {
		assert.deepEqual(extractProductFeatures(note, ["Key features"])[0], {
			id: "wireless",
			label: "Wireless",
			value: "Wireless",
			iconName: "wifi",
			priority: 88,
		});
	}
});

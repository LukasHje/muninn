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

test("uses weather and water icons for their matching protection concepts", () => {
	const waterproof = createGearNote(`
## Key features

- Vattentät enligt IPX4
`);
	const feature = extractProductFeatures(waterproof, ["Key features"])[0];

	assert.equal(feature?.value, "IPX4");
	assert.equal(feature?.iconName, "droplets");

	const weatherproof = createGearNote(`
## Key features

- Vädertålig konstruktion
`);
	assert.equal(extractProductFeatures(weatherproof, ["Key features"])[0]?.iconName, "waterproof");
});

test("compacts large battery capacities to one decimal without losing magnitude", () => {
	const compact = createGearNote(`
## Specifications

- Battery capacity: 26500 mAh
`);
	const grouped = createGearNote(`
## Key features

- 10 000 mAh lithium-ion-batteri.
`);
	const groupedLarge = createGearNote(`
## Key features

- 40 000 mAh batterikapacitet.
`);

	assert.equal(extractProductFeatures(compact, ["Specifications"])[0]?.value, "26,5k mAh");
	assert.equal(extractProductFeatures(grouped, ["Key features"])[0]?.value, "10k mAh");
	assert.equal(extractProductFeatures(groupedLarge, ["Key features"])[0]?.value, "40k mAh");
});

test("extracts Swedish replaceable AA battery counts", () => {
	const note = createGearNote(`
## Key features

- Utbytbara batterier (4 stycken AA batterier).
`);

	assert.deepEqual(extractProductFeatures(note, ["Key features"])[0], {
		id: "battery-count",
		label: "Batteries",
		value: "4x AA",
		iconName: "battery",
		priority: 90,
	});
});

test("separates battery capacity from chemistry and tool platform", () => {
	const lithium = createGearNote(`
## Key features

- 10 000 mAh lithium-ion-batteri.
`);
	const milwaukee = createGearNote(`
## Specifications

| Battery system | M18 REDLITHIUM |
## Limitations

- 5,0 Ah-batteriet ökar både vikt och storlek ytterligare.
`);
	const unrelatedThread = createGearNote(`
## Specifications

- Thread: M18×1.
`);

	assert.deepEqual(
		extractProductFeatures(lithium, ["Key features"]).map(({ id, value, iconName }) => ({ id, value, iconName })),
		[
			{ id: "battery-capacity", value: "10k mAh", iconName: "battery" },
			{ id: "battery-type", value: "Li-ion", iconName: "car-battery" },
		]
	);
	assert.deepEqual(
		extractProductFeatures(milwaukee, ["Specifications", "Limitations"])
			.filter((feature) => feature.id.startsWith("battery"))
			.map(({ id, value, iconName }) => ({ id, value, iconName })),
		[
			{ id: "battery-capacity", value: "5.0 Ah", iconName: "battery" },
			{ id: "battery-type", value: "M18", iconName: "car-battery" },
		]
	);
	assert.equal(extractProductFeatures(unrelatedThread, ["Specifications"]).some((feature) => feature.id === "battery-type"), false);
});

test("does not interpret recorder tracks as GPS waypoints", () => {
	const note = createGearNote(`
## Key features

- Up to six recording tracks.
`);

	assert.equal(extractProductFeatures(note, ["Key features"]).some((feature) => feature.id === "waypoints"), false);
});

test("extracts diameter, focal length, optical zoom and reference colors", () => {
	const note = createGearNote(`
## Specifications

| Maximum diameter | 88.5 mm |
| Focal length | 24–70 mm |
- 4.4× optisk zoom.
- Klassisk ColorChecker med 24 referensfärger.
`);
	const features = extractProductFeatures(note, ["Specifications"]);

	assert.deepEqual(
		features.map(({ id, value, iconName }) => ({ id, value, iconName })),
		[
			{ id: "diameter", value: "88.5 mm", iconName: "diameter" },
			{ id: "focal-length", value: "24–70 mm", iconName: "aperture" },
			{ id: "optical-zoom", value: "4.4x zoom", iconName: "binoculars" },
			{ id: "reference-colors", value: "24 colors", iconName: "swatch-book" },
		]
	);
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

test("extracts FM and AM/FM radio capabilities", () => {
	const fmRadio = createGearNote(`
## Key features

- Portabel FM-radio.
`);
	const amFmRadio = createGearNote(`
## Key features

- Vanlig AM/FM-radio.
`);

	assert.deepEqual(extractProductFeatures(fmRadio, ["Key features"])[0], {
		id: "fm-radio",
		label: "Radio",
		value: "FM radio",
		iconName: "audio-lines",
		priority: 89,
	});
	assert.equal(extractProductFeatures(amFmRadio, ["Key features"])[0]?.value, "AM/FM");
});

test("extracts cassette and future optical-disc media formats", () => {
	const cassette = createGearNote(`
## Key features

- Modern kassettmekanik.
`);
	const compactDisc = createGearNote(`
## Key features

- Portable CD player.
`);
	const dvd = createGearNote(`
## Specifications

- DVD-spelare.
`);

	assert.equal(extractProductFeatures(cassette, ["Key features"])[0]?.iconName, "cassette-tape");
	assert.equal(extractProductFeatures(compactDisc, ["Key features"])[0]?.value, "CD");
	assert.equal(extractProductFeatures(dvd, ["Specifications"])[0]?.value, "DVD");
});

test("Gear feature sections include explicit limitations such as missing Bluetooth", () => {
	const note = createGearNote(`
## Limitations

- Ingen Bluetooth.
`);

	assert.equal(extractProductFeatures(note, ["Limitations"])[0]?.value, "No Bluetooth");
});

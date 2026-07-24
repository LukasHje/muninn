import assert from "node:assert/strict";
import test from "node:test";
import { filterExperienceNotes } from "./experiences/filters";
import { buildExperienceViewModel } from "./experiences/experience";
import {
	buildVehicleDashboardModel,
	getVehicleCategory,
	getVehicleCategoryIcon,
	getVehicleMetadata,
	resolveVehiclePlaceholderThumbnail,
} from "./experiences/vehicles";
import { getExperienceDefinition } from "./experiences/registry";
import {
	getCardImage,
	getExperienceNotes,
	getNoteMetadataValues,
	isPlaceholderExperienceImage,
} from "./experiences/selectors";
import type { LibraryItem } from "./vault";

function createVehicle(
	id: string,
	frontmatter: LibraryItem["frontmatter"],
	overrides: Partial<LibraryItem> = {}
): LibraryItem {
	return {
		id,
		title: id,
		href: `/notes/${id}`,
		slugPath: id,
		domainKey: "ovrigt",
		domainLabel: "Vehicle",
		domainIcon: "car-front",
		tone: "slate",
		excerpt: `${id} excerpt`,
		updatedLabel: "Today",
		tags: [],
		relativePath: `${id}.md`,
		createdAt: 1,
		updatedAt: 1,
		content: `# ${id}`,
		frontmatter,
		normalized: {
			title: id,
			path: `${id}.md`,
			slug: id,
			domain: "ovrigt",
			type: String(frontmatter.type ?? "vehicle"),
			layout: "plain",
			tags: [],
			aliases: [],
			metadata: Object.fromEntries(
				Object.entries(frontmatter).filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
			),
		},
		imageReferences: {},
		...overrides,
	};
}

test("Vehicles selector accepts vehicle, vehicles and fordon without route-specific matching", () => {
	const definition = getExperienceDefinition("vehicles");
	assert.ok(definition);
	const notes = [
		createVehicle("singular", { type: "vehicle" }),
		createVehicle("plural", { type: "vehicles" }),
		createVehicle("swedish", { type: "fordon" }),
		createVehicle("other", { type: "recipe" }),
	];

	assert.deepEqual(getExperienceNotes(notes, definition).map((note) => note.id), ["singular", "plural", "swedish"]);
});

test("vehicle metadata supports English and Swedish aliases", () => {
	const note = createVehicle("defender", {
		type: "fordon",
		märke: "Land Rover",
		modell: "Defender 110",
		årsmodell: "1996",
		kaross: "SUV",
		drivlina: "4x4",
		bränsle: "Diesel",
		växellåda: "Manual",
		betyg: "4.5",
	});
	const metadata = getVehicleMetadata(note);

	assert.equal(metadata.manufacturer, "Land Rover");
	assert.equal(metadata.model, "Defender 110");
	assert.equal(metadata.year, "1996");
	assert.equal(metadata.bodyStyle, "SUV");
	assert.equal(metadata.drivetrain, "4x4");
	assert.equal(metadata.fuel, "Diesel");
	assert.equal(metadata.transmission, "Manual");
	assert.equal(metadata.rating, 4.5);
});

test("planned vehicles use target specifications when actual specifications are absent", () => {
	const note = createVehicle("planned-defender", {
		type: "vehicle",
		status: "wishlist",
		target_drivetrain: "4x4",
		target_fuel: "Diesel",
		target_transmission: "Manual",
	});
	const metadata = getVehicleMetadata(note);

	assert.equal(metadata.status, "planned");
	assert.equal(metadata.drivetrain, "4x4");
	assert.equal(metadata.fuel, "Diesel");
	assert.equal(metadata.transmission, "Manual");
	assert.deepEqual(getNoteMetadataValues(note, "drivetrain"), ["4x4"]);
	assert.deepEqual(getNoteMetadataValues(note, "fuel"), ["Diesel"]);
	assert.deepEqual(getNoteMetadataValues(note, "transmission"), ["Manual"]);
});

test("actual vehicle specifications take precedence over target specifications", () => {
	const note = createVehicle("owned-defender", {
		type: "vehicle",
		status: "owned",
		drivetrain: "AWD",
		fuel: "Petrol",
		transmission: "Automatic",
		target_drivetrain: "4x4",
		target_fuel: "Diesel",
		target_transmission: "Manual",
	});
	const metadata = getVehicleMetadata(note);

	assert.equal(metadata.drivetrain, "AWD");
	assert.equal(metadata.fuel, "Petrol");
	assert.equal(metadata.transmission, "Automatic");
});

test("vehicle status filters present planned and wishlist as the same state", () => {
	const notes = [
		createVehicle("owned", { type: "vehicle", status: "owned" }),
		createVehicle("planned", { type: "vehicle", status: "planned" }),
		createVehicle("wishlist", { type: "vehicle", status: "wishlist" }),
	];

	assert.deepEqual(getNoteMetadataValues(notes[2], "vehicle_status"), ["planned"]);
	assert.deepEqual(filterExperienceNotes(notes, {
		metadata: { vehicle_status: "planned" },
		tag: null,
		selected: null,
		inspector: "closed",
	}).map((note) => note.id), ["planned", "wishlist"]);
});

test("title sorting presents vehicles in ascending A to Z order", () => {
	const definition = getExperienceDefinition("vehicles");
	assert.ok(definition);
	const notes = [
		createVehicle("zebra", { type: "vehicle" }, { title: "Zebra" }),
		createVehicle("alpha", { type: "vehicle" }, { title: "Alpha" }),
		createVehicle("beta", { type: "vehicle" }, { title: "Beta" }),
	];
	const model = buildExperienceViewModel(definition, notes, new URLSearchParams("sort=title"));

	assert.deepEqual(model.filteredNotes.map((note) => note.title), ["Alpha", "Beta", "Zebra"]);
});

test("vehicle dashboard derives garage statistics from real note metadata", () => {
	const notes = [
		createVehicle("defender", {
			type: "vehicle",
			status: "owned",
			manufacturer: "Land Rover",
			body_style: "SUV",
			drivetrain: "4x4",
			fuel: "Diesel",
			rating: "5",
		}, { updatedAt: 3 }),
		createVehicle("benz", {
			type: "vehicle",
			status: "planned",
			manufacturer: "Mercedes-Benz",
			body_style: "Van",
			drivetrain: "RWD",
			fuel: "Diesel",
			rating: "4",
		}, { updatedAt: 2 }),
		createVehicle("bike", {
			type: "vehicle",
			status: "wishlist",
			manufacturer: "BMW",
			body_style: "Bike",
			drivetrain: "Shaft",
			fuel: "Petrol",
		}, { updatedAt: 1 }),
	];
	const dashboard = buildVehicleDashboardModel(notes);

	assert.equal(dashboard.total, 3);
	assert.equal(dashboard.owned, 1);
	assert.equal(dashboard.planned, 2);
	assert.equal(dashboard.wishlist, 0);
	assert.equal(dashboard.reviewed, 2);
	assert.equal(dashboard.averageRating, 4.5);
	assert.deepEqual(dashboard.fuels.map(({ value, count }) => ({ value, count })), [
		{ value: "Diesel", count: 2 },
		{ value: "Petrol", count: 1 },
	]);
	assert.deepEqual(dashboard.recent.map((note) => note.id), ["defender", "benz", "bike"]);
});

test("vehicle dashboard classifies undocumented drivetrains as Other", () => {
	const notes = [
		createVehicle("documented", { type: "vehicle", drivetrain: "4x4" }),
		createVehicle("undocumented", { type: "vehicle" }),
	];
	const dashboard = buildVehicleDashboardModel(notes);

	assert.deepEqual(dashboard.drivetrains.map(({ value, count }) => ({ value, count })), [
		{ value: "4x4", count: 1 },
		{ value: "Other", count: 1 },
	]);
	assert.deepEqual(getNoteMetadataValues(notes[1], "drivetrain"), ["Other"]);
});

test("vehicle dashboard aggregates planned target specifications", () => {
	const notes = [
		createVehicle("planned-diesel", {
			type: "vehicle",
			status: "planned",
			target_drivetrain: "4x4",
			target_fuel: "Diesel",
		}),
		createVehicle("wishlist-electric", {
			type: "vehicle",
			status: "wishlist",
			target_drivetrain: "AWD",
			target_fuel: "Electric",
		}),
	];
	const dashboard = buildVehicleDashboardModel(notes);

	assert.deepEqual(dashboard.drivetrains.map(({ value, count }) => ({ value, count })), [
		{ value: "4x4", count: 1 },
		{ value: "AWD", count: 1 },
	]);
	assert.deepEqual(dashboard.fuels.map(({ value, count }) => ({ value, count })), [
		{ value: "Diesel", count: 1 },
		{ value: "Electric", count: 1 },
	]);
});

test("vehicle category icons follow the body-style families", () => {
	assert.equal(getVehicleCategoryIcon("SUV"), "car");
	assert.equal(getVehicleCategoryIcon("Semi Truck"), "van");
	assert.equal(getVehicleCategoryIcon("Pickup"), "van");
	assert.equal(getVehicleCategoryIcon("Moped"), "motorbike");
	assert.equal(getVehicleCategoryIcon("Cruiser"), "motorbike");
	assert.equal(getVehicleCategoryIcon("Utility"), "tractor");
	assert.equal(getVehicleCategoryIcon("Bicycle"), "bike");
});

test("vehicle categories group related body-style variants for filtering", () => {
	const notes = [
		createVehicle("cargo-bike", { type: "vehicle", body_style: "expedition-cargo-bicycle" }),
		createVehicle("touring-bike", { type: "vehicle", body_style: "touring bicycle" }),
		createVehicle("moped", { type: "vehicle", body_style: "Moped" }),
		createVehicle("wagon", { type: "vehicle", body_style: "Crossover Wagon" }),
	];
	const dashboard = buildVehicleDashboardModel(notes);
	const bicycleNotes = filterExperienceNotes(notes, {
		metadata: { vehicle_category: "Bicycle" },
		tag: null,
		selected: null,
		inspector: "closed",
	});

	assert.equal(getVehicleCategory("expedition-cargo-bicycle"), "Bicycle");
	assert.equal(getVehicleCategory("touring bicycle"), "Bicycle");
	assert.equal(getVehicleCategory("Crossover Wagon"), "Station Wagon");
	assert.deepEqual(bicycleNotes.map((note) => note.id), ["cargo-bike", "touring-bike"]);
	assert.deepEqual(dashboard.categories.map(({ value, count }) => ({ value, count })), [
		{ value: "Bicycle", count: 2 },
		{ value: "Moped", count: 1 },
		{ value: "Station Wagon", count: 1 },
	]);
});

test("vehicle placeholders resolve from normalized body-style categories", () => {
	const definition = getExperienceDefinition("vehicles");
	assert.ok(definition);

	assert.equal(
		resolveVehiclePlaceholderThumbnail(definition, "Moped"),
		"/assets/placeholders/vehicle-moped-placeholder.webp"
	);
	assert.equal(
		resolveVehiclePlaceholderThumbnail(definition, "Cruiser"),
		"/assets/placeholders/vehicle-motorcycle-placeholder.webp"
	);
	assert.equal(
		resolveVehiclePlaceholderThumbnail(definition, "Crossover Wagon"),
		"/assets/placeholders/vehicle-station-wagon-placeholder.webp"
	);
	assert.equal(
		resolveVehiclePlaceholderThumbnail(definition, "Compact Hatchback"),
		"/assets/placeholders/vehicle-hatchback-placeholder.webp"
	);
	assert.equal(
		resolveVehiclePlaceholderThumbnail(definition, "SUV"),
		"/assets/placeholders/vehicle-suv-placeholder.webp"
	);
	assert.equal(
		resolveVehiclePlaceholderThumbnail(definition, "Off-road"),
		"/assets/placeholders/vehicle-terrain-vehicle-placeholder.webp"
	);
	assert.equal(resolveVehiclePlaceholderThumbnail(definition, "Bicycle"), null);
	assert.equal(
		resolveVehiclePlaceholderThumbnail(definition, null),
		definition.assets.placeholderThumbnail
	);
});

test("vehicle card image selection uses and recognizes the resolved category placeholder", () => {
	const definition = getExperienceDefinition("vehicles");
	assert.ok(definition);
	const note = createVehicle("covered-moped", { type: "vehicle", body_style: "Moped" });
	const placeholder = resolveVehiclePlaceholderThumbnail(definition, "Moped");
	const image = getCardImage(note, definition, placeholder);

	assert.equal(image, "/assets/placeholders/vehicle-moped-placeholder.webp");
	assert.equal(isPlaceholderExperienceImage(image, definition), true);
});

test("explicit note images take precedence over category placeholders", () => {
	const definition = getExperienceDefinition("vehicles");
	assert.ok(definition);
	const note = createVehicle(
		"moped-with-cover",
		{ type: "vehicle", body_style: "Moped", cover: "moped-cover.webp" },
		{ imageReferences: { "moped-cover.webp": "/vault-assets/moped-cover.webp" } }
	);
	const placeholder = resolveVehiclePlaceholderThumbnail(definition, "Moped");

	assert.equal(
		getCardImage(note, definition, placeholder),
		"/vault-assets/moped-cover.webp"
	);
});

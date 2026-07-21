import { extractHeadingSections } from "src/lib/markdown/core";
import type { LibraryItem } from "src/lib/vault";

export interface ExtractedProductFeature {
	id: string;
	label: string;
	value: string;
	iconName: string;
	priority: number;
}

interface ProductFeatureDefinition {
	id: string;
	label: string;
	iconName: string;
	priority: number;
	extractValue: (bullet: string) => string | null;
	selectValue?: (bullets: string[]) => string | null;
}

function stripMarkdownFormatting(value: string) {
	return value
		.replace(/[*_`]/g, "")
		.replace(/\[(.*?)\]\((.*?)\)/g, "$1")
		.replace(/\[\[([^|\]]+)\|?([^\]]+)?\]\]/g, (_, link, label) => label || link)
		.trim();
}

function normalizeHeadingTitle(value: string) {
	return stripMarkdownFormatting(value).replace(/\s+/g, " ").trim().toLocaleLowerCase("en");
}

function normalizeBulletValue(value: string) {
	return stripMarkdownFormatting(value).replace(/\s+/g, " ").trim();
}

function toTitleCase(value: string) {
	return value
		.toLocaleLowerCase("en")
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDecimalValue(value: string) {
	return value.replace(",", ".");
}

function formatSignedDecimalValue(value: string) {
	const normalized = formatDecimalValue(value).replace(/^[−–—]/, "-");
	return normalized.startsWith("-") ? `−${normalized.slice(1)}` : normalized;
}

function formatUnitValue(amount: string, unit: string) {
	return `${formatDecimalValue(amount)} ${unit}`;
}

function formatSignedUnitValue(amount: string, unit: string) {
	return `${formatSignedDecimalValue(amount)} ${unit}`;
}

const spelledCountMap: Record<string, string> = {
	one: "1",
	ett: "1",
	en: "1",
	two: "2",
	två: "2",
	three: "3",
	tre: "3",
	four: "4",
	fyra: "4",
};

function extractSpelledCount(value: string) {
	const normalized = value.toLocaleLowerCase("sv");
	const tokens = normalized.split(/[^\p{L}\p{N}-]+/u).filter(Boolean);

	for (const token of tokens) {
		const count = spelledCountMap[token];
		if (count) {
			return count;
		}
	}

	return null;
}

function extractFeatureBullets(note: LibraryItem, featureSections: string[]) {
	const allowedSections = new Set(featureSections.map(normalizeHeadingTitle));
	if (allowedSections.size === 0) {
		return [];
	}

	const sections = extractHeadingSections(note.content, 2).filter((section) =>
		allowedSections.has(section.normalizedTitle ?? normalizeHeadingTitle(section.title))
	);

	return sections.flatMap((section) => parseMarkdownBullets(section.content));
}

function parseMarkdownBullets(content: string) {
	const lines = content.split(/\r?\n/g);
	const bullets: string[] = [];
	let currentBullet: string[] = [];

	const flushBullet = () => {
		if (currentBullet.length === 0) {
			return;
		}

		const bullet = normalizeBulletValue(currentBullet.join(" "));
		if (bullet) {
			bullets.push(bullet);
		}
		currentBullet = [];
	};

	for (const line of lines) {
		const bulletMatch = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.+?)\s*$/);
		if (bulletMatch) {
			flushBullet();
			currentBullet = [bulletMatch[1].trim()];
			continue;
		}

		if (currentBullet.length > 0) {
			if (!line.trim()) {
				flushBullet();
				continue;
			}

			if (/^\s{2,}\S/.test(line) && !/^\s*#{1,6}\s+/.test(line)) {
				currentBullet.push(line.trim());
				continue;
			}
		}

		flushBullet();
	}

	flushBullet();
	return bullets;
}

function extractRuntimeFeature(bullet: string) {
	const hourMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h|timmar?|tim)\b/i);
	if (hourMatch) {
		return formatUnitValue(hourMatch[1], "h");
	}

	const dayMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(days?|dygn)\b/i);
	if (dayMatch) {
		return formatUnitValue(dayMatch[1], "d");
	}

	if (/\b(unlimited|obegränsad)\b/i.test(bullet)) {
		return "Unlimited";
	}

	return null;
}

function extractTemperatureFeature(bullet: string) {
	const celsiusRangeMatch = bullet.match(
		/([−–—-]?\d+(?:[.,]\d+)?)\s*°\s*C\b\s*(?:to|–|—|-|until|till)\s*([−–—-]?\d+(?:[.,]\d+)?)\s*°?\s*C\b/i
	);
	if (celsiusRangeMatch) {
		return `${formatSignedUnitValue(celsiusRangeMatch[1], "°C")} to ${formatSignedUnitValue(celsiusRangeMatch[2], "°C")}`;
	}

	const celsiusMatch = bullet.match(/([−–—-]?\d+(?:[.,]\d+)?)\s*°\s*C\b/i);
	if (celsiusMatch) {
		return formatSignedUnitValue(celsiusMatch[1], "°C");
	}

	const fahrenheitMatch = bullet.match(/([−–—-]?\d+(?:[.,]\d+)?)\s*°\s*F\b/i);
	if (fahrenheitMatch) {
		return formatSignedUnitValue(fahrenheitMatch[1], "°F");
	}

	const approximateCelsiusMatch = bullet.match(
		/(?:cirka|ca\.?|approx(?:imately)?|about)\s*([−–—-]?\d+(?:[.,]\d+)?)\s*°?\s*C\b/i
	);
	if (approximateCelsiusMatch) {
		return formatSignedUnitValue(approximateCelsiusMatch[1], "°C");
	}

	return null;
}

function selectTemperatureFeature(bullets: string[]) {
	const candidates = bullets
		.map((bullet) => {
			const value = extractTemperatureFeature(bullet);
			if (!value) {
				return null;
			}

			const isRating =
				/\btemperaturklassning\b|\btemperature rating\b|\bcomfort temperature\b|\bcomfort rating\b|\blimit temperature\b|\brated to\b/i.test(
					bullet
				);
			const isOperating = /\boperating temperature\b|\bdrifttemperatur\b/i.test(bullet);
			const isRange = /\bto\b|–|—|-\s*\d/.test(value);

			const specificityScore = isRating ? 300 : isOperating ? 200 : 100;
			const rangeScore = isRange ? 25 : 0;

			return {
				value,
				score: specificityScore + rangeScore,
			};
		})
		.filter(Boolean) as { value: string; score: number }[];

	if (candidates.length === 0) {
		return null;
	}

	return candidates.sort((left, right) => right.score - left.score)[0]?.value ?? null;
}

function extractBatteryFeature(bullet: string) {
	const aaMatch = bullet.match(/\b(\d+)\s*x\s*AA\b/i) ?? bullet.match(/\b(\d+)\s*AA-batter/i);
	if (aaMatch) {
		return `${aaMatch[1]}x AA`;
	}

	if (/\baa-batter/i.test(bullet)) {
		const spelledCount = extractSpelledCount(bullet);
		if (spelledCount) {
			return `${spelledCount}x AA`;
		}

		return "AA";
	}

	const energyMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(Wh|mAh)\b/i);
	if (energyMatch) {
		return formatUnitValue(energyMatch[1], energyMatch[2]);
	}

	if (/\bli-?ion\b|\blitiumjon/i.test(bullet)) {
		return "Li-ion";
	}

	if (/\brechargeable battery\b|\buppladdningsbart batteri\b/i.test(bullet)) {
		return "Rechargeable";
	}

	return null;
}

function extractWaterproofFeature(bullet: string) {
	const ratingMatch = bullet.match(/\b(IPX?\d+)\b/i) ?? bullet.match(/\b(IP\d+)\b/i);
	if (ratingMatch) {
		return ratingMatch[1].toUpperCase();
	}

	if (/\bwaterproof\b|\bvattentät\b/i.test(bullet)) {
		return "Waterproof";
	}

	if (/\bwater resistant\b|\bvädertålig\b/i.test(bullet)) {
		return "Weatherproof";
	}

	return null;
}

function extractSolarFeature(bullet: string) {
	return /\bsolar\b|\bpower glass\b|\bsolcell/i.test(bullet) ? "Solar" : null;
}

function extractGpsFeature(bullet: string) {
	if (/\bmultiband\b.*\b(gps|gnss)\b|\b(gps|gnss)\b.*\bmultiband\b/i.test(bullet)) {
		return "Multi GPS";
	}

	if (/\bgnss\b/i.test(bullet)) {
		return "GNSS";
	}

	if (/\bgps\b/i.test(bullet)) {
		return "GPS";
	}

	return null;
}

function extractUsbCFeature(bullet: string) {
	return /\busb[\s-]?c\b/i.test(bullet) ? "USB-C" : null;
}

function extractZipperFeature(bullet: string) {
	if (/\bYKK\b/i.test(bullet) && /\b(zipper|zippers|dragkedja|dragkedjor)\b/i.test(bullet)) {
		return "YKK";
	}

	return null;
}

function extractChargingFeature(bullet: string) {
	if (!/\b(pd|power delivery|charging|charge)\b|\b\d+(?:[.,]\d+)?\s*W\b/i.test(bullet)) {
		return null;
	}

	const wattMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*W\b/i);
	if (wattMatch) {
		return formatUnitValue(wattMatch[1], "W");
	}

	return /\b(pd|power delivery)\b/i.test(bullet) ? "PD" : "Charging";
}

function extractCapacityFeature(bullet: string) {
	const literMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(L|l|liters?|liter)\b/i);
	if (literMatch) {
		return formatUnitValue(literMatch[1], "L");
	}

	const milliliterMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(ml)\b/i);
	if (milliliterMatch) {
		return formatUnitValue(milliliterMatch[1], "ml");
	}

	return null;
}

function extractLumensFeature(bullet: string) {
	const lumenMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(lm|lumens?)\b/i);
	return lumenMatch ? formatUnitValue(lumenMatch[1], "lm") : null;
}

function extractOpticsFeature(bullet: string) {
	const combinedMatch = bullet.match(
		/\b(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\b(?:\s*mm)?/i
	);
	if (combinedMatch && /\b(binoculars?|kikare|spotting scope|scope|förstoring|magnification|objective|objektiv)\b/i.test(bullet)) {
		return `${formatDecimalValue(combinedMatch[1])}x${formatDecimalValue(combinedMatch[2])}`;
	}

	return null;
}

function selectOpticsFeature(bullets: string[]) {
	for (const bullet of bullets) {
		const combinedValue = extractOpticsFeature(bullet);
		if (combinedValue) {
			return combinedValue;
		}
	}

	const magnificationBullet = bullets.find((bullet) =>
		/\b(\d+(?:[.,]\d+)?)\s*[x×]?\s*(?:förstoring|magnification)\b/i.test(bullet)
	);
	const objectiveBullet = bullets.find((bullet) =>
		/\b(\d+(?:[.,]\d+)?)\s*mm\b.*\b(objektiv|objective)\b/i.test(bullet) ||
		/\b(objektiv|objective)\b.*\b(\d+(?:[.,]\d+)?)\s*mm\b/i.test(bullet)
	);

	if (!magnificationBullet || !objectiveBullet) {
		return null;
	}

	const magnificationMatch = magnificationBullet.match(/\b(\d+(?:[.,]\d+)?)\s*[x×]?\s*(?:förstoring|magnification)\b/i);
	const objectiveMatch =
		objectiveBullet.match(/\b(\d+(?:[.,]\d+)?)\s*mm\b.*\b(objektiv|objective)\b/i) ??
		objectiveBullet.match(/\b(objektiv|objective)\b.*\b(\d+(?:[.,]\d+)?)\s*mm\b/i);

	const magnificationValue = magnificationMatch?.[1] ?? null;
	const objectiveValue = objectiveMatch?.[1] ?? objectiveMatch?.[2] ?? null;

	if (!magnificationValue || !objectiveValue) {
		return null;
	}

	return `${formatDecimalValue(magnificationValue)}x${formatDecimalValue(objectiveValue)}`;
}

function extractCompassFeature(bullet: string) {
	return /\bcompass\b|\bkompass\b/i.test(bullet) ? "Compass" : null;
}

function extractBoilTimeFeature(bullet: string) {
	if (!/\bboil\b|\bkok/i.test(bullet)) {
		return null;
	}

	const secondMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(sec|seconds?|s)\b/i);
	if (secondMatch) {
		return formatUnitValue(secondMatch[1], "sec");
	}

	const minuteMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(min|minutes?)\b/i);
	if (minuteMatch) {
		return formatUnitValue(minuteMatch[1], "min");
	}

	return null;
}

function extractWaypointFeature(bullet: string) {
	return /\bwaypoints?\b|\broutes?\b|\btracks?\b/i.test(bullet) ? "Waypoints" : null;
}

function extractWeightFeature(bullet: string) {
	const weightMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
	return weightMatch ? formatUnitValue(weightMatch[1], weightMatch[2].toLowerCase()) : null;
}

function extractCountryOfOriginFeature(bullet: string) {
	if (/\b(made in|tillverkad i)\s+sweden\b|\b(made in|tillverkad i)\s+sverige\b/i.test(bullet)) {
		return "Sweden";
	}

	return null;
}

function extractMadeInUsaFeature(bullet: string) {
	return /\b(made in|tillverkad i)\s+usa\b/i.test(bullet) ? "USA" : null;
}

function extractCaliberFeature(bullet: string) {
	const gaugeMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*gauge\b/i);
	if (gaugeMatch) {
		return `${formatDecimalValue(gaugeMatch[1])} gauge`;
	}

	const cartridgeMillimeterMatch = bullet.match(
		/\b(\d+(?:[.,]\d+)?)\s*[x×]\s*\d+(?:[.,]\d+)?\s*mm\b/i
	);
	if (cartridgeMillimeterMatch && /\b(caliber|kaliber)\b/i.test(bullet)) {
		return `${formatDecimalValue(cartridgeMillimeterMatch[1])} mm`;
	}

	const millimeterMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*mm\b/i);
	if (millimeterMatch && /\b(caliber|kaliber)\b/i.test(bullet)) {
		return `${formatDecimalValue(millimeterMatch[1])} mm`;
	}

	const caliberCodeMatch = bullet.match(/\b(5\.56|7\.62|9(?:[.,]0)?|.308|.223|30-06)\b/i);
	if (caliberCodeMatch && /\b(caliber|kaliber)\b/i.test(bullet)) {
		return caliberCodeMatch[1];
	}

	return null;
}

function extractCertificationFeature(bullet: string) {
	const ssfMatch = bullet.match(/\bSSF\s*[- ]?\s*(3492)\b/i);
	if (ssfMatch) {
		return `SSF ${ssfMatch[1]}`;
	}

	const enMatch = bullet.match(/\bEN\s*[- ]?\s*(1143-1)\b/i);
	if (enMatch) {
		return `EN ${enMatch[1]}`;
	}

	return null;
}

function extractVolumeFeature(bullet: string) {
	if (!/\b(volume|volym|internal volume)\b/i.test(bullet)) {
		return null;
	}

	const literMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(L|l|liters?|liter)\b/i);
	if (literMatch) {
		return formatUnitValue(literMatch[1], "L");
	}

	return null;
}

function extractStorageCapacityFeature(bullet: string) {
	const riflesMatch = bullet.match(/\b(?:up to\s+)?(\d+)\s+(rifles?|gevär)\b/i);
	if (riflesMatch) {
		const count = riflesMatch[1];
		const noun = /gevär/i.test(riflesMatch[2]) ? "gevär" : riflesMatch[2].toLocaleLowerCase("en");
		return `${count} ${noun}`;
	}

	const genericCountMatch =
		bullet.match(/\b(?:capacity|kapacitet)\b.*?\b(\d+)\s+(items?|units?)\b/i) ??
		bullet.match(/\b(?:up to\s+)?(\d+)\s+(items?|units?)\b/i);
	if (genericCountMatch) {
		return `${genericCountMatch[1]} ${genericCountMatch[2].toLocaleLowerCase("en")}`;
	}

	return null;
}

function extractFuelFeature(bullet: string) {
	const fuelMatch =
		bullet.match(/\b(isobutane|butane|propane|gasoline|petrol|diesel|alcohol)\b/i) ??
		bullet.match(/\b(liquid fuel)\b/i);
	return fuelMatch ? toTitleCase(fuelMatch[1]) : null;
}

function extractAwdFeature(bullet: string) {
	return /\bawd\b|\b4wd\b|\ball[- ]wheel drive\b/i.test(bullet) ? "AWD" : null;
}

function extractEngineFeature(bullet: string) {
	const horsepowerMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*(hp)\b/i);
	if (horsepowerMatch) {
		return formatUnitValue(horsepowerMatch[1], "hp");
	}

	const displacementMatch = bullet.match(/\b(\d+(?:[.,]\d+)?)\s*L\b/i);
	if (displacementMatch && /\bengine\b|\bmotor\b/i.test(bullet)) {
		return formatUnitValue(displacementMatch[1], "L");
	}

	return null;
}

const productFeatureDefinitions: ProductFeatureDefinition[] = [
	{
		id: "runtime",
		label: "Runtime",
		iconName: "clock-3",
		priority: 100,
		extractValue: extractRuntimeFeature,
	},
	{
		id: "temperature",
		label: "Temperature",
		iconName: "thermometer",
		priority: 72,
		extractValue: extractTemperatureFeature,
		selectValue: selectTemperatureFeature,
	},
	{
		id: "waterproof",
		label: "Water resistance",
		iconName: "droplets",
		priority: 95,
		extractValue: extractWaterproofFeature,
	},
	{
		id: "solar",
		label: "Solar",
		iconName: "sun-medium",
		priority: 92,
		extractValue: extractSolarFeature,
	},
	{
		id: "battery",
		label: "Battery",
		iconName: "battery",
		priority: 90,
		extractValue: extractBatteryFeature,
	},
	{
		id: "gps",
		label: "GPS",
		iconName: "map",
		priority: 90,
		extractValue: extractGpsFeature,
	},
	{
		id: "usb-c",
		label: "USB-C",
		iconName: "plug",
		priority: 88,
		extractValue: extractUsbCFeature,
	},
	{
		id: "zipper",
		label: "Zipper",
		iconName: "zipper",
		priority: 86,
		extractValue: extractZipperFeature,
	},
	{
		id: "charging",
		label: "Charging",
		iconName: "zap",
		priority: 84,
		extractValue: extractChargingFeature,
	},
	{
		id: "capacity",
		label: "Capacity",
		iconName: "package",
		priority: 83,
		extractValue: extractCapacityFeature,
	},
	{
		id: "lumens",
		label: "Lumens",
		iconName: "lightbulb",
		priority: 82,
		extractValue: extractLumensFeature,
	},
	{
		id: "optics",
		label: "Optics",
		iconName: "binoculars",
		priority: 81,
		extractValue: extractOpticsFeature,
		selectValue: selectOpticsFeature,
	},
	{
		id: "compass",
		label: "Compass",
		iconName: "compass",
		priority: 80,
		extractValue: extractCompassFeature,
	},
	{
		id: "boil-time",
		label: "Boil time",
		iconName: "flame",
		priority: 78,
		extractValue: extractBoilTimeFeature,
	},
	{
		id: "waypoints",
		label: "Waypoints",
		iconName: "flag",
		priority: 75,
		extractValue: extractWaypointFeature,
	},
	{
		id: "weight",
		label: "Weight",
		iconName: "dumbbell",
		priority: 74,
		extractValue: extractWeightFeature,
	},
	{
		id: "made-in-usa",
		label: "Origin",
		iconName: "usa-flag",
		priority: 73,
		extractValue: extractMadeInUsaFeature,
	},
	{
		id: "origin",
		label: "Origin",
		iconName: "flag",
		priority: 72,
		extractValue: extractCountryOfOriginFeature,
	},
	{
		id: "caliber",
		label: "Caliber",
		iconName: "crosshair",
		priority: 89,
		extractValue: extractCaliberFeature,
	},
	{
		id: "certification",
		label: "Certification",
		iconName: "badge-check",
		priority: 87,
		extractValue: extractCertificationFeature,
	},
	{
		id: "volume",
		label: "Volume",
		iconName: "package",
		priority: 76,
		extractValue: extractVolumeFeature,
	},
	{
		id: "storage-capacity",
		label: "Capacity",
		iconName: "package",
		priority: 77,
		extractValue: extractStorageCapacityFeature,
	},
	{
		id: "fuel",
		label: "Fuel",
		iconName: "fuel",
		priority: 72,
		extractValue: extractFuelFeature,
	},
	{
		id: "awd",
		label: "Drivetrain",
		iconName: "car-front",
		priority: 70,
		extractValue: extractAwdFeature,
	},
	{
		id: "engine",
		label: "Engine",
		iconName: "gauge",
		priority: 68,
		extractValue: extractEngineFeature,
	},
];

export function extractProductFeatures(note: LibraryItem, featureSections: string[], max = 4) {
	const bullets = extractFeatureBullets(note, featureSections);
	if (bullets.length === 0) {
		return [];
	}

	const extractedFeatures = productFeatureDefinitions
		.map((definition) => {
			const value =
				definition.selectValue?.(bullets) ??
				(() => {
					const matchingBullet = bullets.find((bullet) => definition.extractValue(bullet));
					return matchingBullet ? definition.extractValue(matchingBullet) : null;
				})();

			if (!value) {
				return null;
			}

			return {
				id: definition.id,
				label: definition.label,
				value,
				iconName: definition.iconName,
				priority: definition.priority,
			};
		})
		.filter(Boolean)
		.sort((left, right) => right!.priority - left!.priority) as ExtractedProductFeature[];

	const seenValues = new Set<string>();
	const deduplicatedFeatures: ExtractedProductFeature[] = [];

	for (const feature of extractedFeatures) {
		const normalizedValue = feature.value.trim().toLocaleLowerCase("sv");
		if (seenValues.has(normalizedValue)) {
			continue;
		}

		seenValues.add(normalizedValue);
		deduplicatedFeatures.push(feature);

		if (deduplicatedFeatures.length >= max) {
			break;
		}
	}

	return deduplicatedFeatures;
}

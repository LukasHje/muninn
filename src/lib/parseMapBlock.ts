export interface ParsedMapMarker {
	type: string;
	lat: number;
	long: number;
	label: string;
}

export interface ParsedMapBlock {
	id: string;
	height: string;
	lat: number;
	long: number;
	defaultZoom: number;
	markers: ParsedMapMarker[];
}

export interface ExtractedMapBlock {
	map: ParsedMapBlock | null;
	contentWithoutMap: string;
}

function parseCoordinate(value: string) {
	const parsed = Number.parseFloat(value.trim());
	return Number.isFinite(parsed) ? parsed : null;
}

function unwrapWikiLabel(value: string) {
	const trimmed = value.trim();
	const wikiMatch = trimmed.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
	if (!wikiMatch) {
		return trimmed;
	}

	return (wikiMatch[2] || wikiMatch[1]).trim();
}

function parseMarkerLine(value: string): ParsedMapMarker | null {
	const parts = value.split(",");
	if (parts.length < 4) {
		return null;
	}

	const type = parts[0]?.trim() || "marker";
	const lat = parseCoordinate(parts[1] ?? "");
	const long = parseCoordinate(parts[2] ?? "");
	const label = unwrapWikiLabel(parts.slice(3).join(","));

	if (lat == null || long == null) {
		return null;
	}

	return {
		type,
		lat,
		long,
		label,
	};
}

export function parseMapBlock(raw: string): ParsedMapBlock | null {
	const lines = raw
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	let id = "map";
	let height = "400px";
	let lat: number | null = null;
	let long: number | null = null;
	let defaultZoom = 10;
	const markers: ParsedMapMarker[] = [];

	for (const line of lines) {
		const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
		if (!match) {
			continue;
		}

		const [, rawKey, rawValue] = match;
		const key = rawKey.toLowerCase();
		const value = rawValue.trim();

		if (key === "id") {
			id = value || "map";
			continue;
		}

		if (key === "height") {
			height = value || "400px";
			continue;
		}

		if (key === "lat") {
			lat = parseCoordinate(value);
			continue;
		}

		if (key === "long" || key === "lon" || key === "lng") {
			long = parseCoordinate(value);
			continue;
		}

		if (key === "defaultzoom") {
			const parsedZoom = Number.parseInt(value, 10);
			if (Number.isFinite(parsedZoom)) {
				defaultZoom = parsedZoom;
			}
			continue;
		}

		if (key === "marker") {
			const marker = parseMarkerLine(value);
			if (marker) {
				markers.push(marker);
			}
		}
	}

	if (lat == null || long == null) {
		return null;
	}

	return {
		id,
		height,
		lat,
		long,
		defaultZoom,
		markers,
	};
}

function stripMatchedBlock(content: string, matchedBlock: string) {
	return content.replace(matchedBlock, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractMapBlock(content: string): ExtractedMapBlock {
	const fencedMatch = content.match(/```(?:leaflet|map)\s*\n([\s\S]*?)```/i);
	if (fencedMatch) {
		const parsed = parseMapBlock(fencedMatch[1]);
		if (parsed) {
			return {
				map: parsed,
				contentWithoutMap: stripMatchedBlock(content, fencedMatch[0]),
			};
		}
	}

	const lines = content.split("\n");

	for (let start = 0; start < lines.length; start += 1) {
		if (!/^id:\s*\S+/i.test(lines[start].trim())) {
			continue;
		}

		let end = start;
		while (end < lines.length) {
			const current = lines[end].trim();
			if (!current) {
				break;
			}
			if (end > start && (/^#{1,6}\s/.test(current) || /^```/.test(current))) {
				break;
			}
			end += 1;
		}

		const candidate = lines.slice(start, end).join("\n");
		const parsed = parseMapBlock(candidate);
		if (parsed && /^marker:/im.test(candidate)) {
			const contentWithoutMap = [...lines.slice(0, start), ...lines.slice(end)].join("\n");
			return {
				map: parsed,
				contentWithoutMap: contentWithoutMap.replace(/\n{3,}/g, "\n\n").trim(),
			};
		}
	}

	return {
		map: null,
		contentWithoutMap: content,
	};
}

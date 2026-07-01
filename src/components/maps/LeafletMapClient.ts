export default async function initLeafletMaps() {
	if (typeof window === "undefined") {
		return;
	}

	const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-leaflet-map]")).filter(
		(element) => element.dataset.leafletInitialized !== "true"
	);

	if (elements.length === 0) {
		return;
	}

	const L = await import("leaflet");

	for (const element of elements) {
		const lat = Number.parseFloat(element.dataset.lat ?? "");
		const long = Number.parseFloat(element.dataset.long ?? "");
		const zoom = Number.parseInt(element.dataset.zoom ?? "10", 10);
		const markers = JSON.parse(element.dataset.markers ?? "[]") as Array<{
			type: string;
			lat: number;
			long: number;
			label: string;
		}>;

		if (!Number.isFinite(lat) || !Number.isFinite(long)) {
			continue;
		}

		const map = L.map(element, {
			scrollWheelZoom: false,
		}).setView([lat, long], Number.isFinite(zoom) ? zoom : 10);
		map.attributionControl.setPrefix(false);

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "&copy; OpenStreetMap contributors",
		}).addTo(map);

		for (const marker of markers) {
			const leafletMarker = L.marker([marker.lat, marker.long]).addTo(map);
			if (marker.label) {
				leafletMarker.bindPopup(marker.label);
			}
		}

		window.setTimeout(() => {
			map.invalidateSize();
		}, 0);

		element.dataset.leafletInitialized = "true";
	}
}

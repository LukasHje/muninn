function normalizeCategory(value: string) {
	return value
		.trim()
		.toLocaleLowerCase("en")
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ");
}

function titleCase(value: string) {
	return value
		.split(" ")
		.filter(Boolean)
		.map((part) => part.charAt(0).toLocaleUpperCase("en") + part.slice(1))
		.join(" ");
}

export function getVehicleCategory(value: string) {
	const normalized = normalizeCategory(value);

	if (
		normalized.includes("motorcycle")
		|| normalized.includes("motorbike")
		|| normalized.includes("scooter")
		|| normalized === "cruiser"
	) {
		return "Motorcycle";
	}

	if (normalized.includes("moped")) {
		return "Moped";
	}

	if (
		normalized.includes("bicycle")
		|| normalized === "bike"
		|| normalized === "cycle"
		|| normalized.includes("tricycle")
	) {
		return "Bicycle";
	}

	if (normalized.includes("semi truck") || normalized.includes("semitruck")) {
		return "Semi Truck";
	}

	if (
		normalized.includes("terrain vehicle")
		|| normalized.includes("off road")
		|| normalized.includes("offroad")
		|| normalized.includes("jeep")
	) {
		return "Terrain Vehicle";
	}

	if (
		normalized.includes("station wagon")
		|| normalized.includes("estate")
		|| normalized.includes("touring")
		|| normalized.includes("wagon")
	) {
		return "Station Wagon";
	}

	if (
		normalized === "suv"
		|| normalized.includes("sport utility")
		|| normalized.includes("crossover")
	) {
		return "SUV";
	}

	if (normalized.includes("pickup")) {
		return "Pickup";
	}

	if (normalized.includes("van") || normalized.includes("minibus") || normalized.includes("camper")) {
		return "Van";
	}

	if (normalized.includes("tractor") || normalized.includes("utility")) {
		return "Utility";
	}

	if (normalized.includes("truck") || normalized.includes("lorry")) {
		return "Truck";
	}

	if (normalized.includes("hatchback")) {
		return "Hatchback";
	}

	if (normalized.includes("sedan") || normalized.includes("saloon")) {
		return "Sedan";
	}

	if (normalized.includes("coupe") || normalized.includes("coupé")) {
		return "Coupe";
	}

	if (
		normalized.includes("convertible")
		|| normalized.includes("cabriolet")
		|| normalized.includes("roadster")
	) {
		return "Convertible";
	}

	return titleCase(normalized) || "Other";
}

export function getVehicleCategoryIcon(value: string) {
	const category = getVehicleCategory(value);

	if (category === "Bicycle") {
		return "bike";
	}

	if (category === "Moped" || category === "Motorcycle") {
		return "motorbike";
	}

	if (category === "Utility") {
		return "tractor";
	}

	if (["Pickup", "Semi Truck", "Truck", "Van"].includes(category)) {
		return "van";
	}

	return "car";
}

import type { DomainKey } from "src/lib/vault";

const redundantTypesByDomain: Record<DomainKey, ReadonlySet<string>> = {
	gear: new Set(["gear"]),
	projekt: new Set(["project", "projects", "projekt"]),
	recept: new Set(["recipe", "recipes", "recept"]),
	bocker: new Set(["book", "books", "bok", "bocker", "literature"]),
	resor: new Set(["travel", "resor"]),
	teknik: new Set(["technology", "teknik", "tech"]),
	journal: new Set(["journal"]),
	traning: new Set(["training", "traning"]),
	ovrigt: new Set(["other", "ovrigt"]),
};

function normalizeClassifier(value: string) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLocaleLowerCase("sv")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}

export function getNoteTypeKickerLabel(
	type: string | undefined,
	domainKey: DomainKey,
	domainLabel: string
) {
	if (!type) return null;

	const normalizedType = normalizeClassifier(type);
	if (!normalizedType || normalizedType === "note") return null;
	if (redundantTypesByDomain[domainKey].has(normalizedType)) return null;

	const label = type.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
	if (normalizeClassifier(label) === normalizeClassifier(domainLabel)) return null;

	return label;
}

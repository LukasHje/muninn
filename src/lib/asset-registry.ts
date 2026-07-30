export interface AssetRegistryDefinition<TId extends string = string> {
	id: TId;
	label: string;
	icon: string;
	aliases: readonly string[];
}

export function normalizeRegistryKey(value: string) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("en")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function createAssetRegistryResolver<TDefinition extends AssetRegistryDefinition>(definitions: readonly TDefinition[]) {
	const aliases = new Map<string, TDefinition>();
	for (const definition of definitions) {
		for (const alias of [definition.id, definition.label, ...definition.aliases]) {
			const normalized = normalizeRegistryKey(alias);
			if (normalized) aliases.set(normalized, definition);
		}
	}

	return (value: string | null | undefined) => {
		const normalized = normalizeRegistryKey(value ?? "");
		if (!normalized) return null;
		const exact = aliases.get(normalized);
		if (exact) return exact;
		const candidates = [...aliases.entries()]
			.filter(([alias]) => normalized === alias || normalized.startsWith(`${alias}-`))
			.sort(([left], [right]) => right.length - left.length);
		return candidates[0]?.[1] ?? null;
	};
}

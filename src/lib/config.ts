import path from "node:path";

type EnvironmentSource = Record<string, string | undefined>;

function normalizeEnvValue(value: string | undefined) {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readEnvironmentValue(
	key: string,
	runtimeEnv: EnvironmentSource,
	buildEnv?: EnvironmentSource
) {
	return normalizeEnvValue(runtimeEnv[key]) ?? normalizeEnvValue(buildEnv?.[key]);
}

function readEnv(key: string) {
	const astroEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
	return readEnvironmentValue(key, process.env, astroEnv);
}

export const VAULT_PATH = readEnv("VAULT_PATH") ?? "./data/example-vault";
export const RESOLVED_VAULT_PATH = path.resolve(process.cwd(), VAULT_PATH);

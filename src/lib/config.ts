import path from "node:path";

function readEnv(key: string) {
	const astroEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
	const value = astroEnv?.[key] ?? process.env[key];
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const VAULT_PATH = readEnv("VAULT_PATH") ?? "./data/example-vault";
export const RESOLVED_VAULT_PATH = path.resolve(process.cwd(), VAULT_PATH);

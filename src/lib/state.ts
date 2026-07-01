import { mkdir } from "node:fs/promises";
import path from "node:path";

export const APP_STATE_DIR =
	process.env.NODE_ENV === "production"
		? "/state"
		: path.join(process.cwd(), "data", "local-state");

export const SCRATCHPAD_STATE_DIR = path.join(APP_STATE_DIR, "scratchpad");

export async function ensureAppStateDir() {
	await mkdir(APP_STATE_DIR, { recursive: true });
}

export async function ensureScratchpadStateDir() {
	await mkdir(SCRATCHPAD_STATE_DIR, { recursive: true });
}

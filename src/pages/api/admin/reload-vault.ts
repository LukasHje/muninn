import type { APIRoute } from "astro";
import { invalidateVaultCaches } from "src/lib/vaultCache";

export const prerender = false;

export const POST: APIRoute = async () => {
	invalidateVaultCaches();

	return new Response(JSON.stringify({ success: true }), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
};

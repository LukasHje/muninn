import type { APIRoute } from "astro";
import { buildNoteSearchDocuments } from "lib/noteSearch";
import { getLibraryItems } from "lib/vault";

export const GET: APIRoute = async () => {
	const items = await getLibraryItems();
	const documents = buildNoteSearchDocuments(items);

	return new Response(JSON.stringify({ documents }), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
};

import type { APIRoute } from "astro";
import { getBookCover } from "src/lib/bookCoverCache";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
	const cover = await getBookCover(params.isbn ?? "");
	if (!cover) return new Response("Book cover not found", { status: 404 });

	const etag = `W/\"${cover.bytes.byteLength.toString(16)}-${Math.floor(cover.modifiedAt.getTime()).toString(16)}\"`;
	if (request.headers.get("if-none-match") === etag) {
		return new Response(null, {
			status: 304,
			headers: { ETag: etag, "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
		});
	}

	return new Response(Uint8Array.from(cover.bytes).buffer, {
		headers: {
			"Content-Type": cover.contentType,
			"Content-Length": String(cover.bytes.byteLength),
			ETag: etag,
			"Last-Modified": cover.modifiedAt.toUTCString(),
			"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
		},
	});
};

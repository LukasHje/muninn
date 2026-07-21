import type { APIRoute } from "astro";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ui } from "src/i18n";
import { RESOLVED_VAULT_PATH } from "src/lib/config";

export const prerender = false;

const contentTypes: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".gif": "image/gif",
	".pdf": "application/pdf",
};

export const GET: APIRoute = async ({ params, request }) => {
	const segments = params.path?.split("/") ?? [];
	const decodedPath = segments.map((segment) => decodeURIComponent(segment)).join("/");
	const fullPath = path.resolve(RESOLVED_VAULT_PATH, decodedPath);

	if (!fullPath.startsWith(RESOLVED_VAULT_PATH)) {
		return new Response(ui.errors.forbidden, { status: 403 });
	}

	try {
		const fileStats = await stat(fullPath);
		const extension = path.extname(fullPath).toLowerCase();
		const etag = `W/"${fileStats.size.toString(16)}-${Math.floor(fileStats.mtimeMs).toString(16)}"`;
		const lastModified = new Date(fileStats.mtimeMs).toUTCString();
		const ifNoneMatch = request.headers.get("if-none-match");
		const ifModifiedSince = request.headers.get("if-modified-since");

		if (ifNoneMatch === etag) {
			return new Response(null, {
				status: 304,
				headers: {
					ETag: etag,
					"Last-Modified": lastModified,
					"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
				},
			});
		}

		if (ifModifiedSince) {
			const modifiedSince = new Date(ifModifiedSince).getTime();
			if (!Number.isNaN(modifiedSince) && modifiedSince >= fileStats.mtimeMs) {
				return new Response(null, {
					status: 304,
					headers: {
						ETag: etag,
						"Last-Modified": lastModified,
						"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
					},
				});
			}
		}

		const bytes = await readFile(fullPath);
		return new Response(bytes, {
			headers: {
				"Content-Type": contentTypes[extension] ?? "application/octet-stream",
				...(extension === ".pdf" ? { "Content-Disposition": "inline" } : {}),
				ETag: etag,
				"Last-Modified": lastModified,
				"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
			},
		});
	} catch {
		return new Response(ui.errors.notFound, { status: 404 });
	}
};

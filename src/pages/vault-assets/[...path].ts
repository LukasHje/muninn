import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ui } from "i18n";
import { RESOLVED_VAULT_PATH } from "lib/config";

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

export const GET: APIRoute = async ({ params }) => {
	const segments = params.path?.split("/") ?? [];
	const decodedPath = segments.map((segment) => decodeURIComponent(segment)).join("/");
	const fullPath = path.resolve(RESOLVED_VAULT_PATH, decodedPath);

	if (!fullPath.startsWith(RESOLVED_VAULT_PATH)) {
		return new Response(ui.errors.forbidden, { status: 403 });
	}

	try {
		const bytes = await readFile(fullPath);
		const extension = path.extname(fullPath).toLowerCase();
		return new Response(bytes, {
			headers: {
				"Content-Type": contentTypes[extension] ?? "application/octet-stream",
				...(extension === ".pdf" ? { "Content-Disposition": "inline" } : {}),
				"Cache-Control": "public, max-age=3600",
			},
		});
	} catch {
		return new Response(ui.errors.notFound, { status: 404 });
	}
};

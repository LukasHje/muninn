import type { APIRoute } from "astro";
import { toggleFavoriteNote } from "src/lib/favorites";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
	const formData = await request.formData();
	const noteId = String(formData.get("noteId") ?? "");
	const redirectTo = String(formData.get("redirectTo") ?? "/favorites");
	const returnsJson = request.headers.get("X-Requested-With") === "MuninnFavoriteToggle";
	const json = (body: object, status = 200) =>
		new Response(JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json; charset=utf-8" },
		});

	if (!noteId.trim()) {
		if (returnsJson) {
			return json({ error: "Missing note id" }, 400);
		}

		return redirect(redirectTo);
	}

	try {
		const result = await toggleFavoriteNote(noteId);
		if (returnsJson) {
			return json({ noteId, ...result });
		}
	} catch {
		if (returnsJson) {
			return json({ error: "Could not update favorite" }, 500);
		}

		return redirect(redirectTo);
	}

	return redirect(redirectTo);
};

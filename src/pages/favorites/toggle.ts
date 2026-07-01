import type { APIRoute } from "astro";
import { toggleFavoriteNote } from "../../lib/favorites";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
	const formData = await request.formData();
	const noteId = String(formData.get("noteId") ?? "");
	const redirectTo = String(formData.get("redirectTo") ?? "/favorites");

	if (!noteId.trim()) {
		return redirect(redirectTo);
	}

	try {
		await toggleFavoriteNote(noteId);
	} catch {
		return redirect(redirectTo);
	}

	return redirect(redirectTo);
};

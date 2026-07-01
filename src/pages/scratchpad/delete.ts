import type { APIRoute } from "astro";
import { deleteScratchpadNote } from "../../lib/scratchpad";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
	const formData = await request.formData();
	const id = String(formData.get("id") ?? "");
	const redirectTo = String(formData.get("redirectTo") ?? "/scratchpad");

	if (id) {
		try {
			await deleteScratchpadNote(id);
		} catch {
			return redirect(redirectTo);
		}
	}

	return redirect(redirectTo);
};

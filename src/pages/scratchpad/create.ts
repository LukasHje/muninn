import type { APIRoute } from "astro";
import { createScratchpadNote } from "../../lib/scratchpad";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
	const formData = await request.formData();
	const content = String(formData.get("content") ?? "");
	const redirectTo = String(formData.get("redirectTo") ?? "/scratchpad");

	try {
		await createScratchpadNote(content);
	} catch {
		return redirect(redirectTo);
	}

	return redirect(redirectTo);
};

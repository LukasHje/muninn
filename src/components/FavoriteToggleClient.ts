let favoriteToggleListenerBound = false;

function setFavoriteState(noteId: string, isFavorite: boolean) {
	document.querySelectorAll(`[data-favorite-toggle][data-favorite-note-id="${CSS.escape(noteId)}"]`).forEach((form) => {
		if (!(form instanceof HTMLFormElement)) return;
		form.dataset.favoriteState = isFavorite ? "true" : "false";
		const button = form.querySelector("button[type='submit']");
		if (!(button instanceof HTMLButtonElement)) return;
		const label = isFavorite
			? form.dataset.favoriteRemoveLabel ?? "Remove favorite"
			: form.dataset.favoriteAddLabel ?? "Mark as favorite";
		button.setAttribute("aria-label", label);
		button.setAttribute("aria-pressed", isFavorite ? "true" : "false");
		button.title = label;
		button.querySelectorAll("[data-motion-icon] svg").forEach((icon) => {
			icon.setAttribute("fill", isFavorite ? "currentColor" : "none");
		});
	});
}

export default function initFavoriteToggleClient() {
	if (favoriteToggleListenerBound) return;
	favoriteToggleListenerBound = true;

	document.addEventListener("submit", async (event) => {
		const form = event.target;
		if (!(form instanceof HTMLFormElement) || !form.matches("[data-favorite-toggle]")) return;
		if (form.closest("[data-experience-root]")) return;

		event.preventDefault();
		const noteId = form.dataset.favoriteNoteId ?? "";
		if (!noteId || form.dataset.favoritePending === "true") return;

		form.dataset.favoritePending = "true";
		const button = form.querySelector("button[type='submit']");
		if (button instanceof HTMLButtonElement) {
			button.disabled = true;
			button.setAttribute("aria-busy", "true");
		}

		try {
			const response = await fetch(form.action, {
				method: "POST",
				body: new FormData(form),
				headers: { Accept: "application/json", "X-Requested-With": "MuninnFavoriteToggle" },
			});
			const payload = await response.json();
			if (!response.ok || payload.noteId !== noteId || typeof payload.isFavorite !== "boolean") {
				throw new Error(`Failed to update favorite (${response.status})`);
			}

			setFavoriteState(noteId, payload.isFavorite);
			if (payload.isFavorite && button instanceof HTMLButtonElement) {
				button.dispatchEvent(new CustomEvent("muninn:motion-positive", { bubbles: true }));
			}
			window.dispatchEvent(new CustomEvent("muninn:favorite-change", { detail: payload }));
		} catch (error) {
			console.error(error);
		} finally {
			delete form.dataset.favoritePending;
			if (button instanceof HTMLButtonElement) {
				button.disabled = false;
				button.removeAttribute("aria-busy");
			}
		}
	});
}

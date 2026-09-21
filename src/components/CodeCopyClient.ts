let codeCopyListenerBound = false;

function copyWithTextarea(value: string) {
	const textarea = document.createElement("textarea");
	textarea.value = value;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	textarea.style.pointerEvents = "none";
	document.body.append(textarea);
	textarea.select();
	const execCommand = Reflect.get(document, "execCommand");
	const copied = typeof execCommand === "function" && Boolean(execCommand.call(document, "copy"));
	textarea.remove();
	if (!copied) throw new Error("Clipboard fallback failed");
}

async function copyText(value: string) {
	if (navigator.clipboard && window.isSecureContext) {
		await navigator.clipboard.writeText(value);
		return;
	}

	copyWithTextarea(value);
}

function resetCopyState(button: HTMLButtonElement) {
	delete button.dataset.copyState;
	const label = button.dataset.copyLabel ?? "Copy";
	button.setAttribute("aria-label", label);
	button.title = label;
}

export default function initCodeCopyClient() {
	if (codeCopyListenerBound) return;
	codeCopyListenerBound = true;

	document.addEventListener("click", async (event) => {
		const source = event.target;
		if (!(source instanceof Element)) return;
		const button = source.closest<HTMLButtonElement>("[data-copy-code]");
		if (!button || button.dataset.copyPending === "true") return;

		button.dataset.copyPending = "true";
		const value = button.dataset.copyValue ?? "";
		try {
			await copyText(value);
			button.dataset.copyState = "copied";
			const copiedLabel = button.dataset.copiedLabel ?? "Copied";
			button.setAttribute("aria-label", copiedLabel);
			button.title = copiedLabel;
			button.dispatchEvent(new CustomEvent("muninn:motion-positive", { bubbles: true }));
		} catch (error) {
			console.error(error);
			button.dataset.copyState = "failed";
			const failedLabel = button.dataset.copyFailedLabel ?? "Copy failed";
			button.setAttribute("aria-label", failedLabel);
			button.title = failedLabel;
		} finally {
			delete button.dataset.copyPending;
			window.setTimeout(() => resetCopyState(button), 1200);
		}
	});
}

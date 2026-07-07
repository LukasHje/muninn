import { ui } from "../../i18n";

export default async function initMermaidDiagrams() {
	const diagrams = Array.from(document.querySelectorAll<HTMLElement>("[data-mermaid-diagram]")).filter(
		(diagram) => !diagram.dataset.mermaidInitialized
	);

	if (diagrams.length === 0) {
		return;
	}

	const mermaid = await import("mermaid");
	mermaid.default.initialize({
		startOnLoad: false,
		securityLevel: "loose",
		theme: "neutral",
	});

	for (const [index, diagram] of diagrams.entries()) {
		diagram.dataset.mermaidInitialized = "true";
		const code = diagram.dataset.mermaidCode ?? "";
		try {
			const renderId = `muninn-mermaid-${index}-${Math.random().toString(36).slice(2, 8)}`;
			const { svg } = await mermaid.default.render(renderId, code);
			diagram.innerHTML = svg;
		} catch {
			diagram.innerHTML = `
				<div class="mermaid-diagram__error">
					<div>
						<p class="text-sm font-semibold text-slate-700">${ui.mermaid.invalidTitle}</p>
						<p class="mt-2 text-sm leading-6 text-slate-500">${ui.mermaid.invalidDescription}</p>
					</div>
				</div>
			`;
		}
	}
}

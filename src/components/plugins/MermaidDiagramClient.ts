import { ui } from "i18n";

const LIGHTBOX_ID = "muninn-mermaid-lightbox";
const ZOOM_STEP = 1.2;
const MAX_ZOOM_MULTIPLIER = 4;

type ViewerState = {
	baseHeight: number;
	baseWidth: number;
	content: HTMLElement;
	dialog: HTMLDialogElement;
	scale: number;
	svg: SVGSVGElement;
	viewport: HTMLElement;
	zoomInButton: HTMLButtonElement;
	zoomOutButton: HTMLButtonElement;
};

let viewerState: ViewerState | null = null;

function lockPageScroll() {
	const current = Number.parseInt(document.body.dataset.muninnLightboxLocks ?? "0", 10) || 0;
	const next = current + 1;
	document.body.dataset.muninnLightboxLocks = String(next);
	if (next === 1) {
		document.documentElement.style.overflow = "hidden";
		document.body.style.overflow = "hidden";
	}
}

function unlockPageScroll() {
	const current = Number.parseInt(document.body.dataset.muninnLightboxLocks ?? "0", 10) || 0;
	const next = Math.max(0, current - 1);
	if (next === 0) {
		delete document.body.dataset.muninnLightboxLocks;
		document.documentElement.style.overflow = "";
		document.body.style.overflow = "";
		return;
	}
	document.body.dataset.muninnLightboxLocks = String(next);
}

function getIconMarkup(kind: "close" | "zoom-in" | "zoom-out") {
	if (kind === "close") {
		return `
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M18 6 6 18"></path>
				<path d="m6 6 12 12"></path>
			</svg>
		`;
	}

	return `
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="11" cy="11" r="6"></circle>
			<path d="m20 20-4.2-4.2"></path>
			${kind === "zoom-in" ? '<path d="M8.5 11h5"></path>' : ""}
			${kind === "zoom-in" ? '<path d="M11 8.5v5"></path>' : ""}
			<path d="M8.5 11h5"></path>
		</svg>
	`;
}

function ensureLightbox() {
	let dialog = document.getElementById(LIGHTBOX_ID) as HTMLDialogElement | null;
	if (dialog) {
		return dialog;
	}

	dialog = document.createElement("dialog");
	dialog.id = LIGHTBOX_ID;
	dialog.className = "muninn-mermaid-lightbox";
	dialog.innerHTML = `
		<div class="muninn-mermaid-lightbox__surface">
			<div class="muninn-mermaid-lightbox__controls">
				<button
					type="button"
					class="muninn-mermaid-lightbox__icon-button"
					data-mermaid-zoom-out
					aria-label="${ui.mermaid.zoomOut}"
					title="${ui.mermaid.zoomOut}"
				>
					${getIconMarkup("zoom-out")}
				</button>
				<button
					type="button"
					class="muninn-mermaid-lightbox__icon-button"
					data-mermaid-zoom-in
					aria-label="${ui.mermaid.zoomIn}"
					title="${ui.mermaid.zoomIn}"
				>
					${getIconMarkup("zoom-in")}
				</button>
				<button
					type="button"
					class="muninn-mermaid-lightbox__icon-button"
					data-mermaid-close
					aria-label="${ui.mermaid.close}"
					title="${ui.mermaid.close}"
				>
					${getIconMarkup("close")}
				</button>
			</div>
			<div class="muninn-mermaid-lightbox__viewport">
				<div class="muninn-mermaid-lightbox__stage">
					<div class="muninn-mermaid-lightbox__content"></div>
				</div>
			</div>
		</div>
	`;

	dialog.querySelector<HTMLButtonElement>("[data-mermaid-close]")?.addEventListener("click", () => dialog?.close());
	dialog.querySelector<HTMLButtonElement>("[data-mermaid-zoom-in]")?.addEventListener("click", () => zoomBy(ZOOM_STEP));
	dialog.querySelector<HTMLButtonElement>("[data-mermaid-zoom-out]")?.addEventListener("click", () => zoomBy(1 / ZOOM_STEP));

	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	});

	dialog.addEventListener("close", () => {
		viewerState = null;
		unlockPageScroll();
	});

	document.addEventListener("keydown", (event) => {
		if (!dialog?.open) {
			return;
		}

		if (event.key === "Escape") {
			dialog.close();
			return;
		}

		if ((event.key === "+" || event.key === "=") && !event.metaKey && !event.ctrlKey) {
			event.preventDefault();
			zoomBy(ZOOM_STEP);
			return;
		}

		if ((event.key === "-" || event.key === "_") && !event.metaKey && !event.ctrlKey) {
			event.preventDefault();
			zoomBy(1 / ZOOM_STEP);
		}
	});

	window.addEventListener("resize", () => {
		if (dialog?.open) {
			resetToFitScale();
		}
	});

	document.body.append(dialog);
	return dialog;
}

function getSvgDimensions(svg: SVGSVGElement) {
	const viewBox = svg.viewBox.baseVal;
	if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
		return { width: viewBox.width, height: viewBox.height };
	}

	const parsedWidth = Number.parseFloat(svg.getAttribute("width") ?? "");
	const parsedHeight = Number.parseFloat(svg.getAttribute("height") ?? "");
	if (Number.isFinite(parsedWidth) && parsedWidth > 0 && Number.isFinite(parsedHeight) && parsedHeight > 0) {
		return { width: parsedWidth, height: parsedHeight };
	}

	const rect = svg.getBoundingClientRect();
	return {
		width: Math.max(rect.width, 1),
		height: Math.max(rect.height, 1),
	};
}

function getFitScale(baseWidth: number, baseHeight: number, viewport: HTMLElement) {
	const horizontalPadding = 48;
	const verticalPadding = 48;
	const availableWidth = Math.max(viewport.clientWidth - horizontalPadding, 1);
	const availableHeight = Math.max(viewport.clientHeight - verticalPadding, 1);
	return Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);
}

function applyScale() {
	if (!viewerState) {
		return;
	}

	const scaledWidth = viewerState.baseWidth * viewerState.scale;
	const scaledHeight = viewerState.baseHeight * viewerState.scale;

	viewerState.content.style.width = `${scaledWidth}px`;
	viewerState.content.style.height = `${scaledHeight}px`;
	viewerState.svg.style.width = `${scaledWidth}px`;
	viewerState.svg.style.height = `${scaledHeight}px`;

	const minimumScale = getFitScale(viewerState.baseWidth, viewerState.baseHeight, viewerState.viewport);
	const maximumScale = Math.max(minimumScale * MAX_ZOOM_MULTIPLIER, minimumScale);
	viewerState.zoomOutButton.disabled = viewerState.scale <= minimumScale + 0.001;
	viewerState.zoomInButton.disabled = viewerState.scale >= maximumScale - 0.001;
}

function resetToFitScale() {
	if (!viewerState) {
		return;
	}

	viewerState.scale = getFitScale(viewerState.baseWidth, viewerState.baseHeight, viewerState.viewport);
	applyScale();
	viewerState.viewport.scrollTo({ left: 0, top: 0 });
}

function zoomBy(multiplier: number) {
	if (!viewerState) {
		return;
	}

	const minimumScale = getFitScale(viewerState.baseWidth, viewerState.baseHeight, viewerState.viewport);
	const maximumScale = Math.max(minimumScale * MAX_ZOOM_MULTIPLIER, minimumScale);
	const nextScale = Math.min(maximumScale, Math.max(minimumScale, viewerState.scale * multiplier));

	if (Math.abs(nextScale - viewerState.scale) < 0.001) {
		return;
	}

	const previousWidth = viewerState.baseWidth * viewerState.scale;
	const previousHeight = viewerState.baseHeight * viewerState.scale;
	const centerX = viewerState.viewport.scrollLeft + viewerState.viewport.clientWidth / 2;
	const centerY = viewerState.viewport.scrollTop + viewerState.viewport.clientHeight / 2;
	const widthRatio = previousWidth > 0 ? centerX / previousWidth : 0.5;
	const heightRatio = previousHeight > 0 ? centerY / previousHeight : 0.5;

	viewerState.scale = nextScale;
	applyScale();

	const nextWidth = viewerState.baseWidth * viewerState.scale;
	const nextHeight = viewerState.baseHeight * viewerState.scale;
	viewerState.viewport.scrollLeft = Math.max(0, nextWidth * widthRatio - viewerState.viewport.clientWidth / 2);
	viewerState.viewport.scrollTop = Math.max(0, nextHeight * heightRatio - viewerState.viewport.clientHeight / 2);
}

function openLightbox(diagram: HTMLElement) {
	const dialog = ensureLightbox();
	const content = dialog.querySelector<HTMLElement>(".muninn-mermaid-lightbox__content");
	const zoomInButton = dialog.querySelector<HTMLButtonElement>("[data-mermaid-zoom-in]");
	const zoomOutButton = dialog.querySelector<HTMLButtonElement>("[data-mermaid-zoom-out]");
	const viewport = dialog.querySelector<HTMLElement>(".muninn-mermaid-lightbox__viewport");
	const svg = diagram.querySelector("svg");

	if (!content || !zoomInButton || !zoomOutButton || !viewport || !svg) {
		return;
	}

	const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
	const { width, height } = getSvgDimensions(svg);

	content.replaceChildren(clonedSvg);

	viewerState = {
		baseHeight: height,
		baseWidth: width,
		content,
		dialog,
		scale: 1,
		svg: clonedSvg,
		viewport,
		zoomInButton,
		zoomOutButton,
	};

	if (!dialog.open) {
		lockPageScroll();
		dialog.showModal();
	}

	requestAnimationFrame(() => {
		resetToFitScale();
	});
}

function makeDiagramInteractive(diagram: HTMLElement) {
	if (diagram.dataset.mermaidInteractive === "true") {
		return;
	}

	diagram.dataset.mermaidInteractive = "true";
	diagram.classList.add("mermaid-diagram--interactive");
	diagram.tabIndex = 0;
	diagram.setAttribute("role", "button");
	diagram.setAttribute("aria-label", diagram.dataset.mermaidExpandLabel || ui.mermaid.expand);
	diagram.title = diagram.dataset.mermaidExpandLabel || ui.mermaid.expand;

	diagram.addEventListener("click", () => openLightbox(diagram));
	diagram.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			openLightbox(diagram);
		}
	});
}

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
		htmlLabels: true,
		markdownAutoWrap: false,
		flowchart: {
			useMaxWidth: false,
			wrappingWidth: 240,
			padding: 24,
			nodeSpacing: 40,
			rankSpacing: 50,
		},
	});

	for (const [index, diagram] of diagrams.entries()) {
		diagram.dataset.mermaidInitialized = "true";
		const code = diagram.dataset.mermaidCode ?? "";
		try {
			const renderId = `muninn-mermaid-${index}-${Math.random().toString(36).slice(2, 8)}`;
			const { svg } = await mermaid.default.render(renderId, code);
			diagram.innerHTML = svg;
			makeDiagramInteractive(diagram);
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

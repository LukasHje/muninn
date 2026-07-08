import { ui } from "src/i18n";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

const LIGHTBOX_ID = "muninn-pdf-lightbox";
const MAX_ZOOM = 4;
const MIN_ZOOM = 1;
const ZOOM_STEP = 1.2;

interface InlinePdfState {
	canvas: HTMLCanvasElement;
	label: HTMLElement;
	lastRenderedWidth: number;
	nextButton: HTMLButtonElement;
	openButton: HTMLButtonElement;
	pageNumber: number;
	placeholder: HTMLElement;
	prevButton: HTMLButtonElement;
	renderVersion: number;
	renderTask: { cancel: () => void } | null;
	root: HTMLElement;
	src: string;
	title: string;
	totalPages: number;
}

interface PdfLightboxState {
	canvas: HTMLCanvasElement;
	dialog: HTMLDialogElement;
	nextPageButton: HTMLButtonElement;
	pageLabel: HTMLElement;
	pageNumber: number;
	prevPageButton: HTMLButtonElement;
	renderVersion: number;
	renderTask: { cancel: () => void } | null;
	src: string;
	title: HTMLElement;
	totalPages: number;
	viewport: HTMLElement;
	zoom: number;
	zoomInButton: HTMLButtonElement;
	zoomOutButton: HTMLButtonElement;
}

const inlineStates = new WeakMap<HTMLElement, InlinePdfState>();
const inlineStateRegistry = new Set<InlinePdfState>();
const pdfDocumentCache = new Map<string, Promise<any>>();
let pdfJsPromise: Promise<any> | null = null;
let lightboxState: PdfLightboxState | null = null;
let inlineResizeBound = false;

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

async function importPdfJs() {
	if (!pdfJsPromise) {
		pdfJsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
			pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
			return pdfjs;
		});
	}

	return pdfJsPromise as Promise<any>;
}

async function getPdfDocument(src: string) {
	let documentPromise = pdfDocumentCache.get(src);
	if (!documentPromise) {
		documentPromise = importPdfJs()
			.then((pdfjs) => pdfjs.getDocument({ url: src }).promise)
		pdfDocumentCache.set(src, documentPromise);
	}

	return documentPromise as Promise<any>;
}

function getIconMarkup(kind: "close" | "left" | "right" | "zoom-in" | "zoom-out") {
	if (kind === "close") {
		return `
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M18 6 6 18"></path>
				<path d="m6 6 12 12"></path>
			</svg>
		`;
	}

	if (kind === "left" || kind === "right") {
		return `
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="${kind === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}"></path>
			</svg>
		`;
	}

	return `
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="11" cy="11" r="6"></circle>
			<path d="m20 20-4.2-4.2"></path>
			${kind === "zoom-in" ? '<path d="M8.5 11h5"></path><path d="M11 8.5v5"></path>' : ""}
			${kind === "zoom-out" ? '<path d="M8.5 11h5"></path>' : ""}
		</svg>
	`;
}

function updateButtonState(
	prevButton: HTMLButtonElement,
	nextButton: HTMLButtonElement,
	pageNumber: number,
	totalPages: number
) {
	prevButton.disabled = pageNumber <= 1;
	nextButton.disabled = pageNumber >= totalPages;
}

function getCanvasContext(canvas: HTMLCanvasElement) {
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error(ui.errors.canvasContextUnavailable);
	}

	return context;
}

function isRenderCancellation(error: unknown) {
	return error instanceof Error && /RenderingCancelledException|cancelled/i.test(error.name + error.message);
}

async function renderPageToCanvas(
	documentProxy: any,
	pageNumber: number,
	canvas: HTMLCanvasElement,
	targetWidth: number,
	targetHeight?: number,
	zoom = 1,
	onRenderTask?: (task: { cancel: () => void } | null) => void
) {
	const page = await documentProxy.getPage(pageNumber);
	const baseViewport = page.getViewport({ scale: 1 });
	const safeWidth = Math.max(targetWidth, 240);
	const widthScale = safeWidth / baseViewport.width;
	const heightScale = targetHeight ? Math.max(targetHeight, 240) / baseViewport.height : widthScale;
	const fitScale = Math.min(widthScale, heightScale);
	const scale = fitScale * zoom;
	const viewport = page.getViewport({ scale });
	const outputScale = window.devicePixelRatio || 1;
	const context = getCanvasContext(canvas);

	canvas.width = Math.floor(viewport.width * outputScale);
	canvas.height = Math.floor(viewport.height * outputScale);
	canvas.style.width = `${viewport.width}px`;
	canvas.style.height = `${viewport.height}px`;
	context.clearRect(0, 0, canvas.width, canvas.height);

	const renderTask = page.render({
		canvasContext: context,
		transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
		viewport,
	});

	onRenderTask?.(renderTask);

	try {
		await renderTask.promise;
	} finally {
		onRenderTask?.(null);
	}
}

async function renderInlinePdf(state: InlinePdfState) {
	const renderVersion = ++state.renderVersion;

	try {
		state.placeholder.textContent = ui.pdf.loading;
		state.placeholder.hidden = false;
		state.renderTask?.cancel();

		const documentProxy = await getPdfDocument(state.src);
		if (renderVersion !== state.renderVersion) {
			return;
		}

		state.totalPages = documentProxy.numPages;
		state.pageNumber = Math.max(1, Math.min(state.pageNumber, state.totalPages));

		const targetWidth = Math.max(state.openButton.clientWidth - 32, 240);
		state.lastRenderedWidth = targetWidth;
		await renderPageToCanvas(
			documentProxy,
			state.pageNumber,
			state.canvas,
			targetWidth,
			undefined,
			1,
			(task) => {
				state.renderTask = task;
			}
		);
		if (renderVersion !== state.renderVersion) {
			return;
		}

		state.label.textContent = ui.pdf.pageLabel(state.pageNumber, state.totalPages);
		state.placeholder.hidden = true;
		updateButtonState(state.prevButton, state.nextButton, state.pageNumber, state.totalPages);
	} catch (error) {
		if (isRenderCancellation(error)) {
			return;
		}

		if (renderVersion !== state.renderVersion) {
			return;
		}

		state.placeholder.textContent = ui.pdf.loadFailed;
		state.placeholder.hidden = false;
		state.label.textContent = ui.common.noData;
		state.prevButton.disabled = true;
		state.nextButton.disabled = true;
	}
}

function ensureLightbox() {
	let dialog = document.getElementById(LIGHTBOX_ID) as HTMLDialogElement | null;
	if (dialog) {
		return dialog;
	}

	dialog = document.createElement("dialog");
	dialog.id = LIGHTBOX_ID;
	dialog.className = "muninn-pdf-lightbox";
	dialog.innerHTML = `
		<div class="muninn-pdf-lightbox__surface">
			<div class="muninn-pdf-lightbox__toolbar">
				<div class="muninn-pdf-lightbox__toolbar-group">
					<div class="muninn-pdf-lightbox__title"></div>
					<div class="muninn-pdf-lightbox__chip" data-pdf-lightbox-page-label>${ui.pdf.pageLabel(1, 1)}</div>
				</div>
				<div class="muninn-pdf-lightbox__toolbar-group">
					<button
						type="button"
						class="muninn-pdf-lightbox__icon-button"
						data-pdf-lightbox-prev-page
						aria-label="${ui.pdf.previousPage}"
						title="${ui.pdf.previousPage}"
					>
						${getIconMarkup("left")}
					</button>
					<button
						type="button"
						class="muninn-pdf-lightbox__icon-button"
						data-pdf-lightbox-next-page
						aria-label="${ui.pdf.nextPage}"
						title="${ui.pdf.nextPage}"
					>
						${getIconMarkup("right")}
					</button>
					<button
						type="button"
						class="muninn-pdf-lightbox__icon-button"
						data-pdf-lightbox-zoom-out
						aria-label="${ui.pdf.zoomOut}"
						title="${ui.pdf.zoomOut}"
					>
						${getIconMarkup("zoom-out")}
					</button>
					<button
						type="button"
						class="muninn-pdf-lightbox__icon-button"
						data-pdf-lightbox-zoom-in
						aria-label="${ui.pdf.zoomIn}"
						title="${ui.pdf.zoomIn}"
					>
						${getIconMarkup("zoom-in")}
					</button>
					<button
						type="button"
						class="muninn-pdf-lightbox__icon-button"
						data-pdf-lightbox-close
						aria-label="${ui.pdf.close}"
						title="${ui.pdf.close}"
					>
						${getIconMarkup("close")}
					</button>
				</div>
			</div>
			<div class="muninn-pdf-lightbox__viewport">
				<div class="muninn-pdf-lightbox__stage">
					<canvas class="muninn-pdf-lightbox__canvas"></canvas>
				</div>
			</div>
		</div>
	`;

	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	});

	dialog.addEventListener("close", () => {
		lightboxState?.renderTask?.cancel();
		lightboxState = null;
		unlockPageScroll();
	});

	dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-close]")?.addEventListener("click", () => {
		dialog?.close();
	});

	dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-prev-page]")?.addEventListener("click", () => {
		if (!lightboxState) {
			return;
		}
		lightboxState.pageNumber = Math.max(1, lightboxState.pageNumber - 1);
		void renderLightboxPdf(lightboxState);
	});

	dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-next-page]")?.addEventListener("click", () => {
		if (!lightboxState) {
			return;
		}
		lightboxState.pageNumber = Math.min(lightboxState.totalPages, lightboxState.pageNumber + 1);
		void renderLightboxPdf(lightboxState);
	});

	dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-zoom-out]")?.addEventListener("click", () => {
		if (!lightboxState) {
			return;
		}
		lightboxState.zoom = Math.max(MIN_ZOOM, lightboxState.zoom / ZOOM_STEP);
		void renderLightboxPdf(lightboxState);
	});

	dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-zoom-in]")?.addEventListener("click", () => {
		if (!lightboxState) {
			return;
		}
		lightboxState.zoom = Math.min(MAX_ZOOM, lightboxState.zoom * ZOOM_STEP);
		void renderLightboxPdf(lightboxState);
	});

	document.addEventListener("keydown", (event) => {
		if (!dialog?.open || !lightboxState) {
			return;
		}

		if (event.key === "Escape") {
			dialog.close();
			return;
		}

		if (event.key === "ArrowLeft") {
			event.preventDefault();
			lightboxState.pageNumber = Math.max(1, lightboxState.pageNumber - 1);
			void renderLightboxPdf(lightboxState);
			return;
		}

		if (event.key === "ArrowRight") {
			event.preventDefault();
			lightboxState.pageNumber = Math.min(lightboxState.totalPages, lightboxState.pageNumber + 1);
			void renderLightboxPdf(lightboxState);
			return;
		}

		if ((event.key === "+" || event.key === "=") && !event.metaKey && !event.ctrlKey) {
			event.preventDefault();
			lightboxState.zoom = Math.min(MAX_ZOOM, lightboxState.zoom * ZOOM_STEP);
			void renderLightboxPdf(lightboxState);
			return;
		}

		if ((event.key === "-" || event.key === "_") && !event.metaKey && !event.ctrlKey) {
			event.preventDefault();
			lightboxState.zoom = Math.max(MIN_ZOOM, lightboxState.zoom / ZOOM_STEP);
			void renderLightboxPdf(lightboxState);
		}
	});

	window.addEventListener("resize", () => {
		if (lightboxState?.dialog.open) {
			void renderLightboxPdf(lightboxState);
		}
	});

	document.body.append(dialog);
	return dialog;
}

async function renderLightboxPdf(state: PdfLightboxState) {
	const renderVersion = ++state.renderVersion;

	try {
		state.renderTask?.cancel();
		const documentProxy = await getPdfDocument(state.src);
		if (renderVersion !== state.renderVersion) {
			return;
		}

		state.totalPages = documentProxy.numPages;
		state.pageNumber = Math.max(1, Math.min(state.pageNumber, state.totalPages));

		const targetWidth = Math.min(state.viewport.clientWidth - 96, 1400);
		const targetHeight = Math.max(state.viewport.clientHeight - 96, 240);
		await renderPageToCanvas(
			documentProxy,
			state.pageNumber,
			state.canvas,
			targetWidth,
			targetHeight,
			state.zoom,
			(task) => {
				state.renderTask = task;
			}
		);
		if (renderVersion !== state.renderVersion) {
			return;
		}

		state.pageLabel.textContent = ui.pdf.pageLabel(state.pageNumber, state.totalPages);
		updateButtonState(state.prevPageButton, state.nextPageButton, state.pageNumber, state.totalPages);
		state.zoomOutButton.disabled = state.zoom <= MIN_ZOOM + 0.01;
		state.zoomInButton.disabled = state.zoom >= MAX_ZOOM - 0.01;
	} catch (error) {
		if (isRenderCancellation(error)) {
			return;
		}

		if (renderVersion !== state.renderVersion) {
			return;
		}

		state.pageLabel.textContent = ui.pdf.loadFailed;
		state.prevPageButton.disabled = true;
		state.nextPageButton.disabled = true;
		state.zoomOutButton.disabled = true;
		state.zoomInButton.disabled = true;
	}
}

async function openPdfLightbox(src: string, title: string, pageNumber = 1) {
	const dialog = ensureLightbox();
	const canvas = dialog.querySelector<HTMLCanvasElement>(".muninn-pdf-lightbox__canvas");
	const titleElement = dialog.querySelector<HTMLElement>(".muninn-pdf-lightbox__title");
	const pageLabel = dialog.querySelector<HTMLElement>("[data-pdf-lightbox-page-label]");
	const prevPageButton = dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-prev-page]");
	const nextPageButton = dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-next-page]");
	const zoomOutButton = dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-zoom-out]");
	const zoomInButton = dialog.querySelector<HTMLButtonElement>("[data-pdf-lightbox-zoom-in]");
	const viewport = dialog.querySelector<HTMLElement>(".muninn-pdf-lightbox__viewport");

	if (
		!canvas ||
		!titleElement ||
		!pageLabel ||
		!prevPageButton ||
		!nextPageButton ||
		!zoomOutButton ||
		!zoomInButton ||
		!viewport
	) {
		return;
	}

	lightboxState = {
		canvas,
		dialog,
		nextPageButton,
		pageLabel,
		pageNumber,
		prevPageButton,
		renderVersion: 0,
		renderTask: null,
		src,
		title: titleElement,
		totalPages: 1,
		viewport,
		zoom: 1,
		zoomInButton,
		zoomOutButton,
	};

	titleElement.textContent = title;

	if (!dialog.open) {
		lockPageScroll();
		dialog.showModal();
	}

	await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
	await renderLightboxPdf(lightboxState);
}

function bindInlinePdf(root: HTMLElement) {
	const src = root.dataset.muninnPdfSrc ?? "";
	const title = root.dataset.muninnPdfTitle ?? ui.pdf.badge;
	const canvas = root.querySelector<HTMLCanvasElement>("[data-muninn-pdf-canvas]");
	const label = root.querySelector<HTMLElement>("[data-muninn-pdf-page-label]");
	const prevButton = root.querySelector<HTMLButtonElement>("[data-muninn-pdf-prev]");
	const nextButton = root.querySelector<HTMLButtonElement>("[data-muninn-pdf-next]");
	const openButton = root.querySelector<HTMLButtonElement>("[data-muninn-pdf-open]");
	const placeholder = root.querySelector<HTMLElement>("[data-muninn-pdf-placeholder]");

	if (inlineStates.has(root)) {
		return;
	}

	if (!src || !canvas || !label || !prevButton || !nextButton || !openButton || !placeholder) {
		return;
	}

	const state: InlinePdfState = {
		canvas,
		label,
		lastRenderedWidth: 0,
		nextButton,
		openButton,
		pageNumber: 1,
		placeholder,
		prevButton,
		renderVersion: 0,
		renderTask: null,
		root,
		src,
		title,
		totalPages: 1,
	};

	inlineStates.set(root, state);
	inlineStateRegistry.add(state);

	prevButton.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		state.pageNumber = Math.max(1, state.pageNumber - 1);
		void renderInlinePdf(state);
	});

	nextButton.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		state.pageNumber = Math.min(state.totalPages, state.pageNumber + 1);
		void renderInlinePdf(state);
	});

	openButton.addEventListener("click", () => {
		void openPdfLightbox(state.src, state.title, state.pageNumber);
	});

	requestAnimationFrame(() => {
		void renderInlinePdf(state);
	});
}

export default function initPdfViewers() {
	if (!inlineResizeBound) {
		inlineResizeBound = true;
		let resizeTimeout: number | undefined;
		window.addEventListener("resize", () => {
			window.clearTimeout(resizeTimeout);
			resizeTimeout = window.setTimeout(() => {
				for (const state of inlineStateRegistry) {
					const nextWidth = Math.max(state.openButton.clientWidth - 32, 240);
					if (Math.abs(nextWidth - state.lastRenderedWidth) > 24) {
						void renderInlinePdf(state);
					}
				}
			}, 120);
		});
	}

	document.querySelectorAll<HTMLElement>("[data-muninn-pdf-document]").forEach((root) => {
		bindInlinePdf(root);
	});
}

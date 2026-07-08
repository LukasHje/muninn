import { ui } from "src/i18n";

const LIGHTBOX_ID = "muninn-image-lightbox";

interface ImageLightboxItem {
	alt: string;
	src: string;
}

interface ImageViewerState {
	counter: HTMLElement;
	dialog: HTMLDialogElement;
	image: HTMLImageElement;
	items: ImageLightboxItem[];
	nextButton: HTMLButtonElement;
	prevButton: HTMLButtonElement;
	thumbnails: HTMLElement;
	index: number;
}

let viewerState: ImageViewerState | null = null;

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

function getIconMarkup(kind: "close" | "left" | "right") {
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
			<path d="${kind === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}"></path>
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
	dialog.className = "muninn-image-lightbox";
	dialog.innerHTML = `
		<div class="muninn-image-lightbox__surface">
			<div class="muninn-image-lightbox__toolbar">
				<div class="muninn-image-lightbox__toolbar-group">
					<div class="muninn-image-lightbox__counter">1 / 1</div>
				</div>
				<div class="muninn-image-lightbox__toolbar-group">
					<button
						type="button"
						class="muninn-image-lightbox__icon-button"
						data-image-lightbox-close
						aria-label="${ui.mermaid.close}"
						title="${ui.mermaid.close}"
					>
						${getIconMarkup("close")}
					</button>
				</div>
			</div>
			<div class="muninn-image-lightbox__viewport">
				<button
					type="button"
					class="muninn-image-lightbox__icon-button"
					data-image-lightbox-prev
					aria-label="${ui.mediaSlider.previousImage}"
					title="${ui.mediaSlider.previousImage}"
				>
					${getIconMarkup("left")}
				</button>
				<div class="muninn-image-lightbox__stage">
					<img class="muninn-image-lightbox__image" alt="" />
				</div>
				<button
					type="button"
					class="muninn-image-lightbox__icon-button"
					data-image-lightbox-next
					aria-label="${ui.mediaSlider.nextImage}"
					title="${ui.mediaSlider.nextImage}"
				>
					${getIconMarkup("right")}
				</button>
			</div>
			<div class="muninn-image-lightbox__thumbs"></div>
		</div>
	`;

	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	});

	dialog.addEventListener("close", () => {
		viewerState = null;
		unlockPageScroll();
	});

	dialog.querySelector<HTMLButtonElement>("[data-image-lightbox-close]")?.addEventListener("click", () => {
		dialog?.close();
	});

	dialog.querySelector<HTMLButtonElement>("[data-image-lightbox-prev]")?.addEventListener("click", () => {
		stepImage(-1);
	});

	dialog.querySelector<HTMLButtonElement>("[data-image-lightbox-next]")?.addEventListener("click", () => {
		stepImage(1);
	});

	document.addEventListener("keydown", (event) => {
		if (!dialog?.open || !viewerState) {
			return;
		}

		if (event.key === "Escape") {
			dialog.close();
			return;
		}

		if (event.key === "ArrowLeft") {
			event.preventDefault();
			stepImage(-1);
			return;
		}

		if (event.key === "ArrowRight") {
			event.preventDefault();
			stepImage(1);
		}
	});

	document.body.append(dialog);
	return dialog;
}

function renderThumbnails() {
	if (!viewerState) {
		return;
	}

	viewerState.thumbnails.innerHTML = "";

	viewerState.items.forEach((item, index) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "muninn-image-lightbox__thumb";
		button.dataset.active = index === viewerState?.index ? "true" : "false";
		button.setAttribute("aria-label", ui.mediaSlider.showImage(index + 1));

		const image = document.createElement("img");
		image.src = item.src;
		image.alt = item.alt;
		button.append(image);

		button.addEventListener("click", () => {
			setImageIndex(index);
		});

		viewerState?.thumbnails.append(button);
	});
}

function renderViewer() {
	if (!viewerState) {
		return;
	}

	const item = viewerState.items[viewerState.index];
	viewerState.image.src = item.src;
	viewerState.image.alt = item.alt;
	viewerState.counter.textContent = `${viewerState.index + 1} / ${viewerState.items.length}`;
	renderThumbnails();
}

function setImageIndex(index: number) {
	if (!viewerState || viewerState.items.length === 0) {
		return;
	}

	viewerState.index = (index + viewerState.items.length) % viewerState.items.length;
	renderViewer();
}

function stepImage(direction: -1 | 1) {
	if (!viewerState) {
		return;
	}

	setImageIndex(viewerState.index + direction);
}

function openLightbox(items: ImageLightboxItem[], startIndex: number) {
	if (items.length === 0) {
		return;
	}

	const dialog = ensureLightbox();
	const image = dialog.querySelector<HTMLImageElement>(".muninn-image-lightbox__image");
	const counter = dialog.querySelector<HTMLElement>(".muninn-image-lightbox__counter");
	const thumbnails = dialog.querySelector<HTMLElement>(".muninn-image-lightbox__thumbs");
	const prevButton = dialog.querySelector<HTMLButtonElement>("[data-image-lightbox-prev]");
	const nextButton = dialog.querySelector<HTMLButtonElement>("[data-image-lightbox-next]");

	if (!image || !counter || !thumbnails || !prevButton || !nextButton) {
		return;
	}

	viewerState = {
		counter,
		dialog,
		image,
		items,
		nextButton,
		prevButton,
		thumbnails,
		index: 0,
	};

	if (!dialog.open) {
		lockPageScroll();
		dialog.showModal();
	}

	setImageIndex(startIndex);
}

function getStandaloneItems(group: string) {
	const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-muninn-lightbox-image]")).filter(
		(node) => node.dataset.muninnLightboxGroup === group
	);

	return nodes
		.map((node) => ({
			alt: node.dataset.muninnLightboxAlt ?? "",
			node,
			src: node.dataset.muninnLightboxSrc ?? "",
		}))
		.filter((item) => item.src);
}

function bindStandaloneImage(node: HTMLElement) {
	if (node.dataset.muninnLightboxBound === "true") {
		return;
	}

	node.dataset.muninnLightboxBound = "true";
	const trigger = node.querySelector<HTMLElement>("[data-muninn-lightbox-trigger]") ?? node;

	const open = () => {
		const group = node.dataset.muninnLightboxGroup ?? "";
		const items = getStandaloneItems(group);
		const startIndex = items.findIndex((item) => item.node === node);
		openLightbox(
			items.map(({ alt, src }) => ({ alt, src })),
			Math.max(0, startIndex)
		);
	};

	trigger.addEventListener("click", open);
	trigger.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			open();
		}
	});
}

function getSliderItems(slider: HTMLElement) {
	return Array.from(slider.querySelectorAll<HTMLImageElement>("[data-slider-lightbox-image]"))
		.map((image) => ({
			alt: image.alt,
			src: image.currentSrc || image.src,
		}))
		.filter((item) => item.src);
}

function bindSliderImage(image: HTMLImageElement) {
	if (image.dataset.sliderLightboxBound === "true") {
		return;
	}

	image.dataset.sliderLightboxBound = "true";

	image.addEventListener("click", () => {
		const slider = image.closest<HTMLElement>("[data-media-slider]");
		const slide = image.closest<HTMLElement>("[data-slide]");
		if (!slider || !slide) {
			return;
		}

		const items = getSliderItems(slider);
		const startIndex = Number.parseInt(slide.dataset.slideIndex ?? "0", 10);
		openLightbox(items, Number.isFinite(startIndex) ? startIndex : 0);
	});
}

export default function initImageLightbox() {
	document.querySelectorAll<HTMLElement>("[data-muninn-lightbox-image]").forEach((node) => {
		bindStandaloneImage(node);
	});

	document.querySelectorAll<HTMLImageElement>("[data-slider-lightbox-image]").forEach((image) => {
		bindSliderImage(image);
	});
}

const DESKTOP_MEDIA_QUERY = "(min-width: 1280px)";
const DRAWER_EDGE_SIZE = 24;
const SWIPE_THRESHOLD = 72;

type OverlayState = "none" | "sidebar" | "inspector" | "metadata";

interface InspectorStateDetail {
	open: boolean;
	inspector?: HTMLElement;
	trigger?: HTMLElement;
}

let activeController: AbortController | null = null;

function getFocusable(container: HTMLElement): HTMLElement[] {
	return Array.from(
		container.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		)
	).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

export default function initApplicationShell() {
	const shell = document.querySelector<HTMLElement>("[data-application-shell]");
	if (!shell || shell.dataset.shellReady === "true") {
		return;
	}

	activeController?.abort();
	const controller = new AbortController();
	activeController = controller;
	const { signal } = controller;
	shell.dataset.shellReady = "true";

	const drawer = shell.querySelector<HTMLElement>("[data-sidebar-drawer]");
	const openButton = shell.querySelector<HTMLButtonElement>("[data-sidebar-drawer-open]");
	const closeButton = shell.querySelector<HTMLButtonElement>("[data-sidebar-drawer-close]");
	const backdrop = shell.querySelector<HTMLButtonElement>("[data-sidebar-drawer-backdrop]");
	const mainWorkspace = shell.querySelector<HTMLElement>("[data-main-workspace]");
	const mobileHeader = shell.querySelector<HTMLElement>("[data-mobile-header]");
	const metadataDrawer = shell.querySelector<HTMLElement>("[data-note-metadata-drawer]");
	const metadataTrigger = shell.querySelector<HTMLButtonElement>("[data-note-metadata-open]");
	const metadataTriggers = Array.from(
		shell.querySelectorAll<HTMLButtonElement>("[data-note-metadata-open], [data-note-metadata-open-secondary]")
	);
	const metadataCloseButton = shell.querySelector<HTMLButtonElement>("[data-note-metadata-close]");
	const noteReaderContent = shell.querySelector<HTMLElement>("[data-note-reader-content]");
	const overlayLayer = shell.querySelector<HTMLElement>("[data-shell-overlay-layer]");
	const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY);

	if (!drawer || !openButton || !backdrop || !mainWorkspace) {
		return;
	}

	// Mount note-owned overlay UI at shell level so workspace padding and scroll
	// containers can never position it or reserve content width.
	if (overlayLayer) {
		if (metadataTrigger) overlayLayer.append(metadataTrigger);
		if (metadataDrawer) overlayLayer.append(metadataDrawer);
	}

	const syncWorkspaceScrollbarInset = () => {
		const hasVerticalOverflow = mainWorkspace.scrollHeight > mainWorkspace.clientHeight + 1;
		const measuredWidth = Math.max(mainWorkspace.offsetWidth - mainWorkspace.clientWidth, 0);
		const inset = hasVerticalOverflow ? Math.max(measuredWidth, desktopMedia.matches ? 8 : 0) : 0;
		shell.style.setProperty("--workspace-scrollbar-inset", `${inset}px`);
	};
	const scrollbarObserver = new ResizeObserver(syncWorkspaceScrollbarInset);
	scrollbarObserver.observe(mainWorkspace);
	if (noteReaderContent) scrollbarObserver.observe(noteReaderContent);
	signal.addEventListener("abort", () => scrollbarObserver.disconnect(), { once: true });
	requestAnimationFrame(syncWorkspaceScrollbarInset);

	let overlay: OverlayState = "none";
	let inspector: HTMLElement | null = null;
	let restoreFocusTo: HTMLElement | null = null;
	let workspaceScrollTop = 0;
	let inertElements: HTMLElement[] = [];
	const navigationBackdropLabel = backdrop.getAttribute("aria-label") ?? "Close navigation";
	const metadataBackdropLabel = metadataCloseButton?.getAttribute("aria-label") ?? "Close note metadata";

	const clearInert = () => {
		for (const element of inertElements) {
			element.inert = false;
		}
		inertElements = [];
	};

	const makeInert = (...elements: Array<HTMLElement | null>) => {
		for (const element of elements) {
			if (element && !element.inert) {
				element.inert = true;
				inertElements.push(element);
			}
		}
	};

	const restoreWorkspace = () => {
		requestAnimationFrame(() => {
			mainWorkspace.scrollTop = workspaceScrollTop;
		});
	};

	const focusFirst = (container: HTMLElement, preferred?: HTMLElement | null) => {
		requestAnimationFrame(() => {
			(preferred ?? getFocusable(container)[0] ?? container).focus({ preventScroll: true });
		});
	};

	const setOverlay = (next: OverlayState, options: { restoreFocus?: boolean } = {}) => {
		if (desktopMedia.matches && next !== "metadata") {
			next = "none";
		}

		const previous = overlay;
		overlay = next;
		shell.dataset.overlay = next;
		clearInert();

		const drawerOpen = next === "sidebar";
		drawer.setAttribute("aria-hidden", desktopMedia.matches || drawerOpen ? "false" : "true");
		drawer.setAttribute("role", drawerOpen ? "dialog" : "presentation");
		if (drawerOpen) drawer.setAttribute("aria-modal", "true");
		else drawer.removeAttribute("aria-modal");
		openButton.setAttribute("aria-expanded", drawerOpen ? "true" : "false");
		const metadataOpen = next === "metadata" && Boolean(metadataDrawer);
		metadataDrawer?.setAttribute("aria-hidden", metadataOpen ? "false" : "true");
		metadataDrawer?.setAttribute("role", metadataOpen ? "dialog" : "complementary");
		if (metadataOpen) metadataDrawer?.setAttribute("aria-modal", "true");
		else metadataDrawer?.removeAttribute("aria-modal");
		for (const trigger of metadataTriggers) {
			trigger.setAttribute("aria-expanded", metadataOpen ? "true" : "false");
		}
		backdrop.setAttribute("aria-label", metadataOpen ? metadataBackdropLabel : navigationBackdropLabel);

		if (next === "sidebar") {
			workspaceScrollTop = mainWorkspace.scrollTop;
			restoreFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : openButton;
			makeInert(mainWorkspace, mobileHeader);
			focusFirst(drawer, closeButton);
		} else if (next === "inspector" && inspector) {
			workspaceScrollTop = mainWorkspace.scrollTop;
			makeInert(drawer, mobileHeader, shell.querySelector<HTMLElement>("[data-experience-workspace]"));
			inspector.setAttribute("role", "dialog");
			inspector.setAttribute("aria-modal", "true");
			focusFirst(inspector, inspector.querySelector<HTMLElement>("[data-experience-close]"));
		} else if (next === "metadata" && metadataDrawer) {
			workspaceScrollTop = mainWorkspace.scrollTop;
			makeInert(drawer, mobileHeader, noteReaderContent, metadataTrigger);
			focusFirst(metadataDrawer, metadataCloseButton);
		} else {
			if (inspector) {
				inspector.removeAttribute("aria-modal");
				inspector.setAttribute("role", "complementary");
			}
			restoreWorkspace();
			if (options.restoreFocus !== false && previous !== "none") {
				requestAnimationFrame(() => restoreFocusTo?.focus({ preventScroll: true }));
			}
		}
	};

	const closeDrawer = (restoreFocus = true) => {
		if (overlay === "sidebar") {
			setOverlay("none", { restoreFocus });
		}
	};

	const closeMetadata = (restoreFocus = true) => {
		if (overlay === "metadata") {
			setOverlay("none", { restoreFocus });
		}
	};

	const openMetadata = (trigger: HTMLButtonElement | null = metadataTrigger) => {
		if (!metadataDrawer || !trigger) return;
		if (overlay === "sidebar") closeDrawer(false);
		if (overlay === "inspector") {
			window.dispatchEvent(new CustomEvent("muninn:request-inspector-close"));
		}
		restoreFocusTo = trigger;
		setOverlay("metadata");
	};

	const openDrawer = () => {
		if (desktopMedia.matches) return;
		if (overlay === "metadata") closeMetadata(false);
		if (overlay === "inspector") {
			window.dispatchEvent(new CustomEvent("muninn:request-inspector-close"));
		}
		setOverlay("sidebar");
		restoreFocusTo = openButton;
	};

	openButton.addEventListener("click", openDrawer, { signal });
	closeButton?.addEventListener("click", () => closeDrawer(), { signal });
	for (const trigger of metadataTriggers) {
		trigger.addEventListener("click", () => openMetadata(trigger), { signal });
	}
	metadataCloseButton?.addEventListener("click", () => closeMetadata(), { signal });
	backdrop.addEventListener("click", () => {
		if (overlay === "metadata") closeMetadata();
		else closeDrawer();
	}, { signal });

	drawer.addEventListener("click", (event) => {
		const target = event.target;
		if (target instanceof Element && target.closest("a[href]")) {
			closeDrawer(false);
		}
	}, { signal });

	window.addEventListener("muninn:inspector-state-change", (event) => {
		if (!(event instanceof CustomEvent)) return;
		const detail = event.detail as InspectorStateDetail;
		if (detail.inspector) inspector = detail.inspector;
		if (detail.open && overlay === "metadata") closeMetadata(false);
		if (desktopMedia.matches) return;

		if (detail.open && inspector) {
			if (overlay === "sidebar") closeDrawer(false);
			restoreFocusTo = detail.trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
			setOverlay("inspector");
		} else if (overlay === "inspector") {
			setOverlay("none");
		}
	}, { signal });

	document.addEventListener("keydown", (event) => {
		if (overlay === "none" || (desktopMedia.matches && overlay !== "metadata")) return;

		if (event.key === "Escape") {
			event.preventDefault();
			if (overlay === "sidebar") closeDrawer();
			else if (overlay === "metadata") closeMetadata();
			else window.dispatchEvent(new CustomEvent("muninn:request-inspector-close"));
			return;
		}

		if (event.key !== "Tab") return;
		const modal = overlay === "sidebar" ? drawer : overlay === "metadata" ? metadataDrawer : inspector;
		if (!modal) return;
		const focusable = getFocusable(modal);
		if (focusable.length === 0) {
			event.preventDefault();
			modal.focus({ preventScroll: true });
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}, { signal });

	let pointerStart: {
		x: number;
		y: number;
		mode: "sidebar-open" | "sidebar-close" | "metadata-open" | "metadata-close";
	} | null = null;

	document.addEventListener("pointerdown", (event) => {
		if (desktopMedia.matches || event.pointerType !== "touch") return;
		const target = event.target;
		if (!(target instanceof Element)) return;

		const horizontalContent = target.closest(
			"pre, .muninn-table-wrap, .experience-filter-row, [data-horizontal-scroll], [data-media-slider], [data-muninn-lightbox-image], [data-muninn-pdf-document], [data-leaflet-map], video, audio, iframe"
		);

		if (
			overlay === "none" &&
			event.clientX <= DRAWER_EDGE_SIZE &&
			!horizontalContent
		) {
			pointerStart = { x: event.clientX, y: event.clientY, mode: "sidebar-open" };
		} else if (
			overlay === "none" &&
			metadataDrawer &&
			event.clientX >= window.innerWidth - DRAWER_EDGE_SIZE &&
			!horizontalContent
		) {
			pointerStart = { x: event.clientX, y: event.clientY, mode: "metadata-open" };
		} else if (
			overlay === "sidebar" &&
			drawer.contains(target) &&
			!horizontalContent
		) {
			pointerStart = { x: event.clientX, y: event.clientY, mode: "sidebar-close" };
		} else if (
			overlay === "metadata" &&
			metadataDrawer?.contains(target) &&
			!horizontalContent
		) {
			pointerStart = { x: event.clientX, y: event.clientY, mode: "metadata-close" };
		}
	}, { signal, passive: true });

	document.addEventListener("pointerup", (event) => {
		if (!pointerStart) return;
		const deltaX = event.clientX - pointerStart.x;
		const deltaY = event.clientY - pointerStart.y;
		const horizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
		if (horizontal && pointerStart.mode === "sidebar-open" && deltaX >= SWIPE_THRESHOLD) openDrawer();
		if (horizontal && pointerStart.mode === "sidebar-close" && deltaX <= -SWIPE_THRESHOLD) closeDrawer();
		if (horizontal && pointerStart.mode === "metadata-open" && deltaX <= -SWIPE_THRESHOLD) openMetadata();
		if (horizontal && pointerStart.mode === "metadata-close" && deltaX >= SWIPE_THRESHOLD) closeMetadata();
		pointerStart = null;
	}, { signal, passive: true });

	document.addEventListener("pointercancel", () => {
		pointerStart = null;
	}, { signal, passive: true });

	desktopMedia.addEventListener("change", () => {
		syncWorkspaceScrollbarInset();
		if (desktopMedia.matches) {
			setOverlay("none", { restoreFocus: false });
			return;
		}

		const openInspector = shell.querySelector<HTMLElement>(
			'[data-experience-root][data-inspector-open="true"] [data-experience-inspector-root]'
		);
		if (openInspector) {
			inspector = openInspector;
			setOverlay("inspector");
		} else {
			setOverlay("none", { restoreFocus: false });
		}
	}, { signal });

	document.addEventListener("astro:before-swap", () => {
		setOverlay("none", { restoreFocus: false });
		controller.abort();
	}, { signal, once: true });

	const initiallyOpenInspector = shell.querySelector<HTMLElement>(
		'[data-experience-root][data-inspector-open="true"] [data-experience-inspector-root]'
	);
	if (initiallyOpenInspector && !desktopMedia.matches) {
		inspector = initiallyOpenInspector;
		restoreFocusTo = shell.querySelector<HTMLElement>(
			'[data-experience-card][aria-pressed="true"]'
		);
		setOverlay("inspector");
	} else {
		setOverlay("none", { restoreFocus: false });
	}
}

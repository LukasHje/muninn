import type { NoteSearchDocument, NoteSearchResult } from "lib/noteSearch";
import { searchNoteDocuments } from "lib/noteSearch";
import { highlightSearchText } from "lib/searchHighlight";

type SearchIndexResponse = {
	documents: NoteSearchDocument[];
};

const MAX_VISIBLE_RESULTS = 10;
const OVERLAY_ROOT_ID = "muninn-quick-search-overlay";

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function buildNoteIconMarkup() {
	return `
		<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
			<path d="M14 2v5h5"></path>
			<path d="M9 13h6"></path>
			<path d="M9 17h6"></path>
		</svg>
	`;
}

function buildResultMarkup(result: NoteSearchResult, query: string, active: boolean, favoriteLabel: string) {
	return `
		<a
			href="${escapeHtml(result.href)}"
			data-quick-search-result
			role="option"
			aria-selected="${active ? "true" : "false"}"
			class="flex items-start gap-3 rounded-[18px] px-3 py-3 text-left transition ${active ? "bg-white/10" : "hover:bg-white/6"}"
		>
			<span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/6 text-white/65">
				${buildNoteIconMarkup()}
			</span>
			<span class="min-w-0 flex-1">
				<span class="flex items-start justify-between gap-3">
					<span class="min-w-0">
						<span class="block truncate text-sm font-semibold text-white">${highlightSearchText(result.title, query, { field: "title", markClass: "muninn-search-highlight muninn-search-highlight--inverse" })}</span>
						<span class="mt-1 block text-xs leading-5 text-white/55">${highlightSearchText(result.snippet, query, { field: result.field, markClass: "muninn-search-highlight muninn-search-highlight--inverse" })}</span>
					</span>
					<span class="flex shrink-0 items-center gap-2 pt-0.5 text-[11px] text-white/35">
						${result.favorite ? `<span title="${escapeHtml(favoriteLabel)}">★</span>` : ""}
						<span>${escapeHtml(result.updatedLabel)}</span>
					</span>
				</span>
			</span>
		</a>
	`;
}

function updateResultsPath(anchor: HTMLAnchorElement, path: string, query: string) {
	const params = new URLSearchParams();
	if (query.trim()) {
		params.set("q", query.trim());
	}

	anchor.href = params.toString() ? `${path}?${params.toString()}` : path;
}

function ensureOverlayRoot() {
	let root = document.getElementById(OVERLAY_ROOT_ID);
	if (root) {
		return root;
	}

	root = document.createElement("div");
	root.id = OVERLAY_ROOT_ID;
	root.className = "pointer-events-none fixed inset-0 z-[240] overflow-visible";
	document.body.append(root);
	return root;
}

function positionPopover(anchor: HTMLElement, popover: HTMLElement) {
	const rect = anchor.getBoundingClientRect();
	const viewportPadding = 16;
	const maxWidth = Math.min(760, window.innerWidth - viewportPadding * 2);
	const width = Math.min(Math.max(rect.width, 560), maxWidth);
	const left = Math.min(
		Math.max(viewportPadding, rect.left),
		window.innerWidth - width - viewportPadding
	);
	const top = rect.bottom + 12;

	popover.style.position = "fixed";
	popover.style.left = `${left}px`;
	popover.style.top = `${top}px`;
	popover.style.width = `${width}px`;
}

export default function initQuickSearch() {
	const roots = Array.from(document.querySelectorAll<HTMLElement>("[data-quick-search]")).filter(
		(root) => root.dataset.quickSearchReady !== "true"
	);

	for (const root of roots) {
		const input = root.querySelector<HTMLInputElement>("[data-quick-search-input]");
		const popover = root.querySelector<HTMLElement>("[data-quick-search-popover]");
		const status = root.querySelector<HTMLElement>("[data-quick-search-status]");
		const resultsContainer = root.querySelector<HTMLElement>("[data-quick-search-results]");
		const showAll = root.querySelector<HTMLAnchorElement>("[data-quick-search-show-all]");

		if (!input || !popover || !status || !resultsContainer || !showAll) {
			continue;
		}

		ensureOverlayRoot().append(popover);

		let documents: NoteSearchDocument[] = [];
		let results: NoteSearchResult[] = [];
		let activeIndex = -1;
		let loading = false;
		let fetchPromise: Promise<NoteSearchDocument[]> | null = null;
		let open = false;

		const endpoint = root.dataset.quickSearchEndpoint ?? "/api/search-index.json";
		const resultsPath = root.dataset.quickSearchResultsPath ?? "/notes";
		const loadingLabel = root.dataset.loadingLabel ?? "Loading...";
		const emptyLabel = root.dataset.emptyLabel ?? "No results";
		const showAllLabel = root.dataset.showAllLabel ?? "Show all results";
		const favoriteLabel = root.dataset.favoriteLabel ?? "Favorite";
		const singleResultLabel = root.dataset.resultLabel ?? "1 result";
		const resultsLabelTemplate = root.dataset.resultsLabelTemplate ?? "__COUNT__ results";

		const setOpen = (nextOpen: boolean) => {
			open = nextOpen;
			popover.classList.toggle("hidden", !nextOpen);
			popover.style.pointerEvents = nextOpen ? "auto" : "none";
			input.setAttribute("aria-expanded", nextOpen ? "true" : "false");

			if (nextOpen) {
				positionPopover(root, popover);
			}
		};

		const ensureDocuments = async () => {
			if (documents.length > 0) {
				return documents;
			}

			if (fetchPromise) {
				return fetchPromise;
			}

			loading = true;
			render();

			fetchPromise = fetch(endpoint)
				.then(async (response) => {
					if (!response.ok) {
						throw new Error(`Search index request failed with ${response.status}`);
					}

					const payload = (await response.json()) as SearchIndexResponse;
					documents = Array.isArray(payload.documents) ? payload.documents : [];
					return documents;
				})
				.catch(() => {
					documents = [];
					return documents;
				})
				.finally(() => {
					loading = false;
					render();
				});

			return fetchPromise;
		};

		const render = () => {
			const query = input.value.trim();
			updateResultsPath(showAll, resultsPath, query);
			showAll.querySelector("span")!.textContent = showAllLabel;

			if (!query) {
				results = [];
				activeIndex = -1;
				setOpen(false);
				status.textContent = "";
				resultsContainer.innerHTML = "";
				return;
			}

			setOpen(true);

			if (loading) {
				status.textContent = loadingLabel;
				resultsContainer.innerHTML = "";
				return;
			}

			results = searchNoteDocuments(documents, query);
			const visibleResults = results.slice(0, MAX_VISIBLE_RESULTS);
			if (activeIndex >= visibleResults.length) {
				activeIndex = visibleResults.length - 1;
			}

			if (results.length === 0) {
				status.textContent = emptyLabel;
				resultsContainer.innerHTML = "";
				return;
			}

			status.textContent =
				results.length === 1
					? singleResultLabel
					: resultsLabelTemplate.replace("__COUNT__", String(results.length));
			resultsContainer.innerHTML = visibleResults
				.map((result, index) => buildResultMarkup(result, query, index === activeIndex, favoriteLabel))
				.join("");
			positionPopover(root, popover);
		};

		const prefetch = () => {
			void ensureDocuments();
		};

		const moveActiveIndex = (direction: 1 | -1) => {
			const visibleResults = results.slice(0, MAX_VISIBLE_RESULTS);
			if (visibleResults.length === 0) {
				return;
			}

			activeIndex =
				activeIndex === -1
					? direction === 1
						? 0
						: visibleResults.length - 1
					: (activeIndex + direction + visibleResults.length) % visibleResults.length;
			render();
			const activeResult = resultsContainer.querySelectorAll<HTMLElement>("[data-quick-search-result]")[activeIndex];
			activeResult?.scrollIntoView({ block: "nearest" });
		};

		const syncPopoverPosition = () => {
			if (open) {
				positionPopover(root, popover);
			}
		};

		input.addEventListener("focus", () => {
			prefetch();
			if (input.value.trim()) {
				render();
			}
		});

		input.addEventListener("input", async () => {
			if (!input.value.trim()) {
				render();
				return;
			}

			activeIndex = -1;
			await ensureDocuments();
			render();
		});

		input.addEventListener("keydown", async (event) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				return;
			}

			if (event.key === "ArrowDown") {
				event.preventDefault();
				await ensureDocuments();
				moveActiveIndex(1);
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				await ensureDocuments();
				moveActiveIndex(-1);
				return;
			}

			if (event.key === "Enter") {
				const visibleResults = results.slice(0, MAX_VISIBLE_RESULTS);
				if (activeIndex >= 0 && visibleResults[activeIndex]) {
					event.preventDefault();
					window.location.assign(visibleResults[activeIndex].href);
					return;
				}

				if (input.value.trim()) {
					event.preventDefault();
					window.location.assign(showAll.href);
				}
				return;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				activeIndex = -1;
				setOpen(false);
				input.blur();
			}
		});

		document.addEventListener("keydown", (event) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				input.focus();
				input.select();
				prefetch();
			}
		});

		document.addEventListener("pointerdown", (event) => {
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}

			if (!root.contains(target) && !popover.contains(target)) {
				setOpen(false);
			}
		});

		resultsContainer.addEventListener("mousemove", (event) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) {
				return;
			}

			const result = target.closest<HTMLElement>("[data-quick-search-result]");
			if (!result) {
				return;
			}

			const nextIndex = Array.from(resultsContainer.querySelectorAll("[data-quick-search-result]")).indexOf(result);
			if (nextIndex >= 0 && nextIndex !== activeIndex) {
				activeIndex = nextIndex;
				render();
			}
		});

		window.addEventListener("resize", syncPopoverPosition);
		window.addEventListener("scroll", syncPopoverPosition, true);

		root.dataset.quickSearchReady = "true";

		if ("requestIdleCallback" in window) {
			window.requestIdleCallback(() => prefetch());
		} else {
			window.setTimeout(prefetch, 200);
		}
	}
}

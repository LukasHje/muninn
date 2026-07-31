import {
	bookReadingStatusLabels,
	emptyBookState,
	getBookPreferencesStore,
	getBookStateStore,
	transitionBookStatus,
	type BookReadingStatus,
	type BookState,
} from "src/lib/experienceState/books";

type SortMode =
	| "recently-added"
	| "recently-finished"
	| "title"
	| "author"
	| "rating"
	| "publication-year";

interface BookRecord {
	id: string;
	template: HTMLTemplateElement;
	title: string;
	author: string;
	year: number;
	added: number;
	genres: string[];
}

function timestamp(value: string | null | undefined) {
	return value ? Date.parse(value) || 0 : 0;
}

function animatePercentage(element: Element, target: number) {
	if (!(element instanceof HTMLElement)) return;
	const current = Number.parseInt(element.dataset.booksAnimatedValue ?? element.textContent ?? "0", 10) || 0;
	element.dataset.booksAnimatedValue = String(target);
	if (current === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		element.textContent = `${target}%`;
		return;
	}
	const animationId = String(Number.parseInt(element.dataset.booksAnimationId ?? "0", 10) + 1);
	element.dataset.booksAnimationId = animationId;
	const startedAt = performance.now();
	const tick = (now: number) => {
		if (element.dataset.booksAnimationId !== animationId) return;
		const progress = Math.min(1, (now - startedAt) / 350);
		const eased = 1 - Math.pow(1 - progress, 3);
		element.textContent = `${Math.round(current + (target - current) * eased)}%`;
		if (progress < 1) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

function syncCard(card: HTMLElement, state: BookState) {
	card.dataset.bookReadingStatus = state.readingStatus ?? "unread";
	const status = card.querySelector("[data-book-card-status]");
	if (status) {
		status.textContent = state.readingStatus
			? bookReadingStatusLabels[state.readingStatus]
			: "Unread";
	}
	const favorite = card.querySelector("[data-book-card-favorite]");
	if (favorite instanceof HTMLElement) {
		favorite.hidden = !state.favorite;
		favorite.dataset.active = state.favorite ? "true" : "false";
	}
	const progress = card.querySelector("[data-book-card-progress]");
	if (progress instanceof HTMLElement) {
		progress.hidden = state.progress === null;
		progress.style.setProperty("--book-progress", `${state.progress ?? 0}%`);
		const progressLabel = progress.querySelector("[data-book-card-progress-label]");
		if (progressLabel) progressLabel.textContent = `${state.progress ?? 0}%`;
	}
	const rating = card.querySelector("[data-book-card-rating]");
	if (rating) {
		rating.textContent = state.rating ? "★".repeat(state.rating) : "";
		rating.toggleAttribute("hidden", !state.rating);
	}
}

function protectCoverImages(container: ParentNode) {
	for (const image of container.querySelectorAll(".book-card__cover img, .book-inspector__cover img")) {
		if (!(image instanceof HTMLImageElement) || image.dataset.coverProtected === "true") continue;
		image.dataset.coverProtected = "true";
		const hideBrokenCover = () => { image.hidden = true; };
		image.addEventListener("error", hideBrokenCover, { once: true });
		if (image.complete && image.naturalWidth === 0) hideBrokenCover();
	}
}

export function initBooksExperiences() {
	for (const library of document.querySelectorAll("[data-books-library]")) {
		if (!(library instanceof HTMLElement) || library.dataset.booksReady === "true") continue;
		library.dataset.booksReady = "true";
		const root = library.closest("[data-experience-root]");
		if (!(root instanceof HTMLElement)) continue;
		const store = getBookStateStore();
		const preferencesStore = getBookPreferencesStore();
		if (!store || !preferencesStore) continue;

		const records: BookRecord[] = Array.from(library.querySelectorAll("template[data-book-template]"))
			.flatMap((template) => {
				if (!(template instanceof HTMLTemplateElement)) return [];
				const shell = template.content.firstElementChild;
				if (!(shell instanceof HTMLElement)) return [];
				return [{
					id: template.dataset.bookTemplate ?? "",
					template,
					title: shell.dataset.bookTitle ?? "",
					author: shell.dataset.bookAuthor ?? "",
					year: Number.parseInt(shell.dataset.bookYear ?? "", 10) || 0,
					added: Number.parseInt(shell.dataset.bookAdded ?? "", 10) || 0,
					genres: (shell.dataset.bookGenres ?? "").split("|").filter(Boolean),
				}];
			})
			.filter((record) => record.id);
		const savedPreferences = preferencesStore.get("library");
		const initialUrl = new URL(window.location.href);
		const usesMobileCatalogue = window.matchMedia("(max-width: 767px)").matches;
		let activeView: "home" | "library" = usesMobileCatalogue || initialUrl.searchParams.get("view") === "library" ? "library" : "home";
		let activeFilter = initialUrl.searchParams.get("book-status") ?? savedPreferences?.filter ?? "all";
		let activeAuthor = savedPreferences?.author ?? "";
		let activeYear = savedPreferences?.year ?? "";
		let sortMode: SortMode = savedPreferences?.sort ?? "recently-added";
		let searchQuery = "";
		let catalogueLayout: "grid" | "list" = "grid";

		const stateFor = (id: string) => store.get(id) ?? emptyBookState(id);
		const selectedBookId = () => {
			const panel = root.querySelector("[data-experience-inspector-panel]:not([hidden])");
			return panel instanceof HTMLElement ? panel.dataset.experienceInspectorPanel ?? "" : "";
		};
		const cloneCard = (record: BookRecord) => {
			const clone = record.template.content.firstElementChild?.cloneNode(true);
			if (!(clone instanceof HTMLElement)) return null;
			syncCard(clone, stateFor(record.id));
			const isSelected = selectedBookId() === record.id;
			clone.dataset.selected = isSelected ? "true" : "false";
			const trigger = clone.querySelector("[data-experience-card]");
			if (trigger instanceof HTMLElement) {
				trigger.setAttribute("aria-pressed", isSelected ? "true" : "false");
			}
			protectCoverImages(clone);
			return clone;
		};
		const sorted = (items: BookRecord[]) => [...items].sort((left, right) => {
			const leftState = stateFor(left.id);
			const rightState = stateFor(right.id);
			switch (sortMode) {
				case "recently-finished":
					return timestamp(rightState.finishedAt) - timestamp(leftState.finishedAt) || left.title.localeCompare(right.title);
				case "title":
					return left.title.localeCompare(right.title);
				case "author":
					return left.author.localeCompare(right.author) || left.title.localeCompare(right.title);
				case "rating":
					return (rightState.rating ?? 0) - (leftState.rating ?? 0) || left.title.localeCompare(right.title);
				case "publication-year":
					return right.year - left.year || left.title.localeCompare(right.title);
				default:
					return right.added - left.added || left.title.localeCompare(right.title);
			}
		});
		const matchesFilter = (record: BookRecord) => {
			const state = stateFor(record.id);
			const matchesPrimary =
				activeFilter === "all" ? true :
				activeFilter === "five-star" ? state.rating === 5 :
				activeFilter.startsWith("genre:") ? record.genres.includes(activeFilter.slice(6)) :
				state.readingStatus === activeFilter;
			return (
				matchesPrimary &&
				(!activeAuthor || record.author === activeAuthor) &&
				(!activeYear || String(record.year) === activeYear) &&
				(!searchQuery || [record.title, record.author, ...record.genres]
					.some((value) => value.toLocaleLowerCase("en").includes(searchQuery)))
			);
		};
		const recordsForShelf = (shelf: string) => {
			if (shelf === "currently-reading" || shelf === "want-to-read" || shelf === "read") {
				return records.filter((record) => stateFor(record.id).readingStatus === shelf);
			}
			return [];
		};

		const syncInspector = () => {
			protectCoverImages(root);
			for (const panel of root.querySelectorAll("[data-book-state-for]")) {
				if (!(panel instanceof HTMLElement)) continue;
				const state = stateFor(panel.dataset.bookStateFor ?? "");
				const select = panel.querySelector("[data-book-status]");
				if (select instanceof HTMLSelectElement) select.value = state.readingStatus ?? "";
				for (const star of panel.querySelectorAll("[data-book-rating]")) {
					if (!(star instanceof HTMLButtonElement)) continue;
					const rating = Number.parseInt(star.dataset.bookRating ?? "", 10);
					star.setAttribute("aria-pressed", rating <= (state.rating ?? 0) ? "true" : "false");
				}
				const progress = panel.querySelector("[data-book-progress]");
				if (progress instanceof HTMLInputElement) progress.value = String(state.progress ?? 0);
				const progressOutput = panel.querySelector("[data-book-progress-output]");
				if (progressOutput) progressOutput.textContent = `${state.progress ?? 0}%`;
				const pages = panel.querySelector("[data-book-pages]");
				if (pages instanceof HTMLElement) {
					const totalPages = Number.parseInt(pages.dataset.bookTotalPages ?? "", 10);
					pages.textContent = totalPages
						? `${Math.round(totalPages * ((state.progress ?? 0) / 100))} / ${totalPages} pages`
						: "Reading progress";
				}
				const ratingOutput = panel.querySelector("[data-book-rating-output]");
				if (ratingOutput) ratingOutput.textContent = state.rating ? `${state.rating}.0 personal` : "Not rated";
				const favorite = panel.querySelector("[data-book-favorite]");
				if (favorite instanceof HTMLButtonElement) {
					favorite.setAttribute("aria-pressed", state.favorite ? "true" : "false");
					favorite.title = state.favorite ? "Remove from favorites" : "Add to favorites";
				}
			}
		};

		const render = () => {
			root.dataset.booksView = activeView;
			const home = library.querySelector("[data-books-home-view]");
			const catalogue = library.querySelector("[data-books-catalogue]");
			const catalogueNavigation = library.querySelector("[data-books-catalogue-navigation]");
			if (home instanceof HTMLElement) home.hidden = activeView !== "home";
			if (catalogue instanceof HTMLElement) catalogue.hidden = activeView !== "library";
			if (catalogueNavigation instanceof HTMLElement) catalogueNavigation.hidden = activeView !== "library";
			for (const shelf of library.querySelectorAll("[data-book-shelf]")) {
				if (!(shelf instanceof HTMLElement)) continue;
				const shelfId = shelf.dataset.bookShelf ?? "";
				if (activeView !== "home") continue;
				const track = shelf.querySelector("[data-book-shelf-track]");
				if (!(track instanceof HTMLElement)) continue;
				const allMatches = sorted(recordsForShelf(shelfId));
				const trackStyle = getComputedStyle(track);
				const horizontalPadding = (Number.parseFloat(trackStyle.paddingLeft) || 0) + (Number.parseFloat(trackStyle.paddingRight) || 0);
				const availableWidth = Math.max(0, track.clientWidth - horizontalPadding);
				const viewportWidth = window.innerWidth;
				const targetSlotWidth = viewportWidth <= 480 ? 124 : viewportWidth <= 767 ? 132 : viewportWidth <= 1100 ? 145 : 155;
				const inspectorOpen = viewportWidth >= 1280 && root.dataset.inspectorOpen === "true";
				const maximumSlots = inspectorOpen ? 4 : 5;
				const minimumSlotGap = viewportWidth <= 767 ? 16 : 32;
				const slotCount = Math.max(1, Math.min(maximumSlots, Math.floor((availableWidth + minimumSlotGap) / (targetSlotWidth + minimumSlotGap))));
				track.style.setProperty("--book-shelf-slot-count", String(slotCount));
				track.style.setProperty("--book-shelf-slot-width", `${targetSlotWidth}px`);
				const hasOverflow = allMatches.length > slotCount;
				const visibleMatches = allMatches.slice(0, slotCount);
				const shelfChildren = visibleMatches.map(cloneCard).filter((card): card is HTMLElement => Boolean(card));
				const seeAll = shelf.querySelector("[data-book-see-all]");
				if (seeAll instanceof HTMLElement) seeAll.hidden = !hasOverflow;
				track.replaceChildren(...shelfChildren);
				const empty = shelf.querySelector("[data-book-shelf-empty]");
				if (empty instanceof HTMLElement) empty.hidden = allMatches.length > 0;
			}
			if (activeView === "library") {
				const matches = sorted(records.filter(matchesFilter));
				const grid = library.querySelector("[data-books-catalogue-grid]");
				if (grid instanceof HTMLElement) {
					grid.dataset.layout = catalogueLayout;
					const cards = matches.map(cloneCard).filter((card): card is HTMLElement => Boolean(card));
					for (const card of cards) {
						const catalogueCopy = card.querySelector("[data-book-catalogue-copy]");
						if (catalogueCopy instanceof HTMLElement) catalogueCopy.hidden = catalogueLayout !== "list";
					}
					grid.replaceChildren(...cards);
				}
				const empty = library.querySelector("[data-books-catalogue-empty]");
				if (empty instanceof HTMLElement) empty.hidden = matches.length > 0;
				const count = library.querySelector("[data-books-catalogue-count]");
				if (count) count.textContent = `${matches.length} ${matches.length === 1 ? "book" : "books"}`;
				const title = library.querySelector("[data-books-catalogue-title]");
				if (title) title.textContent =
					activeFilter === "all" ? "All Books" :
					activeFilter === "five-star" ? "Five-star Books" :
					activeFilter.startsWith("genre:") ? activeFilter.slice(6) :
					bookReadingStatusLabels[activeFilter as BookReadingStatus] ?? "Library";
			}
			const states = records.map((record) => stateFor(record.id));
			const reading = root.querySelector("[data-books-hero-reading]");
			const finished = root.querySelector("[data-books-hero-finished]");
			const wanted = root.querySelector("[data-books-hero-wanted]");
			const dnf = root.querySelector("[data-books-hero-dnf]");
			const completion = root.querySelector("[data-books-completion]");
			const completionRing = root.querySelector("[data-books-completion-ring]");
			const completionArc = root.querySelector("[data-books-completion-arc]");
			if (reading) reading.textContent = String(states.filter((state) => state.readingStatus === "currently-reading").length);
			const finishedCount = states.filter((state) => state.readingStatus === "read").length;
			if (finished) finished.textContent = String(finishedCount);
			if (wanted) wanted.textContent = String(states.filter((state) => state.readingStatus === "want-to-read").length);
			if (dnf) dnf.textContent = String(states.filter((state) => state.readingStatus === "did-not-finish").length);
			const completionPercentage = records.length > 0 ? Math.round((finishedCount / records.length) * 100) : 0;
			if (completion) animatePercentage(completion, completionPercentage);
			if (completionArc instanceof SVGPathElement) {
				completionArc.style.strokeDasharray = `${completionPercentage} ${100 - completionPercentage}`;
			}
			if (completionRing instanceof SVGElement) {
				const total = Math.max(records.length, 1);
				const readingCount = states.filter((state) => state.readingStatus === "currently-reading").length;
				const wantedCount = states.filter((state) => state.readingStatus === "want-to-read").length;
				const dnfCount = states.filter((state) => state.readingStatus === "did-not-finish").length;
				const segments = [
					["read", (finishedCount / total) * 100],
					["reading", (readingCount / total) * 100],
					["want", (wantedCount / total) * 100],
					["dnf", (dnfCount / total) * 100],
				] as const;
				let offset = 0;
				for (const [name, percentage] of segments) {
					const segment = completionRing.querySelector(`[data-books-ring-segment="${name}"]`);
					if (!(segment instanceof SVGCircleElement)) continue;
					const visiblePercentage = Math.max(0, percentage - (percentage > 1 ? .8 : 0));
					segment.style.strokeDasharray = `${visiblePercentage} ${100 - visiblePercentage}`;
					segment.style.strokeDashoffset = String(-offset);
					segment.style.opacity = percentage > 0 ? "1" : "0";
					offset += percentage;
				}
			}
			syncInspector();
		};

		const savePreferences = () => {
			preferencesStore.set("library", { filter: activeFilter, author: activeAuthor, year: activeYear, sort: sortMode });
		};

		library.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const seeAll = target.closest("[data-book-see-all]");
			if (seeAll instanceof HTMLButtonElement) {
				activeView = "library";
				activeFilter = seeAll.dataset.bookSeeAll ?? "all";
				searchQuery = "";
				const url = new URL(window.location.href);
				url.searchParams.set("view", "library");
				url.searchParams.set("book-status", activeFilter);
				window.history.pushState({}, "", url);
				for (const chip of library.querySelectorAll("[data-book-filter]")) {
					chip.setAttribute("aria-pressed", chip instanceof HTMLButtonElement && chip.dataset.bookFilter === activeFilter ? "true" : "false");
				}
				render();
				library.closest(".experience-notes-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
				return;
			}
			if (target.closest("[data-books-home]")) {
				activeView = "home";
				const url = new URL(window.location.href);
				url.searchParams.delete("view");
				url.searchParams.delete("book-status");
				window.history.pushState({}, "", url);
				render();
				library.closest(".experience-notes-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
				return;
			}
			const filter = target.closest("[data-book-filter]");
			if (filter instanceof HTMLButtonElement) {
				activeFilter = filter.dataset.bookFilter ?? "all";
				const url = new URL(window.location.href);
				url.searchParams.set("view", "library");
				if (activeFilter === "all") url.searchParams.delete("book-status");
				else url.searchParams.set("book-status", activeFilter);
				window.history.replaceState({}, "", url);
				for (const chip of library.querySelectorAll("[data-book-filter]")) {
					chip.setAttribute("aria-pressed", chip === filter ? "true" : "false");
				}
				savePreferences();
				render();
			}
		});
		const sort = library.querySelector("[data-book-sort]");
		if (sort instanceof HTMLSelectElement) {
			sort.value = sortMode;
		}
		sort?.addEventListener("change", () => {
			if (sort instanceof HTMLSelectElement) {
				sortMode = sort.value as SortMode;
				savePreferences();
				render();
			}
		});
		const authorFilter = library.querySelector("[data-book-author-filter]");
		const yearFilter = library.querySelector("[data-book-year-filter]");
		if (authorFilter instanceof HTMLSelectElement) authorFilter.value = activeAuthor;
		if (yearFilter instanceof HTMLSelectElement) yearFilter.value = activeYear;
		authorFilter?.addEventListener("change", () => {
			if (!(authorFilter instanceof HTMLSelectElement)) return;
			activeAuthor = authorFilter.value;
			savePreferences();
			render();
		});
		yearFilter?.addEventListener("change", () => {
			if (!(yearFilter instanceof HTMLSelectElement)) return;
			activeYear = yearFilter.value;
			savePreferences();
			render();
		});
		for (const chip of library.querySelectorAll("[data-book-filter]")) {
			chip.setAttribute("aria-pressed", chip instanceof HTMLButtonElement && chip.dataset.bookFilter === activeFilter ? "true" : "false");
		}
		const search = library.querySelector("[data-book-search]");
		search?.addEventListener("input", () => {
			if (!(search instanceof HTMLInputElement)) return;
			searchQuery = search.value.trim().toLocaleLowerCase("en");
			render();
		});
		for (const layoutButton of library.querySelectorAll("[data-book-layout]")) {
			layoutButton.addEventListener("click", () => {
				if (!(layoutButton instanceof HTMLButtonElement)) return;
				catalogueLayout = layoutButton.dataset.bookLayout === "list" ? "list" : "grid";
				for (const option of library.querySelectorAll("[data-book-layout]")) {
					option.setAttribute("aria-pressed", option === layoutButton ? "true" : "false");
				}
				render();
			});
		}
		root.addEventListener("change", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const panel = target.closest("[data-book-state-for]");
			if (!(panel instanceof HTMLElement)) return;
			const noteId = panel.dataset.bookStateFor ?? "";
			if (!noteId) return;
			if (target.matches("[data-book-status]") && target instanceof HTMLSelectElement) {
				const status = (target.value || null) as BookReadingStatus | null;
				store.set(noteId, transitionBookStatus(stateFor(noteId), status));
			}
			if (target.matches("[data-book-progress]") && target instanceof HTMLInputElement) {
				const progress = Math.max(0, Math.min(100, Number.parseInt(target.value, 10) || 0));
				store.set(noteId, { ...stateFor(noteId), progress });
			}
			render();
		});
		root.addEventListener("input", (event) => {
			const target = event.target;
			if (!(target instanceof HTMLInputElement) || !target.matches("[data-book-progress]")) return;
			const panel = target.closest("[data-book-state-for]");
			const output = panel?.querySelector("[data-book-progress-output]");
			if (output) output.textContent = `${target.value}%`;
			const pages = panel?.querySelector("[data-book-pages]");
			if (pages instanceof HTMLElement) {
				const totalPages = Number.parseInt(pages.dataset.bookTotalPages ?? "", 10);
				if (totalPages) pages.textContent = `${Math.round(totalPages * (Number(target.value) / 100))} / ${totalPages} pages`;
			}
		});
		root.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const panel = target.closest("[data-book-state-for]");
			if (!(panel instanceof HTMLElement)) return;
			const noteId = panel.dataset.bookStateFor ?? "";
			if (!noteId) return;
			const ratingButton = target.closest("[data-book-rating]");
			if (ratingButton instanceof HTMLButtonElement) {
				const rating = Number.parseInt(ratingButton.dataset.bookRating ?? "", 10);
				const current = stateFor(noteId);
				store.set(noteId, { ...current, rating: current.rating === rating ? null : rating });
				render();
				return;
			}
			if (target.closest("[data-book-favorite]")) {
				const current = stateFor(noteId);
				store.set(noteId, { ...current, favorite: !current.favorite });
				render();
			}
		});
		store.subscribe(render);
		window.addEventListener("storage", (event) => {
			if (event.key === "muninn:experience-state:books") render();
		});
		const observer = new MutationObserver(() => {
			syncInspector();
			requestAnimationFrame(render);
		});
		const inspectorPanels = root.querySelector("[data-experience-inspector-panels]");
		if (inspectorPanels) observer.observe(inspectorPanels, { childList: true });
		const inspectorStateObserver = new MutationObserver(() => requestAnimationFrame(render));
		inspectorStateObserver.observe(root, { attributes: true, attributeFilter: ["data-inspector-open"] });
		let resizeRenderPending = false;
		const resizeObserver = new ResizeObserver(() => {
			if (resizeRenderPending) return;
			resizeRenderPending = true;
			requestAnimationFrame(() => {
				resizeRenderPending = false;
				render();
			});
		});
		resizeObserver.observe(library);
		for (const track of library.querySelectorAll("[data-book-shelf-track]")) {
			resizeObserver.observe(track);
		}
		render();
	}
}

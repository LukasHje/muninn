export default function initMediaSliders() {
	const sliders = Array.from(document.querySelectorAll<HTMLElement>("[data-media-slider]")).filter(
		(element) => element.dataset.sliderReady !== "true"
	);

	for (const slider of sliders) {
		const slides = Array.from(slider.querySelectorAll<HTMLElement>("[data-slide]"));
		const prevButton = slider.querySelector<HTMLButtonElement>("[data-slider-prev]");
		const nextButton = slider.querySelector<HTMLButtonElement>("[data-slider-next]");
		const counter = slider.querySelector<HTMLElement>("[data-slider-counter]");
		const thumbnails = Array.from(slider.querySelectorAll<HTMLButtonElement>("[data-slider-thumb]"));

		if (slides.length === 0) {
			continue;
		}

		let currentIndex = 0;

		const update = () => {
			slides.forEach((slide, index) => {
				slide.hidden = index !== currentIndex;
			});

			thumbnails.forEach((thumb, index) => {
				if (index === currentIndex) {
					thumb.dataset.active = "true";
				} else {
					delete thumb.dataset.active;
				}
			});

			if (counter) {
				counter.textContent = `${currentIndex + 1} / ${slides.length}`;
			}
		};

		prevButton?.addEventListener("click", () => {
			currentIndex = (currentIndex - 1 + slides.length) % slides.length;
			update();
		});

		nextButton?.addEventListener("click", () => {
			currentIndex = (currentIndex + 1) % slides.length;
			update();
		});

		thumbnails.forEach((thumb, index) => {
			thumb.addEventListener("click", () => {
				currentIndex = index;
				update();
			});
		});

		slider.dataset.sliderReady = "true";
		update();
	}
}

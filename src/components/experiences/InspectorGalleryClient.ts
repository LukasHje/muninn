// Custom elements also initialize inspectors inserted by the lazy-loading endpoint.
class InspectorGallery extends HTMLElement {
	private index = 0;
	connectedCallback() {
		this.addEventListener("click", this.onClick);
		this.addEventListener("keydown", this.onKeydown);
	}
	disconnectedCallback() {
		this.removeEventListener("click", this.onClick);
		this.removeEventListener("keydown", this.onKeydown);
	}
	private show(index: number) {
		const slides = this.querySelectorAll<HTMLElement>("[data-gallery-slide]");
		if (!slides.length) return;
		this.index = (index + slides.length) % slides.length;
		slides.forEach((slide, i) => { slide.hidden = i !== this.index; });
		this.querySelectorAll("[data-gallery-index]").forEach((dot, i) => {
			dot.setAttribute("aria-current", String(i === this.index));
		});
		const status = this.querySelector("[data-gallery-status]");
		if (status) status.textContent = `Image ${this.index + 1} of ${slides.length}`;
	}
	private onClick = (event: MouseEvent) => {
		const button = (event.target as Element).closest<HTMLElement>("button");
		if (!button) return;
		if (button.dataset.galleryIndex !== undefined) this.show(Number(button.dataset.galleryIndex));
		if (button.dataset.galleryStep) this.show(this.index + Number(button.dataset.galleryStep));
	};
	private onKeydown = (event: KeyboardEvent) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		event.preventDefault();
		event.stopPropagation();
		this.show(this.index + (event.key === "ArrowRight" ? 1 : -1));
	};
}
if (!customElements.get("inspector-gallery")) customElements.define("inspector-gallery", InspectorGallery);

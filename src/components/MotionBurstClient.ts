const resetTimers = new WeakMap<HTMLElement, number>();

export function playMotionBurst(host: HTMLElement) {
	const existingTimer = resetTimers.get(host);
	if (existingTimer) window.clearTimeout(existingTimer);
	delete host.dataset.motionSuccess;
	void host.offsetWidth;
	host.dataset.motionSuccess = "true";
	const timer = window.setTimeout(() => {
		delete host.dataset.motionSuccess;
		resetTimers.delete(host);
	}, 1200);
	resetTimers.set(host, timer);
}

export default function initMotionBurstSystem() {
	if (document.documentElement.dataset.motionBurstReady === "true") return;
	document.documentElement.dataset.motionBurstReady = "true";
	document.addEventListener("muninn:motion-positive", (event) => {
		const source = event.target;
		if (!(source instanceof Element)) return;
		const host = source.closest("[data-motion-positive]");
		if (host instanceof HTMLElement) playMotionBurst(host);
	});
}

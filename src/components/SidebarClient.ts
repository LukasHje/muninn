const VAULT_RELOAD_COOLDOWN_SECONDS = 30;
const VAULT_RELOAD_COOLDOWN_STORAGE_KEY = "muninn:vault-reload-cooldown-until";

let favoriteChangeListenerBound = false;

function bindFavoriteChangeListener() {
	if (favoriteChangeListenerBound) {
		return;
	}

	favoriteChangeListenerBound = true;
	window.addEventListener("muninn:favorite-change", (event) => {
		const count = (event as CustomEvent).detail?.favoritesCount;
		if (typeof count !== "number") {
			return;
		}

		document.querySelectorAll("[data-sidebar-favorites-count]").forEach((element) => {
			element.textContent = String(count);
		});
	});
}

function getStoredCooldownEnd() {
	const value = Number.parseInt(sessionStorage.getItem(VAULT_RELOAD_COOLDOWN_STORAGE_KEY) ?? "", 10);
	return Number.isFinite(value) ? value : 0;
}

function initializeVaultReloadButton(button: HTMLElement) {
	if (!(button instanceof HTMLButtonElement) || button.dataset.vaultReloadReady === "true") {
		return;
	}

	const countdown = button.querySelector<HTMLElement>("[data-vault-reload-countdown]");
	const status = document.querySelector<HTMLElement>("[data-vault-reload-status]");
	if (!countdown || !status) {
		return;
	}

	button.dataset.vaultReloadReady = "true";

	const endpoint = button.dataset.vaultReloadEndpoint ?? "/api/admin/reload-vault";
	const idleLabel = button.dataset.vaultReloadIdleLabel ?? "Reload Vault";
	const runningLabel = button.dataset.vaultReloadRunningLabel ?? "Reloading vault...";
	const successLabel =
		button.dataset.vaultReloadSuccessLabel ??
		"Vault cache invalidated. Changes will appear on the next page load.";
	const errorLabel = button.dataset.vaultReloadErrorLabel ?? "Failed to reload vault.";

	let requestPending = false;
	let timer: number | null = null;

	const setStatus = (state: "idle" | "running" | "success" | "error", message = "") => {
		status.dataset.state = state;
		status.textContent = message;
		status.hidden = !message;
	};

	const renderCooldown = () => {
		const remaining = Math.max(0, Math.ceil((getStoredCooldownEnd() - Date.now()) / 1000));
		const coolingDown = remaining > 0 || requestPending;

		button.disabled = coolingDown;
		button.dataset.cooldown = coolingDown ? "true" : "false";
		countdown.hidden = !coolingDown;
		countdown.textContent = `${remaining}s`;

		if (!coolingDown) {
			sessionStorage.removeItem(VAULT_RELOAD_COOLDOWN_STORAGE_KEY);
			button.title = idleLabel;
			button.setAttribute("aria-label", idleLabel);
			setStatus("idle");
			if (timer !== null) {
				window.clearInterval(timer);
				timer = null;
			}
		}
	};

	const startCooldownTimer = () => {
		renderCooldown();
		if (timer === null) {
			timer = window.setInterval(renderCooldown, 1000);
		}
	};

	button.addEventListener("click", async () => {
		if (button.disabled || requestPending) {
			return;
		}

		requestPending = true;
		sessionStorage.setItem(
			VAULT_RELOAD_COOLDOWN_STORAGE_KEY,
			String(Date.now() + VAULT_RELOAD_COOLDOWN_SECONDS * 1000)
		);
		button.title = runningLabel;
		button.setAttribute("aria-label", runningLabel);
		setStatus("running", runningLabel);
		startCooldownTimer();

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { Accept: "application/json" },
			});
			const payload = await response.json();
			if (!response.ok || payload?.success !== true) {
				throw new Error(`Vault reload failed (${response.status})`);
			}

			setStatus("success", successLabel);
		} catch (error) {
			console.error(error);
			setStatus("error", errorLabel);
		} finally {
			requestPending = false;
			button.title = idleLabel;
			button.setAttribute("aria-label", idleLabel);
			renderCooldown();
		}
	});

	if (getStoredCooldownEnd() > Date.now()) {
		startCooldownTimer();
	} else {
		renderCooldown();
	}
}

export default function initSidebarControls() {
	bindFavoriteChangeListener();
	document.querySelectorAll<HTMLElement>("[data-vault-reload]").forEach(initializeVaultReloadButton);
}

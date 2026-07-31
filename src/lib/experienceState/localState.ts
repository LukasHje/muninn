export interface StorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

interface StateEnvelope<T> {
	version: number;
	items: Record<string, T>;
}

export interface ExperienceLocalStateOptions<T extends { updatedAt: string }> {
	namespace: string;
	version: number;
	storage: StorageAdapter;
	isValid: (value: unknown) => value is T;
	now?: () => string;
}

export interface ExperienceLocalState<T extends { updatedAt: string }> {
	get(id: string): T | null;
	list(): Record<string, T>;
	set(id: string, value: Omit<T, "updatedAt"> & { updatedAt?: string }): T;
	update(id: string, updater: (current: T | null) => Omit<T, "updatedAt"> | T | null): T | null;
	remove(id: string): void;
	subscribe(listener: () => void): () => void;
}

export function createExperienceLocalState<T extends { updatedAt: string }>(
	options: ExperienceLocalStateOptions<T>
): ExperienceLocalState<T> {
	const key = `muninn:experience-state:${options.namespace}`;
	const now = options.now ?? (() => new Date().toISOString());
	const listeners = new Set<() => void>();

	function read(): StateEnvelope<T> {
		const raw = options.storage.getItem(key);
		if (!raw) {
			return { version: options.version, items: {} };
		}

		try {
			const parsed = JSON.parse(raw) as Partial<StateEnvelope<unknown>>;
			if (
				parsed.version !== options.version ||
				!parsed.items ||
				typeof parsed.items !== "object" ||
				Array.isArray(parsed.items)
			) {
				return { version: options.version, items: {} };
			}

			return {
				version: options.version,
				items: Object.fromEntries(
					Object.entries(parsed.items).filter((entry): entry is [string, T] =>
						Boolean(entry[0]) && options.isValid(entry[1])
					)
				),
			};
		} catch {
			return { version: options.version, items: {} };
		}
	}

	function write(envelope: StateEnvelope<T>) {
		options.storage.setItem(key, JSON.stringify(envelope));
		for (const listener of listeners) {
			listener();
		}
	}

	return {
		get(id) {
			return read().items[id] ?? null;
		},
		list() {
			return { ...read().items };
		},
		set(id, value) {
			const envelope = read();
			const next = { ...value, updatedAt: now() } as T;
			write({ ...envelope, items: { ...envelope.items, [id]: next } });
			return next;
		},
		update(id, updater) {
			const envelope = read();
			const value = updater(envelope.items[id] ?? null);
			if (value === null) {
				if (!(id in envelope.items)) {
					return null;
				}
				const { [id]: _, ...remaining } = envelope.items;
				write({ ...envelope, items: remaining });
				return null;
			}

			const next = { ...value, updatedAt: now() } as T;
			write({ ...envelope, items: { ...envelope.items, [id]: next } });
			return next;
		},
		remove(id) {
			const envelope = read();
			if (!(id in envelope.items)) {
				return;
			}
			const { [id]: _, ...remaining } = envelope.items;
			write({ ...envelope, items: remaining });
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export function getBrowserStorage(): StorageAdapter | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		const probe = "muninn:experience-state:probe";
		window.localStorage.setItem(probe, "1");
		window.localStorage.removeItem(probe);
		return window.localStorage;
	} catch {
		return null;
	}
}

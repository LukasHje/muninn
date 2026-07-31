import assert from "node:assert/strict";
import test from "node:test";
import {
	createExperienceLocalState,
	type StorageAdapter,
} from "./experienceState/localState";
import {
	emptyBookState,
	isBookState,
	transitionBookStatus,
} from "./experienceState/books";

class MemoryStorage implements StorageAdapter {
	values = new Map<string, string>();
	getItem(key: string) {
		return this.values.get(key) ?? null;
	}
	setItem(key: string, value: string) {
		this.values.set(key, value);
	}
	removeItem(key: string) {
		this.values.delete(key);
	}
}

interface TestState {
	value: string;
	updatedAt: string;
}

function isTestState(value: unknown): value is TestState {
	return Boolean(
		value &&
		typeof value === "object" &&
		typeof (value as TestState).value === "string" &&
		typeof (value as TestState).updatedAt === "string"
	);
}

test("local Experience State is namespaced, timestamped, and immutable", () => {
	const storage = new MemoryStorage();
	const store = createExperienceLocalState<TestState>({
		namespace: "test",
		version: 1,
		storage,
		isValid: isTestState,
		now: () => "2026-07-31T12:00:00.000Z",
	});

	const saved = store.set("note", { value: "reading" });
	assert.deepEqual(saved, {
		value: "reading",
		updatedAt: "2026-07-31T12:00:00.000Z",
	});
	assert.notEqual(store.list(), store.list());
	assert.deepEqual(store.get("note"), saved);
});

test("local Experience State rejects invalid and incompatible persisted data", () => {
	const storage = new MemoryStorage();
	storage.setItem(
		"muninn:experience-state:test",
		JSON.stringify({
			version: 1,
			items: {
				valid: { value: "read", updatedAt: "now" },
				invalid: { value: 42, updatedAt: "now" },
			},
		})
	);

	const store = createExperienceLocalState<TestState>({
		namespace: "test",
		version: 1,
		storage,
		isValid: isTestState,
	});
	assert.deepEqual(Object.keys(store.list()), ["valid"]);

	const incompatible = createExperienceLocalState<TestState>({
		namespace: "test",
		version: 2,
		storage,
		isValid: isTestState,
	});
	assert.deepEqual(incompatible.list(), {});
});

test("local Experience State updates, removes, and notifies subscribers", () => {
	const storage = new MemoryStorage();
	const store = createExperienceLocalState<TestState>({
		namespace: "test",
		version: 1,
		storage,
		isValid: isTestState,
		now: () => "later",
	});
	let notifications = 0;
	const unsubscribe = store.subscribe(() => notifications++);

	store.set("note", { value: "queued" });
	store.update("note", (current) => ({ value: `${current?.value}:read` }));
	assert.equal(store.get("note")?.value, "queued:read");
	store.remove("note");
	assert.equal(store.get("note"), null);
	assert.equal(notifications, 3);

	unsubscribe();
	store.set("another", { value: "quiet" });
	assert.equal(notifications, 3);
});

test("Book State transitions set reading dates without touching note data", () => {
	const initial = emptyBookState("book");
	const reading = transitionBookStatus(initial, "currently-reading", "2026-01-01");
	assert.equal(reading.startedAt, "2026-01-01");
	assert.equal(reading.finishedAt, null);

	const finished = transitionBookStatus(reading, "read", "2026-01-10");
	assert.equal(finished.startedAt, "2026-01-01");
	assert.equal(finished.finishedAt, "2026-01-10");
	assert.equal(finished.readingStatus, "read");
});

test("Book State validation rejects out-of-range ratings and progress", () => {
	const state = emptyBookState("book");
	assert.equal(isBookState({ ...state, rating: 5, progress: 75 }), true);
	assert.equal(isBookState({ ...state, rating: 6 }), false);
	assert.equal(isBookState({ ...state, progress: 101 }), false);
});

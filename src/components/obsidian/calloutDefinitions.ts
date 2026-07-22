export type CalloutKind =
	| "note"
	| "abstract"
	| "info"
	| "todo"
	| "tip"
	| "success"
	| "question"
	| "warning"
	| "failure"
	| "danger"
	| "bug"
	| "example"
	| "quote";

export interface CalloutAppearance {
	kind: CalloutKind;
	icon: string;
	tone: string;
}

const calloutAliases: Readonly<Record<string, CalloutKind>> = {
	note: "note",
	abstract: "abstract",
	summary: "abstract",
	tldr: "abstract",
	info: "info",
	todo: "todo",
	tip: "tip",
	hint: "tip",
	important: "tip",
	success: "success",
	check: "success",
	done: "success",
	question: "question",
	help: "question",
	faq: "question",
	warning: "warning",
	caution: "warning",
	attention: "warning",
	failure: "failure",
	fail: "failure",
	missing: "failure",
	danger: "danger",
	error: "danger",
	bug: "bug",
	example: "example",
	quote: "quote",
	cite: "quote",
};

const calloutAppearances: Readonly<Record<CalloutKind, CalloutAppearance>> = {
	note: {
		kind: "note",
		icon: "notebook-pen",
		tone: "obsidian-callout--note",
	},
	abstract: {
		kind: "abstract",
		icon: "clipboard-list",
		tone: "obsidian-callout--abstract",
	},
	info: {
		kind: "info",
		icon: "info",
		tone: "obsidian-callout--info",
	},
	todo: {
		kind: "todo",
		icon: "circle-check",
		tone: "obsidian-callout--todo",
	},
	tip: {
		kind: "tip",
		icon: "flame",
		tone: "obsidian-callout--tip",
	},
	success: {
		kind: "success",
		icon: "check",
		tone: "obsidian-callout--success",
	},
	question: {
		kind: "question",
		icon: "circle-help",
		tone: "obsidian-callout--question",
	},
	warning: {
		kind: "warning",
		icon: "triangle-alert",
		tone: "obsidian-callout--warning",
	},
	failure: {
		kind: "failure",
		icon: "x",
		tone: "obsidian-callout--failure",
	},
	danger: {
		kind: "danger",
		icon: "zap",
		tone: "obsidian-callout--danger",
	},
	bug: {
		kind: "bug",
		icon: "bug",
		tone: "obsidian-callout--bug",
	},
	example: {
		kind: "example",
		icon: "list",
		tone: "obsidian-callout--example",
	},
	quote: {
		kind: "quote",
		icon: "quote",
		tone: "obsidian-callout--quote",
	},
};

export function getCalloutAppearance(type: string): CalloutAppearance {
	const normalizedType = type.trim().toLowerCase();
	const kind = calloutAliases[normalizedType] ?? "note";
	return calloutAppearances[kind];
}

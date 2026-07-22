import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { parse } from "yaml";
import { ui } from "src/i18n";
import { RESOLVED_VAULT_PATH } from "src/lib/config";
import type { LibraryItem } from "src/lib/vault";

export type DataviewJsCell =
	| { kind: "link"; href: string; label: string; text?: string }
	| { kind: "html"; html: string }
	| { kind: "text"; value: string }
	| { kind: "date"; timestamp: number }
	| { kind: "empty" };

export interface DataviewJsTableBlock {
	type: "table";
	columns: string[];
	rows: DataviewJsCell[][];
}

export interface DataviewJsListBlock {
	type: "list";
	items: DataviewJsCell[];
}

export interface DataviewJsMarkdownBlock {
	type: "markdown";
	markdown: string;
}

export type DataviewJsBlock = DataviewJsTableBlock | DataviewJsListBlock | DataviewJsMarkdownBlock;

export interface DataviewJsSuccessResult {
	type: "blocks";
	blocks: DataviewJsBlock[];
}

export interface DataviewJsErrorResult {
	type: "error";
	code: string;
	reason: string;
}

export type DataviewJsExecutionResult = DataviewJsSuccessResult | DataviewJsErrorResult;

type StructuredFrontmatter = Record<string, unknown>;

interface VaultFileNode {
	type: "file";
	path: string;
	name: string;
	extension: string;
	children?: never;
}

interface VaultFolderNode {
	type: "folder";
	path: string;
	name: string;
	children: Array<VaultFileNode | VaultFolderNode>;
}

type VaultNode = VaultFileNode | VaultFolderNode;

class MuninnDate {
	private readonly date: Date;

	constructor(value: string | number | Date) {
		this.date = value instanceof Date ? value : new Date(value);
	}

	valueOf() {
		return this.date.getTime();
	}

	toJSDate() {
		return new Date(this.date);
	}

	toFormat(format: string) {
		const yyyy = this.date.getFullYear();
		const mm = `${this.date.getMonth() + 1}`.padStart(2, "0");
		const dd = `${this.date.getDate()}`.padStart(2, "0");

		return format
			.replace(/yyyy/g, `${yyyy}`)
			.replace(/MM/g, mm)
			.replace(/dd/g, dd);
	}

	toString() {
		return this.date.toISOString();
	}
}

class DataArray<T> extends Array<T> {
	static fromValues<TValue>(values: TValue[]) {
		const array = new DataArray<TValue>();
		array.push(...values);
		return array;
	}

	array() {
		return Array.from(this);
	}

	where(predicate: (value: T, index: number) => boolean) {
		return DataArray.fromValues(this.filter(predicate));
	}

	filter(predicate: (value: T, index: number, array: T[]) => unknown) {
		return DataArray.fromValues(Array.from(this).filter(predicate));
	}

	map<TResult>(callback: (value: T, index: number, array: T[]) => TResult) {
		return DataArray.fromValues(Array.from(this).map(callback));
	}

	sort(
		compareFn?: ((left: T, right: T) => number) | ((value: T) => unknown),
		direction: "asc" | "desc" = "asc"
	): this {
		if (!compareFn) {
			return DataArray.fromValues(Array.from(this).sort()) as this;
		}

		if (compareFn.length >= 2) {
			return DataArray.fromValues(
				Array.from(this).sort(compareFn as (left: T, right: T) => number)
			) as this;
		}

		const selector = compareFn as (value: T) => unknown;
		const multiplier = direction === "desc" ? -1 : 1;

		return DataArray.fromValues(
			Array.from(this).sort((left, right) => compareDataviewValues(selector(left), selector(right)) * multiplier)
		) as this;
	}
}

function compareDataviewValues(left: unknown, right: unknown) {
	if (left == null && right == null) {
		return 0;
	}

	if (left == null) {
		return 1;
	}

	if (right == null) {
		return -1;
	}

	if (left instanceof MuninnDate || right instanceof MuninnDate) {
		return Number(left) - Number(right);
	}

	if (typeof left === "number" && typeof right === "number") {
		return left - right;
	}

	return String(left).localeCompare(String(right), "sv");
}

function normalizePath(value: string) {
	return value.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function normalizeDataviewJsCode(code: string) {
	const lines = code.split("\n");
	const nonEmptyLines = lines.filter((line) => line.trim());

	if (nonEmptyLines.length > 0 && nonEmptyLines.every((line) => /^\s*>\s?/.test(line))) {
		return lines.map((line) => line.replace(/^\s*>\s?/, "")).join("\n").trim();
	}

	return lines
		.filter((line) => !/^\s*>\s*$/.test(line))
		.join("\n")
		.trim();
}

function stripQuotedPath(value?: string | null) {
	if (!value) {
		return "";
	}

	return value.trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
}

function extractFrontmatterBlock(raw: string) {
	if (!raw.startsWith("---\n")) {
		return null;
	}

	const endIndex = raw.indexOf("\n---\n", 4);
	if (endIndex === -1) {
		return null;
	}

	return raw.slice(4, endIndex);
}

function isDateLikeString(value: string) {
	return /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(value.trim());
}

function isDateFieldKey(key?: string) {
	return Boolean(key && /(date|_eol|^created$|^updated$|_at$)/i.test(key));
}

function isUnknownDateValue(value: string) {
	return /^(unknown|n\/a|na|none|null|-)?$/i.test(value.trim());
}

function coerceValue(value: unknown, key?: string): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => coerceValue(entry, key));
	}

	if (value instanceof Date) {
		return new MuninnDate(value);
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([entryKey, entry]) => [entryKey, coerceValue(entry, entryKey)])
		);
	}

	if (typeof value === "string" && isDateFieldKey(key) && isUnknownDateValue(value)) {
		return null;
	}

	if (typeof value === "string" && isDateLikeString(value)) {
		return new MuninnDate(value);
	}

	return value;
}

function toCell(value: unknown): DataviewJsCell {
	if (value == null) {
		return { kind: "empty" };
	}

	if (typeof value === "object" && value && "kind" in (value as Record<string, unknown>)) {
		return value as DataviewJsCell;
	}

	if (value instanceof MuninnDate) {
		return { kind: "date", timestamp: value.valueOf() };
	}

	if (typeof value === "string") {
		if (/<[A-Za-z][\s\S]*>/.test(value)) {
			return { kind: "html", html: value };
		}
		return { kind: "text", value };
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return { kind: "text", value: String(value) };
	}

	if (Array.isArray(value)) {
		return { kind: "text", value: value.map((entry) => String(entry)).join(", ") };
	}

	return { kind: "text", value: String(value) };
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) {
			return message;
		}
	}

	return String(error || ui.dataview.jsUnknownError);
}

async function getStructuredFrontmatter(note: LibraryItem) {
	const filePath = path.join(RESOLVED_VAULT_PATH, note.relativePath);
	const raw = await readFile(filePath, "utf8");
	const block = extractFrontmatterBlock(raw);
	if (!block) {
		return {} as StructuredFrontmatter;
	}

	const parsed = parse(block);
	return (parsed && typeof parsed === "object" ? parsed : {}) as StructuredFrontmatter;
}

async function buildStructuredPages(allNotes: LibraryItem[]) {
	const structuredEntries = await Promise.all(
		allNotes.map(async (note) => [note.id, await getStructuredFrontmatter(note)] as const)
	);

	const structuredMap = new Map<string, StructuredFrontmatter>(structuredEntries);

	const pages = allNotes.map((note) => {
		const structured = structuredMap.get(note.id) ?? {};
		const fileName = path.basename(note.relativePath, path.extname(note.relativePath));
		const folder = path.posix.dirname(note.relativePath) === "." ? "" : path.posix.dirname(note.relativePath);

		return {
			...Object.fromEntries(
				Object.entries(structured).map(([key, value]) => [key, coerceValue(value, key)])
			),
			file: {
				name: fileName,
				path: note.relativePath,
				folder,
				link: { kind: "link", href: note.href, label: note.title, text: note.title },
				ctime: new MuninnDate(note.createdAt),
				mtime: new MuninnDate(note.updatedAt),
			},
			title: note.title,
		};
	});

	return { pages, structuredMap };
}

function buildVaultTree(notes: LibraryItem[]) {
	const root: VaultFolderNode = { type: "folder", path: "", name: "", children: [] };
	const pathIndex = new Map<string, VaultNode>([["", root]]);

	for (const note of notes) {
		const segments = note.relativePath.split("/");
		let current = root;
		let currentPath = "";

		for (let index = 0; index < segments.length; index += 1) {
			const segment = segments[index];
			currentPath = currentPath ? `${currentPath}/${segment}` : segment;
			const isFile = index === segments.length - 1;
			const existing = pathIndex.get(currentPath);

			if (existing) {
				if (existing.type === "folder") {
					current = existing;
				}
				continue;
			}

			if (isFile) {
				const fileNode: VaultFileNode = {
					type: "file",
					path: currentPath,
					name: segment,
					extension: path.extname(segment).replace(/^\./, ""),
				};
				current.children.push(fileNode);
				pathIndex.set(currentPath, fileNode);
			} else {
				const folderNode: VaultFolderNode = {
					type: "folder",
					path: currentPath,
					name: segment,
					children: [],
				};
				current.children.push(folderNode);
				pathIndex.set(currentPath, folderNode);
				current = folderNode;
			}
		}
	}

	return pathIndex;
}

function createPageLookup(pages: Record<string, unknown>[], allNotes: LibraryItem[]) {
	const byPath = new Map<string, Record<string, unknown>>();
	const byName = new Map<string, Record<string, unknown>>();
	const byTitle = new Map<string, Record<string, unknown>>();

	for (let index = 0; index < allNotes.length; index += 1) {
		const note = allNotes[index];
		const page = pages[index];
		const basename = path.basename(note.relativePath, path.extname(note.relativePath)).toLowerCase();

		byPath.set(note.relativePath.toLowerCase(), page);
		byPath.set(note.relativePath.replace(/\.md$/i, "").toLowerCase(), page);
		if (!byName.has(basename)) {
			byName.set(basename, page);
		}
		if (!byTitle.has(note.title.toLowerCase())) {
			byTitle.set(note.title.toLowerCase(), page);
		}
	}

	return { byPath, byName, byTitle };
}

export async function executeDataviewJs(
	code: string,
	allNotes: LibraryItem[],
	currentNote: LibraryItem
): Promise<DataviewJsExecutionResult> {
	try {
		const normalizedCode = normalizeDataviewJsCode(code);
		const { pages } = await buildStructuredPages(allNotes);
		const pageLookup = createPageLookup(pages, allNotes);
		const notesByPath = new Map(allNotes.map((note) => [note.relativePath.toLowerCase(), note]));
		const vaultTree = buildVaultTree(allNotes);
		const blocks: DataviewJsBlock[] = [];
		let inlineBuffer = "";

		const flushInline = () => {
			if (!inlineBuffer.trim()) {
				inlineBuffer = "";
				return;
			}

			blocks.push({
				type: "markdown",
				markdown: inlineBuffer.trim(),
			});
			inlineBuffer = "";
		};

		const findCurrentPage = () => {
			const match = pages.find((page) => (page.file as { path: string }).path === currentNote.relativePath);
			return match ?? null;
		};

		const findPage = (value: string) => {
			const normalized = normalizePath(stripQuotedPath(value)).toLowerCase();
			return (
				pageLookup.byPath.get(normalized) ??
				pageLookup.byName.get(path.basename(normalized).toLowerCase()) ??
				pageLookup.byTitle.get(stripQuotedPath(value).toLowerCase()) ??
				null
			);
		};

		const dv = {
			current() {
				return findCurrentPage();
			},
			pages(query?: string) {
				if (!query) {
					return DataArray.fromValues(pages);
				}

				const folderPath = normalizePath(stripQuotedPath(query));
				return DataArray.fromValues(
					pages.filter((page) => {
						const filePath = (page.file as { path: string }).path;
						return filePath === folderPath || filePath.startsWith(`${folderPath}/`);
					})
				);
			},
			page(target: string) {
				return findPage(target);
			},
			fileLink(filePath: string, _embed = false, display?: string) {
				const note = notesByPath.get(normalizePath(filePath).toLowerCase());
				if (!note) {
					return {
						kind: "text",
						value: display || filePath,
						text: display || filePath,
					};
				}

				return {
					kind: "link",
					href: note.href,
					label: display || note.title,
					text: display || note.title,
				};
			},
			paragraph(value: unknown) {
				flushInline();
				blocks.push({
					type: "markdown",
					markdown: String(value ?? ""),
				});
			},
			header(level: number, value: unknown) {
				flushInline();
				const normalizedLevel = Math.min(Math.max(Number(level) || 1, 1), 6);
				blocks.push({
					type: "markdown",
					markdown: `<h${normalizedLevel}>${String(value ?? "")}</h${normalizedLevel}>`,
				});
			},
			span(value: unknown) {
				inlineBuffer += String(value ?? "");
			},
			el(tag: string, value?: unknown) {
				if (tag === "br") {
					inlineBuffer += "<br>";
					return;
				}

				flushInline();
				if (tag === "div") {
					blocks.push({
						type: "markdown",
						markdown: String(value ?? ""),
					});
					return;
				}

				blocks.push({
					type: "markdown",
					markdown: `<${tag}>${String(value ?? "")}</${tag}>`,
				});
			},
			table(columns: unknown[], rows: unknown[][]) {
				flushInline();
				blocks.push({
					type: "table",
					columns: columns.map((column) => String(column ?? "")),
					rows: rows.map((row) => row.map((cell) => toCell(cell))),
				});
			},
			list(items: unknown[]) {
				flushInline();
				blocks.push({
					type: "list",
					items: items.map((item) => toCell(item)),
				});
			},
			date(value: unknown) {
				if (value instanceof MuninnDate) {
					return value;
				}
				if (value == null || value === "") {
					return null;
				}
				return new MuninnDate(value as string | number | Date);
			},
		};

		const app = {
			vault: {
				getAbstractFileByPath(targetPath: string) {
					const normalized = normalizePath(targetPath);
					return vaultTree.get(normalized) ?? null;
				},
				async read(file: VaultNode | null) {
					if (!file || file.type !== "file") {
						return "";
					}
					const note = notesByPath.get(file.path.toLowerCase());
					return note?.content ?? "";
				},
			},
		};

		const context = vm.createContext({
			dv,
			app,
			console: {
				log: () => undefined,
				error: () => undefined,
				warn: () => undefined,
			},
			Date,
			Math,
			Number,
			String,
			Boolean,
			Array,
			Object,
			JSON,
			RegExp,
			Set,
			Map,
		});

		const wrappedCode = `(async () => {\n${normalizedCode}\n})()`;
		const script = new vm.Script(wrappedCode, { filename: `${currentNote.relativePath}::dataviewjs` });
		const execution = script.runInContext(context, { timeout: 1000 }) as Promise<unknown>;

		await Promise.race([
			execution,
			new Promise((_, reject) => {
				setTimeout(() => reject(new Error(ui.dataview.jsTimedOut)), 1200);
			}),
		]);

		flushInline();

		return {
			type: "blocks",
			blocks,
		};
	} catch (error) {
		return {
			type: "error",
			code: normalizeDataviewJsCode(code),
			reason: getErrorMessage(error),
		};
	}
}

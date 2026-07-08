import path from "node:path";
import { ui } from "src/i18n";
import type { LibraryItem } from "src/lib/vault";

export type DataviewLiteCell =
	| { kind: "link"; href: string; label: string }
	| { kind: "date"; timestamp: number }
	| { kind: "tags"; values: string[] }
	| { kind: "text"; value: string }
	| { kind: "empty" };

export interface DataviewLiteColumn {
	label: string;
	field: string;
}

export interface DataviewLiteTableResult {
	type: "table";
	columns: DataviewLiteColumn[];
	rows: DataviewLiteCell[][];
}

export interface DataviewLiteListResult {
	type: "list";
	items: DataviewLiteCell[];
}

export interface DataviewLiteUnsupportedResult {
	type: "unsupported";
	query: string;
	reason: string;
}

export type DataviewLiteResult =
	| DataviewLiteTableResult
	| DataviewLiteListResult
	| DataviewLiteUnsupportedResult;

interface ParsedColumn {
	field: string;
	label: string;
}

interface ParsedSortRule {
	field: string;
	direction: "asc" | "desc";
}

interface ResolvedField {
	raw: string | string[] | number | null;
	cell: DataviewLiteCell;
}

const supportedFieldSet = new Set([
	"file.link",
	"file.name",
	"file.path",
	"file.mtime",
	"file.ctime",
	"title",
	"tags",
	"type",
	"status",
	"country",
	"continent",
	"travel-type",
	'file.frontmatter["travel-type"]',
]);

function basenameWithoutExtension(relativePath: string) {
	return path.basename(relativePath, path.extname(relativePath));
}

function normalizeFieldName(field: string) {
	return field.trim().replace(/\s+/g, " ").toLowerCase();
}

function splitCommaSeparated(value: string) {
	const parts: string[] = [];
	let current = "";
	let inQuotes = false;

	for (const character of value) {
		if (character === '"') {
			inQuotes = !inQuotes;
			current += character;
			continue;
		}

		if (character === "," && !inQuotes) {
			parts.push(current.trim());
			current = "";
			continue;
		}

		current += character;
	}

	if (current.trim()) {
		parts.push(current.trim());
	}

	return parts;
}

function splitConditions(value: string) {
	const parts: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		if (character === '"') {
			inQuotes = !inQuotes;
			current += character;
			continue;
		}

		if (!inQuotes && value.slice(index, index + 5).toLowerCase() === " and ") {
			parts.push(current.trim());
			current = "";
			index += 4;
			continue;
		}

		current += character;
	}

	if (current.trim()) {
		parts.push(current.trim());
	}

	return parts;
}

function normalizeComparisonValue(value: string | number | string[] | null) {
	if (Array.isArray(value)) {
		return value.join(" ").toLocaleLowerCase("sv-SE");
	}
	if (typeof value === "number") {
		return value;
	}
	return value?.toLocaleLowerCase("sv-SE") ?? "";
}

function compareValues(left: string | number | string[] | null, right: string | number | string[] | null) {
	const normalizedLeft = normalizeComparisonValue(left);
	const normalizedRight = normalizeComparisonValue(right);

	if (typeof normalizedLeft === "number" || typeof normalizedRight === "number") {
		const leftNumber = typeof normalizedLeft === "number" ? normalizedLeft : Number.NaN;
		const rightNumber = typeof normalizedRight === "number" ? normalizedRight : Number.NaN;
		if (Number.isNaN(leftNumber) && Number.isNaN(rightNumber)) {
			return 0;
		}
		if (Number.isNaN(leftNumber)) {
			return 1;
		}
		if (Number.isNaN(rightNumber)) {
			return -1;
		}
		return leftNumber - rightNumber;
	}

	return String(normalizedLeft).localeCompare(String(normalizedRight), "sv");
}

function readMetadata(note: LibraryItem, key: string) {
	const metadataValue = note.normalized.metadata[key];
	if (Array.isArray(metadataValue)) {
		return metadataValue.filter(Boolean);
	}
	if (typeof metadataValue === "string") {
		return metadataValue;
	}

	const frontmatterValue = note.frontmatter[key];
	if (Array.isArray(frontmatterValue)) {
		return frontmatterValue.filter(Boolean);
	}
	if (typeof frontmatterValue === "string") {
		return frontmatterValue;
	}

	return null;
}

function resolveField(note: LibraryItem, field: string): ResolvedField | null {
	const normalizedField = normalizeFieldName(field);

	switch (normalizedField) {
		case "file.link":
			return {
				raw: note.title,
				cell: { kind: "link", href: note.href, label: note.title },
			};
		case "file.name": {
			const filename = basenameWithoutExtension(note.relativePath);
			return {
				raw: filename,
				cell: { kind: "text", value: filename },
			};
		}
		case "file.path":
			return {
				raw: note.relativePath,
				cell: { kind: "text", value: note.relativePath },
			};
		case "file.mtime":
			return {
				raw: note.updatedAt,
				cell: { kind: "date", timestamp: note.updatedAt },
			};
		case "file.ctime":
			return {
				raw: note.createdAt,
				cell: { kind: "date", timestamp: note.createdAt },
			};
		case "title":
			return {
				raw: note.title,
				cell: { kind: "text", value: note.title },
			};
		case "tags":
			return {
				raw: note.tags,
				cell: note.tags.length > 0 ? { kind: "tags", values: note.tags } : { kind: "empty" },
			};
		case "type":
			return {
				raw: note.normalized.type,
				cell: { kind: "text", value: note.normalized.type },
			};
		case "status":
		case "country":
		case "continent":
		case "travel-type":
		case 'file.frontmatter["travel-type"]': {
			const metadataKey =
				normalizedField === 'file.frontmatter["travel-type"]' ? "travel-type" : normalizedField;
			const value = readMetadata(note, metadataKey);
			if (Array.isArray(value)) {
				return {
					raw: value,
					cell: value.length > 0 ? { kind: "tags", values: value } : { kind: "empty" },
				};
			}
			if (typeof value === "string" && value.trim()) {
				return {
					raw: value,
					cell: { kind: "text", value },
				};
			}
			return { raw: null, cell: { kind: "empty" } };
		}
		default:
			return null;
	}
}

function parseColumn(expression: string): ParsedColumn | null {
	const match = expression.match(/^(.*?)\s+as\s+"([^"]+)"$/i);
	if (match) {
		const field = match[1].trim();
		if (!supportedFieldSet.has(normalizeFieldName(field))) {
			return null;
		}
		return { field, label: match[2].trim() };
	}

	const field = expression.trim();
	if (!supportedFieldSet.has(normalizeFieldName(field))) {
		return null;
	}
	return { field, label: field };
}

function parseSortRules(input: string) {
	const rules = splitCommaSeparated(input)
		.map((part) => {
			const match = part.match(/^(.*?)(?:\s+(asc|desc))?$/i);
			if (!match) {
				return null;
			}

			const field = match[1].trim();
			if (!supportedFieldSet.has(normalizeFieldName(field))) {
				return null;
			}

			return {
				field,
				direction: (match[2]?.toLowerCase() === "desc" ? "desc" : "asc") as "asc" | "desc",
			};
		})
		.filter(Boolean) as ParsedSortRule[];

	return rules.length > 0 ? rules : null;
}

function buildPredicate(condition: string) {
	const containsMatch = condition.match(/^(!)?contains\((.*?),(.*)\)$/i);
	if (containsMatch) {
		const negate = containsMatch[1] === "!";
		const field = containsMatch[2].trim();
		const queryValue = containsMatch[3].trim().replace(/^"|"$/g, "");

		if (!supportedFieldSet.has(normalizeFieldName(field))) {
			return null;
		}

		return (note: LibraryItem) => {
			const resolved = resolveField(note, field);
			const haystack = normalizeComparisonValue(resolved?.raw ?? "");
			const needle = queryValue.toLocaleLowerCase("sv-SE");
			const isMatch = String(haystack).includes(needle);
			return negate ? !isMatch : isMatch;
		};
	}

	const equalityMatch = condition.match(/^(.*?)\s*=\s*"([^"]*)"$/i);
	if (equalityMatch) {
		const field = equalityMatch[1].trim();
		const expected = equalityMatch[2].trim().toLocaleLowerCase("sv-SE");

		if (!supportedFieldSet.has(normalizeFieldName(field))) {
			return null;
		}

		return (note: LibraryItem) => {
			const resolved = resolveField(note, field);
			const value = normalizeComparisonValue(resolved?.raw ?? "");
			if (Array.isArray(resolved?.raw)) {
				return resolved.raw.some((entry) => entry.toLocaleLowerCase("sv-SE") === expected);
			}
			return String(value) === expected;
		};
	}

	return null;
}

function filterByFrom(allNotes: LibraryItem[], fromPath?: string) {
	if (!fromPath) {
		return allNotes;
	}

	const normalizedFrom = fromPath.replace(/^\/+|\/+$/g, "");
	return allNotes.filter(
		(note) => note.relativePath === normalizedFrom || note.relativePath.startsWith(`${normalizedFrom}/`)
	);
}

function sortNotes(notes: LibraryItem[], rules: ParsedSortRule[]) {
	return [...notes].sort((left, right) => {
		for (const rule of rules) {
			const leftValue = resolveField(left, rule.field)?.raw ?? null;
			const rightValue = resolveField(right, rule.field)?.raw ?? null;
			const comparison = compareValues(leftValue, rightValue);
			if (comparison !== 0) {
				return rule.direction === "desc" ? -comparison : comparison;
			}
		}
		return 0;
	});
}

function toUnsupported(query: string, reason: string): DataviewLiteUnsupportedResult {
	return { type: "unsupported", query, reason };
}

function extractClauses(query: string) {
	const fromMatch = query.match(/\bfrom\s+"([^"]+)"/i);
	const whereMatch = query.match(/\bwhere\s+([\s\S]*?)(?=\bsort\b|$)/i);
	const sortMatch = query.match(/\bsort\s+([\s\S]*)$/i);
	const clauseStarts = [fromMatch?.index, whereMatch?.index, sortMatch?.index].filter(
		(value): value is number => typeof value === "number"
	);
	const headerEnd = clauseStarts.length > 0 ? Math.min(...clauseStarts) : query.length;

	return {
		header: query.slice(0, headerEnd).trim(),
		fromPath: fromMatch?.[1]?.trim(),
		whereClause: whereMatch?.[1]?.trim(),
		sortClause: sortMatch?.[1]?.trim(),
	};
}

export function executeDataviewLite(
	query: string,
	allNotes: LibraryItem[],
	_currentNote: LibraryItem
): DataviewLiteResult {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return toUnsupported(query, ui.dataview.reasons.emptyQuery);
	}

	const clauses = extractClauses(trimmedQuery);
	if (!clauses.header) {
		return toUnsupported(query, ui.dataview.reasons.missingClause);
	}

	const whereConditions = clauses.whereClause ? splitConditions(clauses.whereClause) : [];
	const predicates = whereConditions
		.map((condition) => buildPredicate(condition))
		.filter(Boolean) as Array<(note: LibraryItem) => boolean>;

	if (whereConditions.length !== predicates.length) {
		return toUnsupported(query, ui.dataview.reasons.unsupportedWhere);
	}

	const sortInputs = clauses.sortClause ? splitCommaSeparated(clauses.sortClause) : [];
	const sortRules = clauses.sortClause ? parseSortRules(clauses.sortClause) : [];
	if (sortInputs.length > 0 && (!sortRules || sortInputs.length !== sortRules.length)) {
		return toUnsupported(query, ui.dataview.reasons.unsupportedSort);
	}

	let notes = filterByFrom(allNotes, clauses.fromPath);
	if (predicates.length > 0) {
		notes = notes.filter((note) => predicates.every((predicate) => predicate(note)));
	}
	if (sortRules && sortRules.length > 0) {
		notes = sortNotes(notes, sortRules);
	}

	const tableMatch = clauses.header.match(/^table(?:\s+without\s+id)?\s+(.+)$/i);
	if (tableMatch) {
		const columnExpressions = splitCommaSeparated(tableMatch[1]);
		const columns = columnExpressions.map((expression) => parseColumn(expression));
		if (columns.some((column) => !column)) {
			return toUnsupported(query, ui.dataview.reasons.unsupportedTableColumns);
		}

		return {
			type: "table",
			columns: columns as ParsedColumn[],
			rows: notes.map((note) =>
				(columns as ParsedColumn[]).map((column) => resolveField(note, column.field)?.cell ?? { kind: "empty" })
			),
		};
	}

	const listMatch = clauses.header.match(/^list(?:\s+(.*))?$/i);
	if (listMatch) {
		const expression = listMatch[1]?.trim() || "file.link";
		if (!supportedFieldSet.has(normalizeFieldName(expression))) {
			return toUnsupported(query, ui.dataview.reasons.unsupportedListExpression);
		}

		return {
			type: "list",
			items: notes.map((note) => resolveField(note, expression)?.cell ?? { kind: "empty" }),
		};
	}

	return toUnsupported(query, ui.dataview.reasons.onlyTableAndList);
}

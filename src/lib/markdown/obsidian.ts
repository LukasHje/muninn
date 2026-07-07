import path from "node:path";
import { executeDataviewLite } from "../dataviewLite";
import { executeDataviewJs } from "../dataviewJs";
import { parseObsidianAssetRef, resolveObsidianAsset } from "../resolveObsidianAsset";
import type { MarkdownDocumentSegment, MarkdownParseContext } from "./types";

function escapeMarkdownLabel(value: string) {
	return value.replace(/]/g, "\\]");
}

function decodePseudoValue(value: string) {
	return decodeURIComponent(value.replace(/^\w+-?\w*:/, ""));
}

function basenameWithoutExtension(value: string) {
	return path.basename(value, path.extname(value));
}

function buildLookupKeys(value: string) {
	const cleaned = value.replace(/^\/+/, "").replace(/\.md$/i, "").trim();
	if (!cleaned) {
		return [];
	}

	const relativeLower = cleaned.toLowerCase();
	const segments = cleaned.split("/").map((segment) => segment.trim()).filter(Boolean);
	const slugPath = segments
		.map((segment) =>
			segment
				.toLowerCase()
				.normalize("NFD")
				.replace(/\p{Diacritic}/gu, "")
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "")
		)
		.filter(Boolean)
		.join("/");
	const basename = segments.at(-1) ?? cleaned;
	const slugBase = slugPath.split("/").at(-1) ?? slugPath;

	return Array.from(new Set([relativeLower, slugPath, basename.toLowerCase(), slugBase].filter(Boolean)));
}

function toMarkdownAssetImage(reference: string, alt = "", width?: number | null) {
	const cleanedReference = reference.replace(/^<|>$/g, "").trim();
	const escapedAlt = escapeMarkdownLabel(alt);
	const title = width ? ` "muninn-width:${width}"` : "";
	return `![${escapedAlt}](muninn-asset:${encodeURIComponent(cleanedReference)}${title})`;
}

function parseMarkdownImageReference(reference: string) {
	const trimmed = reference.trim();
	if (!trimmed) {
		return null;
	}

	const unwrapped = trimmed.startsWith("<") && trimmed.endsWith(">")
		? trimmed.slice(1, -1).trim()
		: trimmed;
	const titleMatch = unwrapped.match(/^(.*?)(?:\s+"([^"]+)")$/);

	return {
		path: (titleMatch?.[1] ?? unwrapped).trim(),
		title: titleMatch?.[2]?.trim(),
	};
}

function readInlineDataviewValue(expression: string, context: MarkdownParseContext) {
	const normalizedExpression = expression.trim();
	if (normalizedExpression === "this.title") {
		return context.note.title;
	}

	if (normalizedExpression === "this.file.name") {
		return path.basename(context.note.relativePath, path.extname(context.note.relativePath));
	}

	const fieldMatch = normalizedExpression.match(/^this\.([A-Za-z0-9_-]+)$/);
	if (!fieldMatch) {
		return null;
	}

	const key = fieldMatch[1];
	const normalizedValue = context.note.normalized.metadata[key];
	if (Array.isArray(normalizedValue)) {
		return normalizedValue.join(", ");
	}
	if (typeof normalizedValue === "string" && normalizedValue.trim()) {
		return normalizedValue;
	}

	const frontmatterValue = context.note.frontmatter[key];
	if (Array.isArray(frontmatterValue)) {
		return frontmatterValue.join(", ");
	}
	if (typeof frontmatterValue === "string" && frontmatterValue.trim()) {
		return frontmatterValue;
	}

	return null;
}

function replaceInlineDataviewExpressions(raw: string, context: MarkdownParseContext) {
	const replaceExpression = (input: string) =>
		input
			.replace(/`=\s*(this\.[A-Za-z0-9_.-]+)`/g, (match, expression) => {
				const resolved = readInlineDataviewValue(expression, context);
				return resolved == null ? match : resolved;
			})
			.replace(/(^|[^\w`])=\s*(this\.[A-Za-z0-9_.-]+)/g, (match, prefix, expression) => {
				const resolved = readInlineDataviewValue(expression, context);
				return resolved == null ? match : `${prefix}${resolved}`;
			});

	return replaceExpression(raw);
}

function prettifyCalloutLabel(type: string) {
	switch (type) {
		case "abstract":
			return "Abstract";
		case "summary":
			return "Summary";
		case "tldr":
			return "TL;DR";
		case "info":
			return "Info";
		case "note":
			return "Note";
		case "todo":
			return "Todo";
		case "tip":
			return "Tip";
		case "warning":
			return "Warning";
		case "success":
			return "Success";
		case "danger":
			return "Danger";
		case "bug":
			return "Bug";
		case "quote":
			return "Quote";
		default:
			return type.charAt(0).toUpperCase() + type.slice(1);
	}
}

function isCalloutHeader(line: string) {
	return /^\s*>\s*\[!([A-Za-z-]+)\]([+-])?\s*(.*)$/.test(line);
}

function splitObsidianMarkdownSegments(
	raw: string,
	context: MarkdownParseContext,
	keyPrefix: string
): MarkdownDocumentSegment[] {
	const lines = raw.split("\n");
	const segments: MarkdownDocumentSegment[] = [];
	const textBuffer: string[] = [];
	let calloutIndex = 0;

	const flushMarkdown = () => {
		const text = textBuffer.join("\n");
		textBuffer.length = 0;
		if (!text.trim()) {
			return;
		}

		segments.push({
			type: "markdown",
			text: preprocessObsidianMarkdown(replaceInlineDataviewExpressions(text, context)),
			key: `${keyPrefix}-markdown-${segments.length}`,
		});
	};

	for (let index = 0; index < lines.length; index += 1) {
		const headerMatch = lines[index].match(/^\s*>\s*\[!([A-Za-z-]+)\]([+-])?\s*(.*)$/);
		if (!headerMatch) {
			textBuffer.push(lines[index]);
			continue;
		}

		flushMarkdown();

		const calloutSourceLines = [lines[index]];
		const contentLines: string[] = [];

		let cursor = index + 1;
		while (cursor < lines.length) {
			const currentLine = lines[cursor];
			if (isCalloutHeader(currentLine)) {
				break;
			}

			if (/^\s*>/.test(currentLine)) {
				calloutSourceLines.push(currentLine);
				contentLines.push(currentLine.replace(/^\s*>\s?/, ""));
				cursor += 1;
				continue;
			}

			if (
				currentLine.trim() === "" &&
				cursor + 1 < lines.length &&
				(/^\s*>/.test(lines[cursor + 1]) || isCalloutHeader(lines[cursor + 1]))
			) {
				calloutSourceLines.push(currentLine);
				contentLines.push("");
				cursor += 1;
				continue;
			}

			break;
		}

		const calloutType = headerMatch[1].trim().toLowerCase();
		const collapseMarker = headerMatch[2] ?? "";
		const title = headerMatch[3]?.trim() || prettifyCalloutLabel(calloutType);

		segments.push({
			type: "callout",
			calloutType,
			title,
			collapsible: collapseMarker === "+" || collapseMarker === "-",
			collapsed: collapseMarker === "-",
			content: contentLines.join("\n").trim(),
			source: calloutSourceLines.join("\n"),
			key: `${keyPrefix}-callout-${calloutIndex}`,
		});

		calloutIndex += 1;
		index = cursor - 1;
	}

	flushMarkdown();

	return segments;
}

export function preprocessObsidianMarkdown(raw: string) {
	return raw
		.replace(/!\[\[([^\]]+)\]\]/g, (_, reference) => {
			const parsed = parseObsidianAssetRef(reference);
			return toMarkdownAssetImage(reference, parsed.alt || basenameWithoutExtension(parsed.path), parsed.width);
		})
		.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, (_, reference, alt) => {
			return toMarkdownAssetImage(reference, alt || "");
		})
		.replace(/<img[^>]*src="([^"]+)"[^>]*>/gi, (_, reference) => {
			return toMarkdownAssetImage(reference);
		})
		.replace(/!\[([^\]]*)\]\((?!muninn-asset:|https?:|data:|\/vault-assets\/)([^)\n]+)\)/g, (_, alt, reference) => {
			const parsed = parseMarkdownImageReference(reference);
			if (!parsed?.path) {
				return _;
			}

			const width = parsed.title?.startsWith("muninn-width:")
				? Number.parseInt(parsed.title.replace("muninn-width:", ""), 10)
				: null;
			return toMarkdownAssetImage(parsed.path, alt || "", Number.isFinite(width) ? width : null);
		})
		.replace(/\[\[([^|\]]+)\|?([^\]]+)?\]\]/g, (_, target, label) => {
			const text = label || target;
			return `[${text}](muninn-note:${encodeURIComponent(target)})`;
		});
}

export function resolveObsidianWikiLink(target: string, noteLookup: Map<string, string>) {
	for (const key of buildLookupKeys(target)) {
		const match = noteLookup.get(key);
		if (match) {
			return match;
		}
	}

	return null;
}

export function resolveObsidianAssetForNote(
	reference: string,
	context: MarkdownParseContext,
	altOverride?: string
) {
	const resolved = resolveObsidianAsset(reference, context.note.relativePath, context.assetIndex);
	if (altOverride) {
		return { ...resolved, alt: altOverride };
	}
	return resolved;
}

export function parseObsidianImageTitle(title?: string | null) {
	if (!title?.startsWith("muninn-width:")) {
		return null;
	}

	const parsed = Number.parseInt(title.replace("muninn-width:", ""), 10);
	return Number.isFinite(parsed) ? parsed : null;
}

export function isFramedObsidianImage(extension?: string) {
	return extension === ".svg" || extension === ".png";
}

export function applyObsidianSyntax(
	segments: MarkdownDocumentSegment[],
	context: MarkdownParseContext
): Promise<MarkdownDocumentSegment[]> {
	return Promise.all(
		segments.flatMap(async (segment) => {
		if (segment.type === "markdown") {
			return splitObsidianMarkdownSegments(segment.text, context, segment.key);
		}

		if (segment.type === "code" && segment.language === "dataview") {
			return {
				type: "dataview",
				result: executeDataviewLite(segment.code, context.allNotes, context.note),
				query: segment.code,
				key: segment.key.replace(/^code-/, "dataview-"),
			};
		}

		if (segment.type === "code" && segment.language === "dataviewjs") {
			return {
				type: "dataviewjs",
				result: await executeDataviewJs(segment.code, context.allNotes, context.note),
				key: segment.key.replace(/^code-/, "dataviewjs-"),
			};
		}

		return segment;
		})
	).then((segmentsOrLists) => segmentsOrLists.flat());
}

export { decodePseudoValue };

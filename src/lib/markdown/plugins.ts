import { parseMapBlock } from "lib/parseMapBlock";
import type { ResolvedObsidianAsset } from "lib/resolveObsidianAsset";
import type { MarkdownDocumentSegment, MarkdownParseContext } from "lib/markdown/types";
import { resolveObsidianAssetForNote } from "lib/markdown/obsidian";

type ParseNestedSegments = (raw: string, keyPrefix: string) => Promise<MarkdownDocumentSegment[]>;

function parseMediaSliderItems(raw: string, context: MarkdownParseContext) {
	const lines = raw
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const items: ResolvedObsidianAsset[] = [];

	for (const line of lines) {
		const obsidianMatch = line.match(/!\[\[([^\]]+)\]\]/);
		if (obsidianMatch) {
			items.push(resolveObsidianAssetForNote(obsidianMatch[1], context));
			continue;
		}

		const markdownMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
		if (markdownMatch) {
			items.push(resolveObsidianAssetForNote(markdownMatch[2], context, markdownMatch[1] || undefined));
		}
	}

	return items;
}

function serializeSegment(segment: MarkdownDocumentSegment) {
	switch (segment.type) {
		case "markdown":
			return segment.text;
		case "code":
			return `\`\`\`${segment.language}\n${segment.code}\`\`\``;
		case "dataview":
			return `\`\`\`dataview\n${segment.query}\`\`\``;
		case "dataviewjs":
			return `\`\`\`dataviewjs\n${segment.code}\`\`\``;
		case "callout":
			return segment.source;
		default:
			return "";
	}
}

function normalizeColumnText(parts: string[]) {
	return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseColumnSettings(raw: string) {
	const settingsMatch = raw.match(/^```column-settings\s*\n([\s\S]*?)```\s*\n?/i);
	if (!settingsMatch) {
		return {
			columnCount: null,
			content: raw,
		};
	}

	const countMatch = settingsMatch[1].match(/number of columns:\s*(\d+)/i);
	return {
		columnCount: countMatch ? Number.parseInt(countMatch[1], 10) : null,
		content: raw.slice(settingsMatch[0].length).trim(),
	};
}

function consumeMultiColumnBlock(
	segments: MarkdownDocumentSegment[],
	startIndex: number
) {
	const startSegment = segments[startIndex];
	if (startSegment?.type !== "markdown") {
		return null;
	}

	const startLines = startSegment.text.split("\n");
	const startLineIndex = startLines.findIndex((line) => /^---\s*start-multi-column:/i.test(line.trim()));
	if (startLineIndex === -1) {
		return null;
	}

	const beforeText = startLines.slice(0, startLineIndex).join("\n").trim();
	const columns: string[][] = [[]];
	let activeColumn = 0;

	const pushText = (value: string) => {
		if (!value.trim()) {
			return;
		}
		columns[activeColumn].push(value);
	};

	pushText(startLines.slice(startLineIndex + 1).join("\n"));

	for (let index = startIndex + 1; index < segments.length; index += 1) {
		const segment = segments[index];
		if (segment.type === "markdown") {
			const lines = segment.text.split("\n");
			const buffer: string[] = [];

			for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
				const trimmed = lines[lineIndex].trim();
				if (/^---\s*column-break\s*---$/i.test(trimmed)) {
					pushText(buffer.join("\n"));
					buffer.length = 0;
					activeColumn += 1;
					columns[activeColumn] = [];
					continue;
				}

				if (/^---\s*end-multi-column\s*$/i.test(trimmed)) {
					pushText(buffer.join("\n"));
					const afterText = lines.slice(lineIndex + 1).join("\n").trim();
					const rawColumns = columns.map((parts) => normalizeColumnText(parts));
					const firstColumn = rawColumns[0] ?? "";
					const { columnCount, content } = parseColumnSettings(firstColumn);
					const normalizedColumns = [content, ...rawColumns.slice(1)].filter((value) => value.trim());

					return {
						beforeText,
						afterText,
						columnCount: columnCount ?? normalizedColumns.length,
						columns: normalizedColumns,
						consumed: index - startIndex + 1,
					};
				}

				buffer.push(lines[lineIndex]);
			}

			pushText(buffer.join("\n"));
			continue;
		}

		pushText(serializeSegment(segment));
	}

	return null;
}

export async function applyPluginSyntax(
	segments: MarkdownDocumentSegment[],
	context: MarkdownParseContext,
	parseNested: ParseNestedSegments
): Promise<MarkdownDocumentSegment[]> {
	const result: MarkdownDocumentSegment[] = [];

	for (let index = 0; index < segments.length; index += 1) {
		const segment = segments[index];

		if (segment.type === "markdown") {
			const multiColumn = consumeMultiColumnBlock(segments, index);
			if (multiColumn) {
				if (multiColumn.beforeText) {
					result.push({
						type: "markdown",
						text: multiColumn.beforeText,
						key: `${segment.key}-before`,
					});
				}

				result.push({
					type: "multi-column",
					columnCount: multiColumn.columnCount,
					columns: await Promise.all(
						multiColumn.columns.map((column, columnIndex) =>
							parseNested(column, `${segment.key}-multi-column-column-${columnIndex}`)
						)
					),
					key: `${segment.key}-multi-column`,
				});

				if (multiColumn.afterText) {
					result.push(
						...(await applyPluginSyntax(
							[
								{
									type: "markdown",
									text: multiColumn.afterText,
									key: `${segment.key}-after`,
								},
							],
							context,
							parseNested
						))
					);
				}

				index += multiColumn.consumed - 1;
				continue;
			}
		}

		if (segment.type !== "code") {
			result.push(segment);
			continue;
		}

		if (segment.language === "media-slider") {
			const items = parseMediaSliderItems(segment.code, context);
			if (items.length > 0) {
				result.push({
					type: "slider",
					items,
					key: segment.key.replace(/-code-/, "-slider-"),
				});
				continue;
			}

			result.push(segment);
			continue;
		}

		if (segment.language === "map" || segment.language === "leaflet") {
			const parsedMap = parseMapBlock(segment.code);
			if (parsedMap) {
				result.push({
					type: "map",
					map: parsedMap,
					key: segment.key.replace(/-code-/, "-map-"),
				});
				continue;
			}
		}

		if (segment.language === "mermaid") {
			result.push({
				type: "mermaid",
				code: segment.code,
				key: segment.key.replace(/-code-/, "-mermaid-"),
			});
			continue;
		}

		result.push(segment);
	}

	return result;
}

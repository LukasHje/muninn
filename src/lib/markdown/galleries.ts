import { resolveObsidianAssetForNote } from "src/lib/markdown/obsidian";
import type { MarkdownDocumentSegment, MarkdownParseContext } from "src/lib/markdown/types";
import type { ResolvedObsidianAsset } from "src/lib/resolveObsidianAsset";

const markdownImagePattern = /!\[([^\]]*)\]\(([^)\n]+)\)/g;

function extractMarkdownImageItems(raw: string, context: MarkdownParseContext) {
	const items: ResolvedObsidianAsset[] = [];

	for (const match of raw.matchAll(markdownImagePattern)) {
		const alt = match[1]?.trim();
		const reference = match[2]?.trim();
		if (!reference) {
			continue;
		}

		items.push(resolveObsidianAssetForNote(reference, context, alt || undefined));
	}

	return items;
}

function isImageOnlyMarkdownBlock(raw: string) {
	const items = Array.from(raw.matchAll(markdownImagePattern));
	if (items.length === 0) {
		return false;
	}

	return raw.replace(markdownImagePattern, "").trim().length === 0;
}

function splitMarkdownBlocks(raw: string) {
	return raw
		.split(/\n\s*\n+/)
		.map((block) => block.replace(/^\n+|\n+$/g, ""))
		.filter((block) => block.trim().length > 0);
}

function flushMarkdownBuffer(
	result: MarkdownDocumentSegment[],
	segment: Extract<MarkdownDocumentSegment, { type: "markdown" }>,
	buffer: string[],
	index: number
) {
	if (buffer.length === 0) {
		return index;
	}

	result.push({
		type: "markdown",
		text: buffer.join("\n\n"),
		key: `${segment.key}-markdown-${index}`,
	});

	buffer.length = 0;
	return index + 1;
}

function flushGalleryBuffer(
	result: MarkdownDocumentSegment[],
	segment: Extract<MarkdownDocumentSegment, { type: "markdown" }>,
	blockBuffer: string[],
	itemBuffer: ResolvedObsidianAsset[],
	index: number
) {
	if (blockBuffer.length === 0) {
		return index;
	}

	if (itemBuffer.length >= 2) {
		result.push({
			type: "slider",
			items: [...itemBuffer],
			key: `${segment.key}-gallery-${index}`,
		});
	} else {
		result.push({
			type: "markdown",
			text: blockBuffer.join("\n\n"),
			key: `${segment.key}-markdown-${index}`,
		});
	}

	blockBuffer.length = 0;
	itemBuffer.length = 0;
	return index + 1;
}

function splitMarkdownImageGalleries(
	segment: Extract<MarkdownDocumentSegment, { type: "markdown" }>,
	context: MarkdownParseContext
): MarkdownDocumentSegment[] {
	const blocks = splitMarkdownBlocks(segment.text);
	if (blocks.length === 0) {
		return [segment];
	}

	const result: MarkdownDocumentSegment[] = [];
	const markdownBuffer: string[] = [];
	const galleryBlockBuffer: string[] = [];
	const galleryItemBuffer: ResolvedObsidianAsset[] = [];
	let partIndex = 0;

	for (const block of blocks) {
		if (isImageOnlyMarkdownBlock(block)) {
			partIndex = flushMarkdownBuffer(result, segment, markdownBuffer, partIndex);
			galleryBlockBuffer.push(block);
			galleryItemBuffer.push(...extractMarkdownImageItems(block, context));
			continue;
		}

		partIndex = flushGalleryBuffer(result, segment, galleryBlockBuffer, galleryItemBuffer, partIndex);
		markdownBuffer.push(block);
	}

	partIndex = flushGalleryBuffer(result, segment, galleryBlockBuffer, galleryItemBuffer, partIndex);
	flushMarkdownBuffer(result, segment, markdownBuffer, partIndex);

	if (
		result.length === 1 &&
		result[0]?.type === "markdown" &&
		result[0].text.trim() === segment.text.trim()
	) {
		return [segment];
	}

	return result;
}

export function groupMarkdownImageGalleries(
	segments: MarkdownDocumentSegment[],
	context: MarkdownParseContext
) {
	return segments.flatMap((segment) => {
		if (segment.type !== "markdown") {
			return [segment];
		}

		return splitMarkdownImageGalleries(segment, context);
	});
}

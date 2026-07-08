import { parseCoreMarkdown } from "lib/markdown/core";
import { groupMarkdownImageGalleries } from "lib/markdown/galleries";
import { applyObsidianSyntax } from "lib/markdown/obsidian";
import { applyPluginSyntax } from "lib/markdown/plugins";
import type { MarkdownDocumentSegment, MarkdownParseContext } from "lib/markdown/types";

export async function parseMarkdownDocument(
	raw: string,
	context: MarkdownParseContext,
	keyPrefix = "root"
): Promise<MarkdownDocumentSegment[]> {
	const parseNested = (value: string, nestedKeyPrefix: string) => parseMarkdownDocument(value, context, nestedKeyPrefix);
	const coreSegments = parseCoreMarkdown(raw, keyPrefix);
	const obsidianSegments = await applyObsidianSyntax(coreSegments, context, parseNested);
	const pluginSegments = await applyPluginSyntax(obsidianSegments, context, parseNested);
	return groupMarkdownImageGalleries(pluginSegments, context);
}

import type { CoreDocumentSegment } from "src/lib/markdown/types";

export function parseCoreMarkdown(raw: string, keyPrefix = "root"): CoreDocumentSegment[] {
	const segments: CoreDocumentSegment[] = [];
	const lines = raw.split("\n");
	const markdownBuffer: string[] = [];
	const codeBuffer: string[] = [];
	let blockIndex = 0;
	let activeLanguage = "text";
	let inCodeBlock = false;
	let openingFence = "";

	const pushMarkdown = (value: string) => {
		if (!value.trim()) {
			return;
		}

		segments.push({
			type: "markdown",
			text: value,
			key: `${keyPrefix}-markdown-${segments.length}`,
		});
	};

	const pushCode = () => {
		segments.push({
			type: "code",
			language: activeLanguage,
			code: codeBuffer.join("\n"),
			key: `${keyPrefix}-code-${blockIndex}`,
		});

		blockIndex += 1;
		codeBuffer.length = 0;
		activeLanguage = "text";
	};

	for (const line of lines) {
		if (!inCodeBlock) {
			const fenceMatch = line.match(/^\s{0,3}```([^\n`]*)\s*$/);
			if (fenceMatch) {
				pushMarkdown(markdownBuffer.join("\n"));
				markdownBuffer.length = 0;
				inCodeBlock = true;
				openingFence = line;
				activeLanguage = fenceMatch[1]?.trim().toLowerCase() || "text";
				continue;
			}

			markdownBuffer.push(line);
			continue;
		}

		if (/^\s{0,3}```\s*$/.test(line)) {
			pushCode();
			inCodeBlock = false;
			openingFence = "";
			continue;
		}

		codeBuffer.push(line);
	}

	if (inCodeBlock) {
		markdownBuffer.push(openingFence, ...codeBuffer);
	}

	pushMarkdown(markdownBuffer.join("\n"));

	return segments;
}

export interface MarkdownHeadingSection {
	title: string;
	normalizedTitle: string;
	content: string;
}

function normalizeHeadingTitle(value: string) {
	return value
		.replace(/[*_`]/g, "")
		.replace(/\[(.*?)\]\((.*?)\)/g, "$1")
		.replace(/\[\[([^|\]]+)\|?([^\]]+)?\]\]/g, (_, link, label) => label || link)
		.trim()
		.toLocaleLowerCase("en");
}

export function extractHeadingSections(raw: string, depth = 2): MarkdownHeadingSection[] {
	const sections: MarkdownHeadingSection[] = [];
	const lines = raw.split("\n");
	const contentBuffer: string[] = [];
	let currentTitle: string | null = null;
	let inCodeBlock = false;

	const pushSection = () => {
		if (!currentTitle) {
			contentBuffer.length = 0;
			return;
		}

		const content = contentBuffer.join("\n").trim();
		if (!content) {
			contentBuffer.length = 0;
			return;
		}

		sections.push({
			title: currentTitle,
			normalizedTitle: normalizeHeadingTitle(currentTitle),
			content,
		});
		contentBuffer.length = 0;
	};

	const headingPattern = new RegExp(`^${"#".repeat(depth)}\\s+(.+?)\\s*$`);

	for (const line of lines) {
		if (/^\s{0,3}```/.test(line)) {
			inCodeBlock = !inCodeBlock;
		}

		if (!inCodeBlock) {
			const headingMatch = line.match(headingPattern);
			if (headingMatch) {
				pushSection();
				currentTitle = headingMatch[1].trim();
				continue;
			}
		}

		if (currentTitle) {
			contentBuffer.push(line);
		}
	}

	pushSection();
	return sections;
}

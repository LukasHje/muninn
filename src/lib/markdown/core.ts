import type { CoreDocumentSegment } from "./types";

export function parseCoreMarkdown(raw: string): CoreDocumentSegment[] {
	const segments: CoreDocumentSegment[] = [];
	const blockPattern = /```([^\n`]*)\n([\s\S]*?)```/g;
	let lastIndex = 0;
	let blockIndex = 0;
	let match: RegExpExecArray | null;

	const pushMarkdown = (value: string) => {
		if (!value.trim()) {
			return;
		}

		segments.push({
			type: "markdown",
			text: value,
			key: `markdown-${segments.length}`,
		});
	};

	while ((match = blockPattern.exec(raw)) !== null) {
		pushMarkdown(raw.slice(lastIndex, match.index));

		segments.push({
			type: "code",
			language: match[1]?.trim().toLowerCase() || "text",
			code: match[2] ?? "",
			key: `code-${blockIndex}`,
		});

		lastIndex = match.index + match[0].length;
		blockIndex += 1;
	}

	pushMarkdown(raw.slice(lastIndex));

	return segments;
}

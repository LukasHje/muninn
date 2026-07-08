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

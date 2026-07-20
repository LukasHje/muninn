export interface ParsedFrontmatter {
	body: string;
	data: Record<string, string | string[]>;
}

export interface ParsedVaultNote {
	title: string;
	slug: string;
	summary: string;
	category: string;
	tags: string[];
}

export function slugifySegment(value: string) {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
	if (!raw.startsWith("---\n")) {
		return { body: raw, data: {} };
	}

	const endIndex = raw.indexOf("\n---\n", 4);
	if (endIndex === -1) {
		return { body: raw, data: {} };
	}

	const frontmatterBlock = raw.slice(4, endIndex);
	const body = raw.slice(endIndex + 5);
	const data: Record<string, string | string[]> = {};
	const lines = frontmatterBlock.split("\n");

	let currentListKey: string | null = null;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];

		if (/^\s*-\s+/.test(line) && currentListKey) {
			const listValue = line.replace(/^\s*-\s+/, "").trim().replace(/^["']|["']$/g, "");
			const existing = data[currentListKey];
			if (Array.isArray(existing)) {
				existing.push(listValue);
			} else {
				data[currentListKey] = [listValue];
			}
			continue;
		}

		const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!match) {
			currentListKey = null;
			continue;
		}

		const [, key, rawValue] = match;
		const trimmedValue = rawValue.trim();
		const blockScalarMatch = trimmedValue.match(/^([>|])[-+]?\s*$/);
		if (blockScalarMatch) {
			const blockLines: string[] = [];
			let cursor = index + 1;

			while (cursor < lines.length) {
				const blockLine = lines[cursor];
				if (blockLine.trim() === "") {
					blockLines.push("");
					cursor += 1;
					continue;
				}

				if (!/^\s+/.test(blockLine)) {
					break;
				}

				blockLines.push(blockLine);
				cursor += 1;
			}

			const nonEmptyIndentLengths = blockLines
				.filter((entry) => entry.trim() !== "")
				.map((entry) => entry.match(/^\s*/)?.[0].length ?? 0);
			const sharedIndent =
				nonEmptyIndentLengths.length > 0 ? Math.min(...nonEmptyIndentLengths) : 0;
			const normalizedLines = blockLines.map((entry) =>
				entry.trim() === "" ? "" : entry.slice(sharedIndent).trimEnd()
			);

			if (blockScalarMatch[1] === ">") {
				const paragraphs: string[] = [];
				let currentParagraph: string[] = [];

				for (const normalizedLine of normalizedLines) {
					if (normalizedLine === "") {
						if (currentParagraph.length > 0) {
							paragraphs.push(currentParagraph.join(" "));
							currentParagraph = [];
						}
						continue;
					}

					currentParagraph.push(normalizedLine.trim());
				}

				if (currentParagraph.length > 0) {
					paragraphs.push(currentParagraph.join(" "));
				}

				data[key] = paragraphs.join("\n\n");
			} else {
				data[key] = normalizedLines.join("\n").trim();
			}

			currentListKey = null;
			index = cursor - 1;
			continue;
		}

		if (!trimmedValue) {
			data[key] = [];
			currentListKey = key;
			continue;
		}

		data[key] = trimmedValue.replace(/^["']|["']$/g, "");
		currentListKey = null;
	}

	return { body, data };
}

export function stripMarkdown(raw: string) {
	return raw
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/^---$/gm, " ")
		.replace(/^>\s*\[![^\]]+\].*$/gm, " ")
		.replace(/^>\s?/gm, "")
		.replace(/!\[\[[^\]]+\]\]/g, " ")
		.replace(/!\[[^\]]*]\(([^)]+)\)/g, " ")
		.replace(/\[\[([^|\]]+)\|?([^\]]+)?\]\]/g, (_, link, label) => label || link)
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
		.replace(/<img[^>]*>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/^#+\s*/gm, "")
		.replace(/[*_`>#-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function extractImageReferences(
	frontmatter: Record<string, string | string[]>,
	body: string
) {
	const references: string[] = [];
	const pushFrontmatterReferences = (value: string | string[] | undefined) => {
		if (Array.isArray(value)) {
			for (const entry of value) {
				if (entry) {
					references.push(entry);
				}
			}
			return;
		}

		if (typeof value === "string" && value) {
			references.push(value);
		}
	};

	pushFrontmatterReferences(frontmatter.cover);
	pushFrontmatterReferences(frontmatter.thumbnail);
	pushFrontmatterReferences(frontmatter.gallery);

	for (const match of body.matchAll(/!\[\[([^\]]+)\]\]/g)) {
		references.push(match[1]);
	}

	for (const match of body.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi)) {
		references.push(match[1]);
	}

	for (const match of body.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
		references.push(match[1]);
	}

	return references;
}

export function cleanImageReference(value: string) {
	return value
		.replace(/^\[\[|\]\]$/g, "")
		.replace(/\|.*$/, "")
		.trim();
}

export function parseVaultNote(note: ParsedVaultNote): ParsedVaultNote {
	return {
		title: note.title,
		slug: slugifySegment(note.title),
		summary: note.summary,
		category: note.category,
		tags: note.tags,
	};
}

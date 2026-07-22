interface InlineDataviewNote {
	title: string;
	relativePath: string;
	frontmatter: Record<string, string | string[] | undefined>;
	normalized: {
		metadata: Record<string, string | string[]>;
	};
}

function getFileNameWithoutExtension(relativePath: string) {
	const normalizedPath = relativePath.replace(/\\/g, "/");
	const fileName = normalizedPath.split("/").at(-1) ?? normalizedPath;
	const extensionIndex = fileName.lastIndexOf(".");
	return extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
}

export function readInlineDataviewValue(expression: string, note: InlineDataviewNote) {
	const normalizedExpression = expression.trim();
	if (normalizedExpression === "this.title") {
		return note.title;
	}

	if (normalizedExpression === "this.file.name") {
		return getFileNameWithoutExtension(note.relativePath);
	}

	const fieldMatch = normalizedExpression.match(/^this\.([A-Za-z0-9_-]+)$/);
	if (!fieldMatch) {
		return null;
	}

	const key = fieldMatch[1];
	const normalizedValue = note.normalized.metadata[key];
	if (Array.isArray(normalizedValue)) {
		return normalizedValue.join(", ");
	}
	if (typeof normalizedValue === "string" && normalizedValue.trim()) {
		return normalizedValue;
	}

	const frontmatterValue = note.frontmatter[key];
	if (Array.isArray(frontmatterValue)) {
		return frontmatterValue.join(", ");
	}
	if (typeof frontmatterValue === "string" && frontmatterValue.trim()) {
		return frontmatterValue;
	}

	return null;
}

export function replaceInlineDataviewExpressions(raw: string, note: InlineDataviewNote) {
	return raw
		.replace(/`=\s*(this\.[A-Za-z0-9_.-]+)`/g, (match, expression) => {
			const resolved = readInlineDataviewValue(expression, note);
			return resolved == null ? match : resolved;
		})
		.replace(/(^|[^\w`])=\s*(this\.[A-Za-z0-9_.-]+)/g, (match, prefix, expression) => {
			const resolved = readInlineDataviewValue(expression, note);
			return resolved == null ? match : `${prefix}${resolved}`;
		});
}

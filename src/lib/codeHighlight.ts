import { bundledLanguages, bundledLanguagesAlias, codeToTokens, type BundledLanguage } from "shiki";

export interface HighlightedCode {
	language: string;
	html: string;
	highlighted: boolean;
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function normalizeCodeLanguage(value: string) {
	return value.trim().toLocaleLowerCase("en").split(/\s+/, 1)[0] || "text";
}

export async function highlightCode(code: string, languageValue: string): Promise<HighlightedCode> {
	const language = normalizeCodeLanguage(languageValue);
	const source = code.replace(/\n$/, "");
	const isSupported = language in bundledLanguages || language in bundledLanguagesAlias;

	if (!isSupported) {
		return { language, html: escapeHtml(source), highlighted: false };
	}

	const result = await codeToTokens(source, {
		lang: language as BundledLanguage,
		theme: "github-dark-default",
	});
	const html = result.tokens
		.map((line) => line
			.map((token) => `<span style="color:${token.color}">${escapeHtml(token.content)}</span>`)
			.join(""))
		.join("\n");

	return { language, html, highlighted: true };
}

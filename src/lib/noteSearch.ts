import { slugifySegment, stripMarkdown } from "src/lib/parser";
import type { LibraryItem } from "src/lib/vault";

export interface NoteSearchHeading {
	id: string;
	text: string;
}

export interface NoteSearchSection {
	heading?: string;
	headingId?: string;
	text: string;
}

export interface NoteSearchDocument {
	id: string;
	href: string;
	title: string;
	aliases: string[];
	tags: string[];
	filename: string;
	domainIcon: string;
	domainLabel: string;
	favorite: boolean;
	updatedAt: number;
	updatedLabel: string;
	headings: NoteSearchHeading[];
	sections: NoteSearchSection[];
}

export type NoteSearchMatchField =
	| "title-prefix"
	| "title"
	| "alias"
	| "heading"
	| "tag"
	| "body"
	| "filename";

export interface NoteSearchResult {
	id: string;
	href: string;
	title: string;
	domainIcon: string;
	domainLabel: string;
	favorite: boolean;
	updatedAt: number;
	updatedLabel: string;
	field: NoteSearchMatchField;
	snippet: string;
	score: number;
}

export interface NoteSearchTextMatch {
	index: number;
	score: number;
	type: "exact" | "prefix" | "contains" | "tokens" | "fuzzy";
}

interface CandidateMatch {
	field: NoteSearchMatchField;
	href: string;
	score: number;
	snippet: string;
}

interface MatchStrategy {
	containsScore?: number;
	exactScore?: number;
	fuzzyScore?: number;
	prefixScore?: number;
	stemmedWordScore?: number;
	tokensScore?: number;
	wholeWordScore?: number;
	useContains?: boolean;
	useExact?: boolean;
	useFuzzy?: boolean;
	usePrefix?: boolean;
	useStemmedWord?: boolean;
	useTokens?: boolean;
	useWholeWord?: boolean;
}

const FIELD_WEIGHT: Record<NoteSearchMatchField, number> = {
	"title-prefix": 7_000,
	title: 6_000,
	alias: 5_000,
	heading: 4_000,
	tag: 3_000,
	body: 2_000,
	filename: 1_000,
};

function basenameWithoutExtension(relativePath: string) {
	const fileName = relativePath.split("/").at(-1) ?? relativePath;
	return fileName.replace(/\.[^.]+$/u, "");
}

function stemSearchToken(value: string) {
	if (value.length <= 3) {
		return value;
	}

	if (value.endsWith("ies") && value.length > 4) {
		return `${value.slice(0, -3)}y`;
	}

	if (/(ches|shes|sses|xes|zes)$/u.test(value) && value.length > 4) {
		return value.slice(0, -2);
	}

	if (/[sxz]es$/u.test(value) && value.length > 3) {
		return value.slice(0, -2);
	}

	if (/[^s]s$/u.test(value) && !/(ss|us|is|os)$/u.test(value)) {
		return value.slice(0, -1);
	}

	return value;
}

export function normalizeSearchText(value: string) {
	return value
		.toLocaleLowerCase("sv-SE")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[_/\\-]+/g, " ")
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function tokenizeSearchQuery(query: string) {
	return normalizeSearchText(query).split(" ").filter(Boolean);
}

function splitNormalizedTextTokens(value: string) {
	const tokens: Array<{ start: number; value: string }> = [];

	for (const match of value.matchAll(/\S+/gu)) {
		if (typeof match.index !== "number") {
			continue;
		}

		tokens.push({
			value: match[0],
			start: match.index,
		});
	}

	return tokens;
}

function createHeadingId(value: string, headingIdCounts: Map<string, number>) {
	const baseId = slugifySegment(value.trim()) || "section";
	const currentCount = headingIdCounts.get(baseId) ?? 0;
	headingIdCounts.set(baseId, currentCount + 1);
	return currentCount === 0 ? baseId : `${baseId}-${currentCount + 1}`;
}

function extractSearchSections(content: string) {
	const headings: NoteSearchHeading[] = [];
	const sections: NoteSearchSection[] = [];
	const headingIdCounts = new Map<string, number>();
	const lines = content.split("\n");
	let inFence = false;
	let currentHeading: NoteSearchHeading | null = null;
	let currentLines: string[] = [];

	const flushSection = () => {
		const text = stripMarkdown(currentLines.join("\n"));
		currentLines = [];
		if (!text) {
			return;
		}

		sections.push({
			heading: currentHeading?.text,
			headingId: currentHeading?.id,
			text,
		});
	};

	for (const line of lines) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			currentLines.push(line);
			continue;
		}

		if (!inFence) {
			const headingMatch = line.match(/^\s{0,3}#{1,6}\s+(.*)$/u);
			if (headingMatch) {
				flushSection();
				const text = headingMatch[1].trim();
				const heading = {
					text,
					id: createHeadingId(text, headingIdCounts),
				};
				headings.push(heading);
				currentHeading = heading;
				continue;
			}
		}

		currentLines.push(line);
	}

	flushSection();

	if (sections.length === 0) {
		const fallbackText = stripMarkdown(content);
		if (fallbackText) {
			sections.push({ text: fallbackText });
		}
	}

	return { headings, sections };
}

function getFuzzySubsequenceScore(target: string, query: string) {
	if (!target || !query) {
		return null;
	}

	let firstIndex = -1;
	let previousIndex = -1;
	let gapPenalty = 0;
	let contiguousBonus = 0;

	for (const character of query) {
		const nextIndex = target.indexOf(character, previousIndex + 1);
		if (nextIndex === -1) {
			return null;
		}

		if (firstIndex === -1) {
			firstIndex = nextIndex;
		}

		if (previousIndex !== -1) {
			gapPenalty += Math.max(0, nextIndex - previousIndex - 1);
			if (nextIndex === previousIndex + 1) {
				contiguousBonus += 3;
			}
		}

		previousIndex = nextIndex;
	}

	const spread = previousIndex - firstIndex + 1;
	const densityScore = query.length > 0 && spread > 0 ? Math.round((query.length / spread) * 36) : 0;
	const leadingPenalty = Math.min(firstIndex, 28);

	return {
		index: firstIndex,
		score: Math.max(1, densityScore + contiguousBonus - gapPenalty - leadingPenalty),
		spread,
		gapPenalty,
	};
}

function findWholeWordContainsIndex(text: string, query: string) {
	let searchStart = 0;

	while (searchStart < text.length) {
		const matchIndex = text.indexOf(query, searchStart);
		if (matchIndex === -1) {
			return -1;
		}

		const before = matchIndex === 0 ? " " : text[matchIndex - 1];
		const after = text[matchIndex + query.length] ?? " ";
		if (before === " " && after === " ") {
			return matchIndex;
		}

		searchStart = matchIndex + 1;
	}

	return -1;
}

function findStemmedTokenMatchIndex(text: string, query: string) {
	if (!query || query.includes(" ")) {
		return -1;
	}

	const stemmedQuery = stemSearchToken(query);
	for (const token of splitNormalizedTextTokens(text)) {
		if (stemSearchToken(token.value) === stemmedQuery) {
			return token.start;
		}
	}

	return -1;
}

function findFuzzyTokenMatch(text: string, query: string) {
	if (!query || query.includes(" ") || query.length < 3) {
		return null;
	}

	const candidates = splitNormalizedTextTokens(text)
		.filter((token) => token.value.length >= 3)
		.filter((token) => token.value[0] === query[0])
		.filter((token) => {
			const shortest = Math.min(token.value.length, query.length);
			const longest = Math.max(token.value.length, query.length);
			return shortest / longest >= 0.6;
		})
		.map((token) => {
			const fuzzy = getFuzzySubsequenceScore(token.value, query);
			if (!fuzzy) {
				return null;
			}

			const maxSpread = query.length + Math.max(2, Math.floor(query.length * 0.5));
			const maxGapPenalty = Math.max(2, Math.floor(query.length * 0.5));
			if (fuzzy.spread > maxSpread || fuzzy.gapPenalty > maxGapPenalty) {
				return null;
			}

			return {
				index: token.start + fuzzy.index,
				score: fuzzy.score,
			};
		})
		.filter((candidate): candidate is { index: number; score: number } => Boolean(candidate))
		.sort((left, right) => right.score - left.score);

	return candidates[0] ?? null;
}

function matchTextWithStrategy(
	text: string,
	normalizedQuery: string,
	queryTokens: string[],
	strategy: MatchStrategy
): NoteSearchTextMatch | null {
	const normalizedText = normalizeSearchText(text);
	if (!normalizedText || !normalizedQuery) {
		return null;
	}

	if (strategy.useExact && normalizedText === normalizedQuery) {
		return {
			index: 0,
			score: strategy.exactScore ?? 340,
			type: "exact",
		};
	}

	if (strategy.usePrefix && normalizedText.startsWith(normalizedQuery)) {
		return {
			index: 0,
			score: strategy.prefixScore ?? 320,
			type: "prefix",
		};
	}

	if (strategy.useWholeWord) {
		const wholeWordIndex = findWholeWordContainsIndex(normalizedText, normalizedQuery);
		if (wholeWordIndex >= 0) {
			return {
				index: wholeWordIndex,
				score: (strategy.wholeWordScore ?? 300) - Math.min(wholeWordIndex, 48),
				type: "contains",
			};
		}
	}

	if (strategy.useStemmedWord) {
		const stemmedWordIndex = findStemmedTokenMatchIndex(normalizedText, normalizedQuery);
		if (stemmedWordIndex >= 0) {
			return {
				index: stemmedWordIndex,
				score: (strategy.stemmedWordScore ?? 290) - Math.min(stemmedWordIndex, 48),
				type: "contains",
			};
		}
	}

	if (strategy.useContains) {
		const containsIndex = normalizedText.indexOf(normalizedQuery);
		if (containsIndex >= 0) {
			return {
				index: containsIndex,
				score: (strategy.containsScore ?? 280) - Math.min(containsIndex, 64),
				type: "contains",
			};
		}
	}

	if (strategy.useTokens && queryTokens.length > 1) {
		const tokenIndexes = queryTokens.map((token) => normalizedText.indexOf(token));
		if (tokenIndexes.every((index) => index >= 0)) {
			const firstIndex = Math.min(...tokenIndexes);
			return {
				index: firstIndex,
				score: (strategy.tokensScore ?? 220) - Math.min(firstIndex, 48),
				type: "tokens",
			};
		}
	}

	if (!strategy.useFuzzy) {
		return null;
	}

	const fuzzy = findFuzzyTokenMatch(normalizedText, normalizedQuery);
	if (!fuzzy) {
		return null;
	}

	return {
		index: fuzzy.index,
		score: (strategy.fuzzyScore ?? 160) + fuzzy.score,
		type: "fuzzy",
	};
}

function matchTitle(text: string, normalizedQuery: string, queryTokens: string[]) {
	return matchTextWithStrategy(text, normalizedQuery, queryTokens, {
		usePrefix: true,
		prefixScore: 360,
		useWholeWord: true,
		wholeWordScore: 340,
		useStemmedWord: true,
		stemmedWordScore: 332,
		useContains: true,
		containsScore: 320,
		useFuzzy: true,
		fuzzyScore: 220,
	});
}

function matchFieldText(
	field: NoteSearchMatchField,
	text: string,
	normalizedQuery: string,
	queryTokens: string[]
) {
	switch (field) {
		case "title-prefix":
		case "title":
			return matchTitle(text, normalizedQuery, queryTokens);
		case "alias":
			return matchAlias(text, normalizedQuery, queryTokens);
		case "heading":
			return matchHeading(text, normalizedQuery, queryTokens);
		case "tag":
			return matchTag(text, normalizedQuery, queryTokens);
		case "body":
			return matchBody(text, normalizedQuery, queryTokens);
		case "filename":
			return matchFilename(text, normalizedQuery, queryTokens);
	}
}

function matchAlias(text: string, normalizedQuery: string, queryTokens: string[]) {
	return matchTextWithStrategy(text, normalizedQuery, queryTokens, {
		useWholeWord: true,
		wholeWordScore: 300,
		useStemmedWord: true,
		stemmedWordScore: 292,
		useContains: true,
		containsScore: 280,
		useFuzzy: true,
		fuzzyScore: 170,
	});
}

function matchHeading(text: string, normalizedQuery: string, queryTokens: string[]) {
	return matchTextWithStrategy(text, normalizedQuery, queryTokens, {
		useWholeWord: true,
		wholeWordScore: 272,
		useStemmedWord: true,
		stemmedWordScore: 264,
		useContains: true,
		containsScore: 255,
		useFuzzy: true,
		fuzzyScore: 120,
	});
}

function matchFilename(text: string, normalizedQuery: string, queryTokens: string[]) {
	return matchTextWithStrategy(text, normalizedQuery, queryTokens, {
		useWholeWord: true,
		wholeWordScore: 248,
		useStemmedWord: true,
		stemmedWordScore: 240,
		useContains: true,
		containsScore: 235,
		useFuzzy: true,
		fuzzyScore: 105,
	});
}

function matchTag(text: string, normalizedQuery: string, queryTokens: string[]) {
	return matchTextWithStrategy(text, normalizedQuery, queryTokens, {
		useExact: true,
		exactScore: 260,
		useWholeWord: true,
		wholeWordScore: 238,
		useStemmedWord: true,
		stemmedWordScore: 230,
		useContains: true,
		containsScore: 220,
	});
}

function matchBody(text: string, normalizedQuery: string, queryTokens: string[]) {
	return matchTextWithStrategy(text, normalizedQuery, queryTokens, {
		useWholeWord: true,
		wholeWordScore: 246,
		useStemmedWord: true,
		stemmedWordScore: 238,
		useContains: true,
		containsScore: 230,
		useTokens: true,
		tokensScore: 180,
	});
}

function findBestMatchingSection(
	document: NoteSearchDocument,
	normalizedQuery: string,
	queryTokens: string[]
) {
	const matches = document.sections
		.map((section) => ({
			section,
			match: matchBody(section.text, normalizedQuery, queryTokens),
		}))
		.filter(
			(
				entry
			): entry is {
				section: NoteSearchSection;
				match: NoteSearchTextMatch;
			} => Boolean(entry.match)
		)
		.sort((left, right) => right.match.score - left.match.score);

	return matches[0]?.section ?? null;
}

function buildBodySnippet(text: string, normalizedQuery: string, queryTokens: string[]) {
	const compactText = text.replace(/\s+/g, " ").trim();
	if (!compactText) {
		return "";
	}

	const normalizedCompactText = normalizeSearchText(compactText);
	const exactIndex = normalizedCompactText.indexOf(normalizedQuery);
	let matchIndex = exactIndex >= 0 ? exactIndex : 0;

	if (exactIndex === -1 && queryTokens.length > 0) {
		const tokenIndexes = queryTokens
			.map((token) => normalizedCompactText.indexOf(token))
			.filter((index) => index >= 0);
		if (tokenIndexes.length > 0) {
			matchIndex = Math.min(...tokenIndexes);
		}
	}

	const start = Math.max(0, matchIndex - 52);
	const end = Math.min(compactText.length, matchIndex + 88);
	const prefix = start > 0 ? "..." : "";
	const suffix = end < compactText.length ? "..." : "";
	return `${prefix}${compactText.slice(start, end).trim()}${suffix}`;
}

function buildLeadingSnippet(text: string) {
	const compactText = text.replace(/\s+/g, " ").trim();
	if (!compactText) {
		return "";
	}

	const end = Math.min(compactText.length, 140);
	const suffix = end < compactText.length ? "..." : "";
	return `${compactText.slice(0, end).trim()}${suffix}`;
}

function buildFallbackSnippet(document: NoteSearchDocument) {
	const firstSection = document.sections.find((section) => section.text.trim());
	if (firstSection) {
		return buildLeadingSnippet(firstSection.text);
	}

	if (document.headings[0]?.text) {
		return document.headings[0].text;
	}

	return document.filename;
}

function buildSupportSnippet(
	document: NoteSearchDocument,
	normalizedQuery: string,
	queryTokens: string[]
) {
	const matchingSection = findBestMatchingSection(document, normalizedQuery, queryTokens);
	if (matchingSection) {
		return buildBodySnippet(matchingSection.text, normalizedQuery, queryTokens);
	}

	return buildFallbackSnippet(document);
}

function getBestCandidateMatch(
	document: NoteSearchDocument,
	normalizedQuery: string,
	queryTokens: string[]
): CandidateMatch | null {
	const candidates: CandidateMatch[] = [];
	const titleMatch = matchTitle(document.title, normalizedQuery, queryTokens);
	if (titleMatch) {
		const field: NoteSearchMatchField = titleMatch.type === "prefix" ? "title-prefix" : "title";
		candidates.push({
			field,
			href: document.href,
			score: FIELD_WEIGHT[field] + titleMatch.score,
			snippet: buildSupportSnippet(document, normalizedQuery, queryTokens),
		});
	}

	for (const alias of document.aliases) {
		const aliasMatch = matchAlias(alias, normalizedQuery, queryTokens);
		if (!aliasMatch) {
			continue;
		}

		candidates.push({
			field: "alias",
			href: document.href,
			score: FIELD_WEIGHT.alias + aliasMatch.score,
			snippet: buildSupportSnippet(document, normalizedQuery, queryTokens),
		});
	}

	for (const heading of document.headings) {
		const headingMatch = matchHeading(heading.text, normalizedQuery, queryTokens);
		if (!headingMatch) {
			continue;
		}

		candidates.push({
			field: "heading",
			href: `${document.href}#${heading.id}`,
			score: FIELD_WEIGHT.heading + headingMatch.score,
			snippet: heading.text,
		});
	}

	for (const tag of document.tags) {
		const tagMatch = matchTag(tag, normalizedQuery, queryTokens);
		if (!tagMatch) {
			continue;
		}

		candidates.push({
			field: "tag",
			href: document.href,
			score: FIELD_WEIGHT.tag + tagMatch.score,
			snippet: `#${tag}`,
		});
	}

	for (const section of document.sections) {
		const sectionMatch = matchBody(section.text, normalizedQuery, queryTokens);
		if (!sectionMatch) {
			continue;
		}

		candidates.push({
			field: "body",
			href: section.headingId ? `${document.href}#${section.headingId}` : document.href,
			score: FIELD_WEIGHT.body + sectionMatch.score,
			snippet: buildBodySnippet(section.text, normalizedQuery, queryTokens),
		});
	}

	const filenameMatch = matchFilename(document.filename, normalizedQuery, queryTokens);
	if (filenameMatch) {
		candidates.push({
			field: "filename",
			href: document.href,
			score: FIELD_WEIGHT.filename + filenameMatch.score,
			snippet: buildSupportSnippet(document, normalizedQuery, queryTokens),
		});
	}

	if (candidates.length === 0) {
		return null;
	}

	return candidates.sort((left, right) => right.score - left.score)[0] ?? null;
}

export function buildNoteSearchDocuments(items: LibraryItem[]): NoteSearchDocument[] {
	return items.map((item) => {
		const { headings, sections } = extractSearchSections(item.content);

		return {
			id: item.id,
			href: item.href,
			title: item.title,
			aliases: item.normalized.aliases,
			tags: item.tags,
			filename: basenameWithoutExtension(item.relativePath),
			domainIcon: item.domainIcon,
			domainLabel: item.domainLabel,
			favorite: Boolean(item.favorite),
			updatedAt: item.updatedAt,
			updatedLabel: item.updatedLabel,
			headings,
			sections,
		};
	});
}

export function searchNoteDocuments(documents: NoteSearchDocument[], query: string) {
	const normalizedQuery = normalizeSearchText(query);
	const queryTokens = tokenizeSearchQuery(query);
	if (!normalizedQuery || queryTokens.length === 0) {
		return [] as NoteSearchResult[];
	}

	return documents
		.map((document) => {
			const bestMatch = getBestCandidateMatch(document, normalizedQuery, queryTokens);
			if (!bestMatch) {
				return null;
			}

			return {
				id: document.id,
				href: bestMatch.href,
				title: document.title,
				domainIcon: document.domainIcon,
				domainLabel: document.domainLabel,
				favorite: document.favorite,
				updatedAt: document.updatedAt,
				updatedLabel: document.updatedLabel,
				field: bestMatch.field,
				snippet: bestMatch.snippet,
				score: bestMatch.score,
			} satisfies NoteSearchResult;
		})
		.filter((result): result is NoteSearchResult => Boolean(result))
		.sort((left, right) => {
			if (right.score !== left.score) {
				return right.score - left.score;
			}
			if (right.updatedAt !== left.updatedAt) {
				return right.updatedAt - left.updatedAt;
			}
			return left.title.localeCompare(right.title, "sv");
		});
}

export function getNoteSearchTextMatch(
	field: NoteSearchMatchField,
	text: string,
	query: string
) {
	const normalizedQuery = normalizeSearchText(query);
	const queryTokens = tokenizeSearchQuery(query);
	if (!normalizedQuery || queryTokens.length === 0) {
		return null as NoteSearchTextMatch | null;
	}

	return matchFieldText(field, text, normalizedQuery, queryTokens);
}

import {
	getNoteSearchTextMatch,
	getNoteSearchTagQueryCandidates,
	normalizeSearchText,
	tokenizeSearchQuery,
	type NoteSearchMatchField,
} from "src/lib/noteSearch";

interface HighlightOptions {
	field?: NoteSearchMatchField;
	markClass?: string;
}

interface NormalizedCharacter {
	char: string;
	end: number;
	start: number;
}

interface HighlightRange {
	end: number;
	start: number;
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function getHighlightOptions(optionsOrClass?: HighlightOptions | string): HighlightOptions {
	if (typeof optionsOrClass === "string") {
		return { markClass: optionsOrClass };
	}

	return optionsOrClass ?? {};
}

function buildNormalizedCharacters(value: string) {
	const characters: NormalizedCharacter[] = [];
	let sourceOffset = 0;
	let pendingSpace = false;

	for (const character of Array.from(value)) {
		const start = sourceOffset;
		const end = start + character.length;
		sourceOffset = end;

		const normalized = character
			.toLocaleLowerCase("sv-SE")
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.replace(/[_/\\-]+/g, " ")
			.replace(/[^\p{L}\p{N}\s]/gu, " ");

		for (const normalizedCharacter of Array.from(normalized)) {
			if (/\s/u.test(normalizedCharacter)) {
				if (characters.length > 0) {
					pendingSpace = true;
				}
				continue;
			}

			if (pendingSpace) {
				characters.push({ char: " ", start, end });
				pendingSpace = false;
			}

			characters.push({ char: normalizedCharacter, start, end });
		}
	}

	if (characters.at(-1)?.char === " ") {
		characters.pop();
	}

	return characters;
}

function toNormalizedString(characters: NormalizedCharacter[]) {
	return characters.map((character) => character.char).join("");
}

function findAllExactTokenRanges(
	characters: NormalizedCharacter[],
	normalizedValue: string,
	query: string
) {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) {
		return [] as HighlightRange[];
	}

	const ranges: HighlightRange[] = [];
	let searchStart = 0;

	while (searchStart < normalizedValue.length) {
		const matchIndex = normalizedValue.indexOf(normalizedQuery, searchStart);
		if (matchIndex === -1) {
			break;
		}

		const startCharacter = characters[matchIndex];
		const endCharacter = characters[matchIndex + normalizedQuery.length - 1];
		if (startCharacter && endCharacter) {
			ranges.push({
				start: startCharacter.start,
				end: endCharacter.end,
			});
		}

		searchStart = matchIndex + Math.max(normalizedQuery.length, 1);
	}

	return ranges;
}

function findAllTokenRanges(characters: NormalizedCharacter[], normalizedValue: string, query: string) {
	return tokenizeSearchQuery(query)
		.filter(Boolean)
		.flatMap((token) => findAllExactTokenRanges(characters, normalizedValue, token));
}

function findFuzzyRanges(
	characters: NormalizedCharacter[],
	normalizedValue: string,
	query: string,
	matchIndex: number
) {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) {
		return [] as HighlightRange[];
	}

	let tokenStart = matchIndex;
	while (tokenStart > 0 && normalizedValue[tokenStart - 1] !== " ") {
		tokenStart -= 1;
	}

	let tokenEnd = matchIndex;
	while (tokenEnd < normalizedValue.length && normalizedValue[tokenEnd] !== " ") {
		tokenEnd += 1;
	}

	const startCharacter = characters[tokenStart];
	const endCharacter = characters[tokenEnd - 1];
	if (!startCharacter || !endCharacter) {
		return [] as HighlightRange[];
	}

	return [
		{
			start: startCharacter.start,
			end: endCharacter.end,
		},
	];
}

function findTokenRangeAtIndex(
	characters: NormalizedCharacter[],
	normalizedValue: string,
	matchIndex: number
) {
	let tokenStart = matchIndex;
	while (tokenStart > 0 && normalizedValue[tokenStart - 1] !== " ") {
		tokenStart -= 1;
	}

	let tokenEnd = matchIndex;
	while (tokenEnd < normalizedValue.length && normalizedValue[tokenEnd] !== " ") {
		tokenEnd += 1;
	}

	const startCharacter = characters[tokenStart];
	const endCharacter = characters[tokenEnd - 1];
	if (!startCharacter || !endCharacter) {
		return [] as HighlightRange[];
	}

	return [
		{
			start: startCharacter.start,
			end: endCharacter.end,
		},
	];
}

function mergeRanges(ranges: HighlightRange[]) {
	const sortedRanges = [...ranges].sort((left, right) => left.start - right.start);
	if (sortedRanges.length === 0) {
		return [] as HighlightRange[];
	}

	const merged = [sortedRanges[0]];

	for (const range of sortedRanges.slice(1)) {
		const previousRange = merged.at(-1);
		if (!previousRange) {
			merged.push(range);
			continue;
		}

		if (range.start <= previousRange.end) {
			previousRange.end = Math.max(previousRange.end, range.end);
			continue;
		}

		merged.push(range);
	}

	return merged;
}

function renderWithRanges(value: string, ranges: HighlightRange[], markClass: string) {
	if (ranges.length === 0) {
		return escapeHtml(value);
	}

	let html = "";
	let cursor = 0;

	for (const range of ranges) {
		if (range.start > cursor) {
			html += escapeHtml(value.slice(cursor, range.start));
		}

		html += `<mark class="${markClass}">${escapeHtml(value.slice(range.start, range.end))}</mark>`;
		cursor = range.end;
	}

	if (cursor < value.length) {
		html += escapeHtml(value.slice(cursor));
	}

	return html;
}

function resolveHighlightRanges(
	value: string,
	query: string,
	field: NoteSearchMatchField | undefined
) {
	const normalizedCharacters = buildNormalizedCharacters(value);
	const normalizedValue = toNormalizedString(normalizedCharacters);
	if (!normalizedValue) {
		return [] as HighlightRange[];
	}

	const effectiveField = field ?? "body";
	const candidateQueries = effectiveField === "tag"
		? getNoteSearchTagQueryCandidates(query)
		: [query];
	const ranges = candidateQueries.flatMap((candidateQuery) => {
		const match = getNoteSearchTextMatch(effectiveField, value, candidateQuery);
		if (!match) {
			return [] as HighlightRange[];
		}

		if (match.type === "fuzzy") {
			return findFuzzyRanges(normalizedCharacters, normalizedValue, candidateQuery, match.index);
		}

		const tokenRanges = findAllTokenRanges(normalizedCharacters, normalizedValue, candidateQuery);
		if (tokenRanges.length > 0) {
			return tokenRanges;
		}

		return findTokenRangeAtIndex(normalizedCharacters, normalizedValue, match.index);
	});

	return mergeRanges(ranges);
}

export function highlightSearchText(value: string, query: string, optionsOrClass?: HighlightOptions | string) {
	const { field, markClass = "muninn-search-highlight" } = getHighlightOptions(optionsOrClass);
	if (!query.trim()) {
		return escapeHtml(value);
	}

	const ranges = resolveHighlightRanges(value, query, field);
	return renderWithRanges(value, ranges, markClass);
}

import path from "node:path";
import { cleanImageReference } from "lib/parser";
import type { VaultAssetEntry, VaultAssetIndex } from "lib/vaultAssetIndex";
import { normalizeAssetName } from "lib/vaultAssetIndex";

export interface ParsedObsidianAssetRef {
	path: string;
	width?: number;
	alt?: string;
}

export interface ResolvedObsidianAsset {
	found: boolean;
	reference: string;
	url: string | null;
	alt: string;
	width?: number;
	relativePath?: string;
	extension?: string;
	missingReason?: string;
}

function formatRelativePath(value: string) {
	return value.split(path.sep).join("/");
}

function stripPseudoPrefix(value: string) {
	if (!value.startsWith("muninn-asset:")) {
		return value;
	}

	return decodeURIComponent(value.slice("muninn-asset:".length));
}

function basenameWithoutExtension(value: string) {
	return path.basename(value, path.extname(value));
}

export function parseObsidianAssetRef(assetRef: string): ParsedObsidianAssetRef {
	const decoded = stripPseudoPrefix(assetRef).trim();
	const unwrapped = cleanImageReference(decoded);
	const parts = unwrapped.split("|").map((part) => part.trim()).filter(Boolean);
	const rawPath = parts[0] ?? decoded;
	const widthPart = parts[1];

	let width: number | undefined;
	let alt: string | undefined;

	if (widthPart) {
		if (/^\d+$/.test(widthPart)) {
			width = Number.parseInt(widthPart, 10);
		} else {
			alt = widthPart;
		}
	}

	return {
		path: rawPath.replace(/^["']|["']$/g, "").trim(),
		width,
		alt,
	};
}

function buildMissingAsset(reference: string, parsed: ParsedObsidianAssetRef, reason: string): ResolvedObsidianAsset {
	return {
		found: false,
		reference,
		url: null,
		alt: parsed.alt || basenameWithoutExtension(parsed.path || reference),
		width: parsed.width,
		missingReason: reason,
		extension: path.extname(parsed.path).toLowerCase(),
	};
}

function candidateDistanceScore(candidate: VaultAssetEntry, notePath: string, targetPath: string) {
	const noteDirSegments = path.posix.dirname(notePath).toLowerCase().split("/").filter(Boolean);
	const candidateDirSegments = path.posix.dirname(candidate.relativePath).toLowerCase().split("/").filter(Boolean);
	const targetLower = targetPath.toLowerCase();
	let shared = 0;

	while (
		shared < noteDirSegments.length &&
		shared < candidateDirSegments.length &&
		noteDirSegments[shared] === candidateDirSegments[shared]
	) {
		shared += 1;
	}

	let score = shared * 20;

	if (candidate.relativePath.toLowerCase().includes("/99 x/99.03 images/")) {
		score += 12;
	}

	if (targetLower && candidate.relativePath.toLowerCase().endsWith(targetLower)) {
		score += 14;
	}

	if (path.posix.dirname(candidate.relativePath).toLowerCase() === path.posix.dirname(notePath).toLowerCase()) {
		score += 18;
	}

	score -= candidate.relativePath.length / 100;

	return score;
}

function pickBestCandidate(
	candidates: VaultAssetEntry[],
	notePath: string,
	targetPath: string
) {
	return [...candidates].sort(
		(a, b) => candidateDistanceScore(b, notePath, targetPath) - candidateDistanceScore(a, notePath, targetPath)
	)[0];
}

function toResolvedAsset(reference: string, parsed: ParsedObsidianAssetRef, entry: VaultAssetEntry): ResolvedObsidianAsset {
	return {
		found: true,
		reference,
		url: entry.publicUrl,
		alt: parsed.alt || basenameWithoutExtension(entry.filename),
		width: parsed.width,
		relativePath: entry.relativePath,
		extension: path.extname(entry.filename).toLowerCase(),
	};
}

export function resolveObsidianAsset(
	assetRef: string,
	notePath: string,
	assetIndex: VaultAssetIndex
): ResolvedObsidianAsset {
	const parsed = parseObsidianAssetRef(assetRef);
	const cleanedPath = parsed.path;

	if (!cleanedPath || cleanedPath.startsWith("blob:")) {
		return buildMissingAsset(assetRef, parsed, "Empty asset reference");
	}

	if (/^(https?:|data:)/i.test(cleanedPath)) {
		return {
			found: true,
			reference: assetRef,
			url: cleanedPath,
			alt: parsed.alt || basenameWithoutExtension(cleanedPath),
			width: parsed.width,
			extension: path.extname(cleanedPath).toLowerCase(),
		};
	}

	if (cleanedPath.startsWith("/vault-assets/")) {
		return {
			found: true,
			reference: assetRef,
			url: cleanedPath,
			alt: parsed.alt || basenameWithoutExtension(cleanedPath),
			width: parsed.width,
			extension: path.extname(cleanedPath).toLowerCase(),
		};
	}

	const noteDirectory = path.posix.dirname(formatRelativePath(notePath));
	const relativeCandidate = formatRelativePath(
		path.posix.normalize(path.posix.join(noteDirectory, cleanedPath))
	).replace(/^\/+/, "");
	const relativeMatch = assetIndex.byRelativePath.get(relativeCandidate.toLowerCase());
	if (relativeMatch) {
		return toResolvedAsset(assetRef, parsed, relativeMatch);
	}

	const rootCandidate = formatRelativePath(path.posix.normalize(cleanedPath.replace(/^\/+/, "")));
	const rootMatch = assetIndex.byRelativePath.get(rootCandidate.toLowerCase());
	if (rootMatch) {
		return toResolvedAsset(assetRef, parsed, rootMatch);
	}

	const partialMatches = assetIndex.entries.filter((entry) => {
		const relativeLower = entry.relativePath.toLowerCase();
		const targetLower = rootCandidate.toLowerCase();
		return relativeLower === targetLower || relativeLower.endsWith(`/${targetLower}`);
	});
	if (partialMatches.length > 0) {
		return toResolvedAsset(assetRef, parsed, pickBestCandidate(partialMatches, notePath, rootCandidate));
	}

	const basename = path.basename(rootCandidate).toLowerCase();
	const filenameMatches = assetIndex.byLowercaseFilename.get(basename) ?? [];
	if (filenameMatches.length > 0) {
		return toResolvedAsset(assetRef, parsed, pickBestCandidate(filenameMatches, notePath, rootCandidate));
	}

	const normalizedBasename = normalizeAssetName(path.basename(rootCandidate));
	const normalizedMatches = assetIndex.byNormalizedFilename.get(normalizedBasename) ?? [];
	if (normalizedMatches.length > 0) {
		return toResolvedAsset(assetRef, parsed, pickBestCandidate(normalizedMatches, notePath, rootCandidate));
	}

	return buildMissingAsset(assetRef, parsed, "Asset not found in vault index");
}

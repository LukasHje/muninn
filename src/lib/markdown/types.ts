import type { DataviewLiteResult } from "../dataviewLite";
import type { DataviewJsExecutionResult } from "../dataviewJs";
import type { ParsedMapBlock } from "../parseMapBlock";
import type { ResolvedObsidianAsset } from "../resolveObsidianAsset";
import type { VaultAssetIndex } from "../vaultAssetIndex";
import type { LibraryItem } from "../vault";

export interface MarkdownParseContext {
	note: LibraryItem;
	allNotes: LibraryItem[];
	noteLookup: Map<string, string>;
	assetIndex: VaultAssetIndex;
}

export interface CoreMarkdownSegment {
	type: "markdown";
	text: string;
	key: string;
}

export interface CoreCodeSegment {
	type: "code";
	language: string;
	code: string;
	key: string;
}

export type CoreDocumentSegment = CoreMarkdownSegment | CoreCodeSegment;

export interface DataviewSegment {
	type: "dataview";
	result: DataviewLiteResult;
	query: string;
	key: string;
}

export interface DataviewJsSegment {
	type: "dataviewjs";
	result: DataviewJsExecutionResult;
	key: string;
}

export interface CalloutSegment {
	type: "callout";
	calloutType: string;
	title: string;
	collapsible: boolean;
	collapsed: boolean;
	content: string;
	source: string;
	key: string;
}

export interface MermaidSegment {
	type: "mermaid";
	code: string;
	key: string;
}

export interface MultiColumnSegment {
	type: "multi-column";
	columnCount: number;
	columns: string[];
	key: string;
}

export interface MapSegment {
	type: "map";
	map: ParsedMapBlock;
	key: string;
}

export interface MediaSliderSegment {
	type: "slider";
	items: ResolvedObsidianAsset[];
	key: string;
}

export type MarkdownDocumentSegment =
	| CoreMarkdownSegment
	| CoreCodeSegment
	| DataviewSegment
	| DataviewJsSegment
	| CalloutSegment
	| MapSegment
	| MermaidSegment
	| MultiColumnSegment
	| MediaSliderSegment;

import type { DataviewLiteResult } from "lib/dataviewLite";
import type { DataviewJsExecutionResult } from "lib/dataviewJs";
import type { ParsedMapBlock } from "lib/parseMapBlock";
import type { ResolvedObsidianAsset } from "lib/resolveObsidianAsset";
import type { VaultAssetIndex } from "lib/vaultAssetIndex";
import type { LibraryItem } from "lib/vault";

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
	code: string;
	key: string;
}

export interface CalloutSegment {
	type: "callout";
	calloutType: string;
	title: string;
	collapsible: boolean;
	collapsed: boolean;
	children: MarkdownDocumentSegment[];
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
	columns: MarkdownDocumentSegment[][];
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

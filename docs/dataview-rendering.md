# Dataview Rendering

Muninn treats Dataview and DataviewJS as typed document content rather than post-processing ordinary Markdown.

```text
Fenced Dataview source
    ↓
Core code node
    ↓
Obsidian Dataview or DataviewJS node
    ↓
Query or script execution
    ↓
Typed result blocks
    ↓
Markdown UI
```

## AST Contract

Every recognized `dataview` or `dataviewjs` fence becomes a `DataviewSegment` or `DataviewJsSegment`. This invariant applies at every document depth:

- directly in the document
- inside standard or foldable callouts
- inside nested callouts
- inside other recursively parsed container blocks

Containers own typed child nodes. They must not flatten a Dataview fence into `Callout → Markdown → CodeBlock`.

Nested container content re-enters the complete Core → Obsidian → Plugin pipeline. Adding a new container therefore requires recursive parsing and recursive rendering of its children.

## Execution Contract

`src/lib/dataviewLite.ts` executes declarative Dataview queries. `src/lib/dataviewJs.ts` provides the server-side DataviewJS compatibility runtime.

The DataviewJS runtime currently exposes:

- page access: `dv.current()`, `dv.page()`, `dv.pages()`
- collections: `dv.array()`, `dv.where()`, `dv.sort()` and DataArray `where()`, `filter()`, `map()`, `sort()`
- output: `dv.table()`, `dv.list()`, `dv.header()`, `dv.paragraph()`, `dv.span()`, `dv.el()`
- values: `dv.date()`, `dv.fileLink()`
- the supported `app.vault` read surface used by existing vault notes

Collection helpers return DataArray-compatible values so calls can continue chaining in the same style as Obsidian Dataview.

Each fenced block executes independently and produces its own result. An error is local to that block and must not prevent later Dataview or DataviewJS siblings from being parsed, executed or rendered.

The runtime is a compatibility layer, not a browser-side Obsidian plugin instance. New API support belongs in the centralized runtime; note-specific script rewrites and renderer-side API emulation are forbidden.

## Generated Markdown

`dv.header()`, `dv.paragraph()`, `dv.span()` and `dv.el()` may produce Markdown or HTML. Markdown result blocks are passed back through `NoteContent` and the normal document pipeline. This preserves headings, emphasis, wiki links, callouts and other supported Markdown/Obsidian semantics in generated output.

Generated output must not be inserted as escaped plain text or interpreted by a separate Markdown implementation.

## Callouts

Obsidian executes Dataview inside callouts, including folded and nested callouts. Muninn follows the same ownership:

1. the callout parser collects the complete nested source
2. the nested source re-enters the full parser
3. Dataview fences become typed child nodes
4. the callout renderer traverses those children recursively

Quoted fences with lazy, unquoted code-body continuation are covered by the callout contract in `docs/callout-rendering.md`.

## Regression Contract

Changes to parsing, callout collection, Dataview execution or recursive rendering must retain fixtures covering:

- a declarative Dataview table
- one and multiple DataviewJS blocks
- ordinary Markdown before, between and after blocks
- standard and foldable callouts
- lazy code continuation inside a callout
- two nested callout levels
- collection helpers and Markdown-producing output methods

Tests must assert node types and nesting, not only final text. This catches the distinction between a real DataviewJS AST node and a code block that merely retains the same source.

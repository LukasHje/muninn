# Muninn Rendering Pipeline

Muninn reads a markdown note in a fixed sequence:

```text
Markdown File
    ↓
Core
    ↓
Obsidian
    ↓
Plugin
    ↓
Renderer / UI
```

The purpose of this split is readability and clear ownership. Each layer is allowed to do one kind of work and must avoid leaking into the next one.

## 1. Markdown File

Input is the raw note content plus already loaded note metadata.

This stage is only the source material.

It must never:

- decide presentation
- resolve plugin blocks
- format UI

## 2. Core

Core is responsible only for standard Markdown structure.

Examples:

- headings
- paragraphs
- emphasis
- lists
- tables
- blockquotes
- links
- images
- fenced code blocks as plain code blocks

Core may split a document into ordinary markdown text and generic fenced code segments.

Core must never:

- know about Obsidian syntax like `[[Wiki Links]]`
- know about Obsidian embeds like `![[image.png]]`
- know about Dataview
- know about Obsidian plugin block types
- make UI decisions

## 3. Obsidian

Obsidian is responsible only for Obsidian-specific syntax layered on top of standard Markdown.

Examples:

- `[[Wiki Links]]`
- `![[Embeds]]`
- Obsidian-flavoured image references
- Dataview fenced blocks

This layer extends the Core document so the rest of Muninn can treat Obsidian syntax as understood content.

Obsidian must never:

- parse plugin-specific fenced blocks such as `media-slider` or `leaflet`
- introduce rendering concerns like copy buttons or lightboxes
- contain generic Markdown parsing logic that belongs in Core

## 4. Plugin

Plugin is responsible only for syntax introduced by Obsidian plugins.

Current examples:

- ` ```leaflet `
- ` ```map `
- ` ```media-slider `

Plugin blocks are parsed only when their syntax is recognized. Unsupported plugin blocks must fall back to normal fenced code blocks.

Plugin must never:

- reimplement standard Markdown parsing
- reimplement Obsidian wiki-link or embed parsing
- decide styling or interaction details

## 5. Renderer / UI

Renderer/UI is responsible only for presentation.

Examples:

- note layouts
- typography
- code block chrome
- copy buttons
- image framing
- responsive tables
- cards, spacing and colors

Renderer/UI consumes the already-understood document and decides how it should look.

Renderer/UI must never:

- introduce new parsing rules
- own Obsidian syntax resolution
- own plugin syntax resolution

## Current Structure

Today the layers are primarily represented like this:

- Core: `src/lib/markdown/core.ts`
- Obsidian: `src/lib/markdown/obsidian.ts`
- Plugin: `src/lib/markdown/plugins.ts`
- Shared parse types: `src/lib/markdown/types.ts`
- Renderer/UI entry point: `src/components/notes/NoteContent.astro`

Supporting helpers still exist outside the `markdown/` folder when they are shared by multiple features, for example vault asset resolution and Dataview execution.

## Practical Rule

When adding a new feature, ask:

1. Is this normal Markdown? Put it in Core.
2. Is this Obsidian syntax? Put it in Obsidian.
3. Is this introduced by an Obsidian plugin? Put it in Plugin.
4. Is this only about how content looks or behaves in the browser? Put it in Renderer/UI.

## Experience Pipeline

Experience discovery runs before application UI composition and is separate from Markdown parsing:

```text
Vault notes
    ↓
Experience Selector Engine
    ↓
Experience Definition and Card Family
    ↓
Application UI
```

If an inspector renders Markdown, that content then enters the normal Core → Obsidian → Plugin → Renderer pipeline. Selectors must never parse Markdown or introduce rendering rules.

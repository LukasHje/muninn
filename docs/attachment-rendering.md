# Attachment Rendering Architecture

**Status:** Proposed  
**Owner:** Rendering System  
**Related:** Markdown Rendering, Rendering Pipeline

---

# Purpose

This document defines how embedded attachments are rendered within Muninn.

The goal is to separate Markdown parsing from attachment rendering so that every embedded file type can be supported through a unified, extensible architecture.

This document describes architectural principles—not implementation details.

---

# Problem Statement

Today, every embedded attachment (`![[...]]`) is treated as an image.

This causes incorrect behavior such as:

- PDFs appearing inside image galleries.
- CSV files being interpreted as images.
- No clear extension point for future file types.
- Rendering logic leaking into the Markdown renderer.

This architecture replaces that approach with a generic attachment rendering pipeline.

---

# Design Goals

The attachment system should:

- Parse embedded attachments once.
- Select viewers based on file type.
- Keep Markdown rendering completely agnostic of presentation.
- Support future attachment types without modifying the parser.
- Reuse a consistent UI across all embedded documents.

---

# Architectural Principles

## 1. Markdown only describes content

Markdown tells Muninn **what** is embedded.

It never decides **how** the attachment should be rendered.

Example

```md
![[Media-NAS parts list.pdf]]
```

The parser should emit an attachment node.

It should never instantiate a PDF viewer directly.

---

## 2. Rendering is delegated

Viewer selection belongs exclusively to the attachment rendering system.

```
Markdown

↓

AttachmentNode

↓

AttachmentResolver

↓

AttachmentRenderer

↓

Specific Viewer
```

---

## 3. One renderer per responsibility

Each renderer owns a single document type.

Examples:

- ImageViewer
- PdfViewer
- SpreadsheetViewer
- DocumentViewer
- AudioPlayer
- VideoPlayer
- DownloadCard

No renderer should know about Markdown.

---

## 4. Open for extension

Supporting a new file type should require:

1. Creating a renderer.
2. Registering it.

Nothing else.

No parser changes.

No gallery changes.

No rendering pipeline changes.

---

# Viewer Matrix

| File Type | Viewer |
|------------|--------|
| Images | ImageViewer |
| PDF | PdfViewer |
| CSV | SpreadsheetViewer |
| Excel | SpreadsheetViewer |
| Word | DocumentViewer |
| PowerPoint | PresentationViewer |
| Audio | AudioPlayer |
| Video | VideoPlayer |
| Unknown | DownloadCard |

---

# Image Gallery Rules

Image galleries are exclusively for images.

Allowed:

- image/*

Never include:

- pdf
- csv
- xlsx
- docx
- mp4
- mp3
- zip

Those should render inline using their dedicated viewers.

---

# UI Principles

Every embedded attachment should share a common visual language.

Each attachment block should contain:

- File icon
- Filename
- Embedded preview (if supported)
- Open externally
- Download

The attachment type determines the viewer—not the surrounding note layout.

---

# Performance

Heavy viewers should be lazy-loaded.

Large documents should only initialize when entering the viewport.

Viewers should avoid blocking initial page rendering.

---

# Future Expansion

The architecture should allow support for additional file types without changing the rendering pipeline.

Potential future viewers include:

- EPUB
- Mermaid
- Draw.io
- Excalidraw
- STL / GLTF
- GeoJSON
- GPX
- ICS
- Mind Maps

---

# Guiding Principle

Muninn is a **knowledge vault**, not merely a Markdown renderer.

Users should be able to write:

```md
![[filename.ext]]
```

without needing to think about file types.

Muninn should automatically select the most appropriate embedded experience based on the attachment itself.
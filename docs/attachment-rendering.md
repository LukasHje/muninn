# Attachment Rendering Architecture

**Status:** Active, evolving
**Owner:** Rendering System
**Related:** `rendering-pipeline.md`, `rendering-philosophy.md`, `ui-boundaries.md`

## Purpose

This document defines how Muninn presents embedded attachments and other rich rendered content inside a note.

The central rule is that Markdown and vault parsing identify content, while the rendering layer owns viewer selection, visual framing, responsive sizing, interaction, and detail views.

## Current rendering path

The implemented path is currently pragmatic rather than a complete viewer registry:

```text
Markdown or Obsidian embed
        ↓
Markdown parsing and asset resolution
        ↓
NoteContent
        ↓
Image or PDF presentation
        ↓
Optional client viewer and lightbox
```

Mermaid follows the same presentation principles but enters through the Markdown plugin pipeline:

```text
Mermaid code block
        ↓
Markdown plugin segment
        ↓
MermaidDiagram
        ↓
Inline preview and diagram lightbox
```

The current implementation supports:

| Content | Inline presentation | Detail surface |
| --- | --- | --- |
| Images | Responsive image preview | Image lightbox and gallery |
| PDF | Rendered page preview with page controls | PDF lightbox with navigation and zoom |
| Mermaid | Rendered SVG preview | Mermaid lightbox with zoom |

Mermaid is not a binary attachment, but it shares the attachment preview contract because it occupies the same visual role inside the reading flow.

## Ownership boundaries

### Parsing and resolution own content identity

Parsing may determine:

- that an embed exists;
- its source reference;
- resolved vault asset information;
- explicit Obsidian image width;
- whether a fenced block is Mermaid.

Parsing must not determine:

- viewport-relative size;
- maximum preview height;
- framing or shadows;
- lightbox behavior;
- responsive layout;
- zoom behavior.

### Viewers own presentation

`NoteContent`, the specific viewer component, and its client initializer own:

- inline preview size and framing;
- aspect-ratio preservation;
- interaction and keyboard behavior;
- lightbox initialization;
- PDF rasterization dimensions;
- viewer-specific loading and error states.

Application shell components must not reach into rendered Markdown to resize individual attachments.

## Inline preview contract

An inline attachment is a reading-flow preview, not the primary inspection surface.

Every supported visual preview must follow these rules:

- It must fit within the available note width.
- It must not dominate the note vertically.
- It must preserve its intrinsic aspect ratio.
- It must be contained rather than cropped or distorted.
- Tall or portrait content should become narrower and remain centered.
- Wide content may use the available note width when it remains within the vertical budget.
- Small content must not be enlarged merely to fill the note width.
- The inline preview must not create a competing vertical scroll container.
- Full-size inspection belongs in the viewer's lightbox.

The shared inline preview budget is:

- desktop: `min(68dvh, 44rem)`;
- mobile and narrow viewports: `min(56dvh, 30rem)`.

These values are part of the NoteContent presentation contract. A viewer may render below the budget when its intrinsic dimensions are smaller, but it should not exceed the budget without a documented reason.

Explicit Obsidian image widths remain supported as preferred inline widths. They are still constrained by the available note width and the shared vertical preview budget.

## Preview and detail separation

Inline previews preserve document hierarchy and scanning rhythm. Lightboxes provide the space needed for detailed inspection.

Lightboxes may therefore:

- use the full viewport;
- render at a higher resolution;
- provide zoom and panning;
- provide page or gallery navigation;
- lock background scrolling while open.

Inline preview limits must not be applied to lightbox content. Conversely, a lightbox must not be used to justify cropping or distorting the inline preview.

## Viewer-specific rules

### Images

- Image previews use natural dimensions up to the available width and height budget.
- Portrait images are centered rather than stretched to note width.
- Image gallery membership is restricted to images.
- PDF and future non-image attachments must never enter the image gallery.

### PDF

- The inline canvas is fitted against both the available width and the preview height budget.
- PDF.js should rasterize close to the final inline display size instead of rendering a width-sized portrait page and relying on CSS to shrink it afterward.
- Page controls remain available inline.
- Full-page reading, zoom, and navigation belong in the PDF lightbox.

### Mermaid

- Mermaid SVGs must not be forced to fill the full note width.
- The generated SVG is fitted within both width and height budgets without changing diagram semantics.
- A large diagram may become less legible inline; the lightbox is the intended detailed inspection surface.
- Mermaid generation options belong to the Mermaid renderer, not the Markdown parser.

## Performance

Heavy viewers should be loaded only when needed and should avoid blocking initial note rendering.

Viewer implementations should:

- render close to their final display dimensions;
- avoid unnecessarily large canvases or decoded assets;
- cache reusable documents where appropriate;
- re-render only when a meaningful viewport dimension changes;
- keep full-resolution work in the detail surface when possible.

## Future viewer architecture

The long-term extension model remains one renderer per responsibility:

- `ImageViewer`
- `PdfViewer`
- `SpreadsheetViewer`
- `DocumentViewer`
- `AudioPlayer`
- `VideoPlayer`
- `DownloadCard`

Adding a future file type should eventually require registering a viewer rather than changing Markdown parsing. The current image/PDF branch in `NoteContent` is an implementation stage, not permission to scatter new extension checks through UI components.

CSV, Excel, Word, PowerPoint, audio, video, archives, and unknown-file download cards are outside the currently implemented viewer set. When introduced, they must follow the same ownership and inline-preview principles where applicable.

## Change checklist

Before changing attachment or rich-content rendering, verify:

- Is this content identity or presentation logic?
- Does the change preserve parser/viewer ownership?
- Does the inline result stay within the preview budget?
- Are intrinsic proportions preserved without cropping?
- Is detailed inspection still available through an appropriate surface?
- Does the change avoid adding a new page-level scroll container?
- Are mobile, desktop, lightbox, and keyboard behavior still correct?
- Does the documentation still describe the implementation honestly?

## Guiding principle

Rendered attachments should enrich a note without taking control of its hierarchy. The note remains the reading surface; the lightbox is the inspection surface.

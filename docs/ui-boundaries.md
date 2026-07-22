# Muninn UI Boundaries

Muninn has two separate UI domains:

```text
Application UI
Markdown UI
```

They must remain isolated from each other.

## 1. Application UI

Application UI is everything around the note reader.

Examples:

- sidebar
- search
- toolbar
- filters
- dialogs
- navigation
- page-level controls

This UI belongs to the application shell and feature screens.

Application UI must never:

- leak styling into rendered markdown
- rely on markdown-specific DOM structure
- style internals of markdown-rendered components by accident

## 2. Markdown UI

Markdown UI is everything rendered inside `NoteContent`.

Examples:

- paragraphs
- headings
- lists
- tables
- callouts
- code blocks
- Mermaid
- Dataview
- DataviewJS
- Media Slider
- Leaflet
- future markdown plugin blocks

`NoteContent` is the root of the Markdown rendering environment.

It is acceptable for `NoteContent` to own the typography and presentation of rendered markdown.

Markdown UI must never:

- leak presentation back into the application shell
- assume sidebar, filters, dialogs, or page chrome exist
- style unrelated application components

## Standard Note Reader Boundary

The standard note reader contains both UI domains but keeps an explicit boundary between them:

- `NoteShell.astro`, its hero, reader actions, tag preview, and metadata triggers are Application UI.
- `NoteMetadataDrawer.astro` and `NoteProperties.astro` are Application UI presenting already-normalized note data.
- `NoteContent.astro` is the Markdown UI root and owns the rendered Markdown subtree.

The note shell may arrange `NoteContent`, but it must not style or reinterpret Markdown internals. `NoteContent` may style rendered Markdown and plugin output, but it must not reach outward into the hero, metadata drawer, shell controls, or overlay state.

Detailed note-reader presentation rules live in `docs/note-reader-ui.md`. Viewport and overlay mechanics remain owned by `docs/application-shell-layout.md`.

## Ownership Rule

The important boundary is not "no styling in `NoteContent`".

The important boundary is:

- Application UI should never leak into Markdown UI.
- Markdown UI should never leak into Application UI.

## Component Ownership Guidance

When working in the UI layer:

- components should own their own markup
- parent components should not reach into child internals unless there is a clear reason
- shared components should expose explicit styling contracts
- use `:global()` only when it is genuinely the clearest solution, especially for injected or foreign DOM

Examples where `:global()` may be appropriate:

- rendered markdown HTML inside `NoteContent`
- injected SVG from Mermaid
- third-party DOM that Muninn does not directly author

Examples where `:global()` is usually a warning sign:

- parent components styling child component internals
- generic app UI leaking into markdown-rendered content
- markdown-rendered styles leaking into application shell components

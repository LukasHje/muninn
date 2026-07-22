# Note Reader UI Contract

The standard note reader presents one normalized vault note without owning Markdown parsing, application viewport behaviour, or global overlay mechanics.

This document defines the Application UI around a note: the hero, classification kickers, compact metadata, tag previews, and reusable metadata presentation. It complements:

- `docs/rendering-pipeline.md` for Markdown parsing and rendering
- `docs/ui-boundaries.md` for Application UI versus Markdown UI ownership
- `docs/application-shell-layout.md` for viewport, drawer, focus, and scroll behaviour

## Ownership

The note-reading surface is split deliberately:

```text
Application shell
└── NoteShell
    ├── Note hero and reader actions
    ├── NoteHeroTagPreview
    ├── NoteMetadataDrawer trigger and content source
    └── NoteContent
        └── Rendered Markdown UI
```

Responsibilities:

- `NoteShell.astro` owns note-level Application UI and chooses the hero presentation.
- `NoteContent.astro` owns rendered Markdown presentation only.
- `NoteMetadataDrawer.astro` provides the semantic drawer trigger and reusable metadata content.
- `NoteProperties.astro` renders normalized properties, aliases, and tags.
- `ApplicationShellClient.ts` owns drawer state, overlay positioning, inert handling, focus, gestures, and scroll restoration.

The note reader must not create a second modal controller, viewport system, body scroll lock, or focus trap.

## Metadata Source of Truth

All reader metadata comes from the existing `LibraryItem` and its normalized note data. The reader must not parse frontmatter again or maintain a reduced metadata copy.

Moving metadata between the hero, drawer, Experiences, or search changes presentation only. It must not mutate:

- frontmatter
- normalized metadata
- aliases
- tags
- domain inference
- search documents

The complete metadata remains available to every existing consumer even when the standard reader shows only a preview.

## Hero Classification

The hero may show two classification levels:

1. the normalized domain label as the primary category
2. the normalized note type only when it adds more specific information

Domain and type must not produce duplicate kickers. `src/lib/noteKickers.ts` is the shared presentation rule for deciding whether the type kicker is useful.

Examples that should collapse to one kicker:

- `gear` and `Gear`
- `project` and `Projects`
- `recipe` and `Recipes`
- `book` and `Books`
- localized labels that normalize to the same classification

More specific types remain visible when they add meaning, for example:

- `travel-destination` under Travel
- `server` under Technology
- `reference` under Technology

When adding a domain or a domain-equivalent type, update the redundancy mapping and its focused tests. Do not solve duplicate kickers with one-off conditionals in the component.

## Hero Metadata Hierarchy

Created and Updated values are supporting text, not categorical metadata. They render directly on the hero background rather than inside badges.

Domain, type, tags, and overflow counts are compact classification controls. The current note-reader design uses explicit 5-pixel corners for these information surfaces. Circular or strongly rounded shapes remain appropriate for icon-only actions such as Back or Favorite, where shape communicates control rather than metadata.

This 5-pixel rule is a note-reader presentation contract, not permission to rewrite unrelated application components globally.

## Hero Summary

The default hero summary consumes the shared `LibraryItem.excerpt`; `NoteShell` does not parse Markdown or evaluate Dataview expressions.

Vault loading resolves supported inline Dataview fields before stripping Markdown and truncating the excerpt. This keeps the hero, Library cards, and rendered note body consistent while preserving the rendering-pipeline boundary. Changes to supported inline expressions belong in `src/lib/inlineDataview.ts`, not in hero or card components.

## Hero Tag Preview

The hero shows a display-only preview of `note.tags`:

- below the `xl` shell breakpoint, the preview shows at most four tags
- at `xl` and above, it measures one natural-width row
- the desktop row is capped at `max-w-3xl`, matching the hero description width
- the `+N` control occupies space within that same row budget
- hidden tags remain unchanged in the source array

The measurement exists because CSS alone cannot provide both an exact omitted count and a guarantee that the interactive `+N` control fits in the row. It must not be expanded into general viewport sizing logic.

When tags are omitted, `+N` is a semantic button that opens the Note Metadata Drawer. It must retain:

- `aria-controls`
- `aria-expanded`
- a meaningful accessible label
- keyboard access
- focus restoration when the drawer closes

The drawer, not an expandable hero region, is the complete tag destination.

## Note Metadata Drawer Content

The normal note flow does not append the full image/properties panel after the Markdown content. The drawer is the single standard-reader presentation of that information.

Where available, it reuses:

- the note's centrally resolved display image
- normalized properties
- aliases
- tags
- created and updated values already present in normalized metadata

Do not invent new metadata fields in the drawer or keep hidden duplicate footer markup. New metadata belongs in the normalized model first and should remain reusable by search and Experiences.

The drawer consumes `LibraryItem.imageUrl`; it must not resolve frontmatter or inspect Markdown independently. The vault loading pipeline selects that display image in this order:

1. a resolvable `cover`
2. a resolvable `thumbnail`
3. the first resolvable gallery or inline note image

This is the same image candidate used by standard Library list and card views. A fallback image makes metadata richer but does not change the note's normalized layout: `thumbnail` alone must not promote a plain note to a cover hero.

Drawer mechanics belong to the application shell and are documented in `docs/application-shell-layout.md`. The note reader supplies content and triggers only.

## Responsive and Content Safeguards

The standard reader must preserve these behaviours:

- note prose remains readable without desktop-sized mobile margins
- code blocks and wide tables scroll internally rather than widening the viewport
- images, video, embeds, and iframes stay within content width
- callouts remain readable on narrow screens
- the metadata trigger does not reserve note width or cover the workspace scrollbar
- opening metadata does not reset the note's scroll position

Shared Markdown safeguards belong to `NoteContent`; shell or drawer safeguards belong to their respective Application UI owners.

## Verification

Changes to the standard note reader should verify:

- a note whose domain and type are equivalent
- a note with a distinct, more specific type
- notes with zero, four, and many tags
- mobile and desktop hero tag overflow
- opening metadata from both the edge trigger and `+N`
- focus restoration to the trigger that opened the drawer
- notes with and without images, aliases, and properties
- plain, cover, and travel note layouts
- no duplicate metadata footer after the Markdown content
- light and dark hero contrast

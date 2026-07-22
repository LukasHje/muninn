# Search Engine Architecture

Muninn has **one search engine** but **multiple search experiences**.

This distinction is important.

The goal is to keep all ranking, matching and snippet generation in a single place while allowing different parts of the application to expose that search engine in different ways.

---

# Design Goals

The search system should:

- have one source of truth
- avoid duplicated search logic
- produce identical ranking regardless of where search is initiated
- support future plugins automatically
- keep Quick Search and Library Search consistent
- separate search logic from UI

---

# Architecture

```
                 Search Index
                      │
                      ▼
             searchNoteDocuments()
                      │
      ┌───────────────┴───────────────┐
      │                               │
      ▼                               ▼
 Quick Search                 Library Search
      │                               │
      ▼                               ▼
 Different UI                  Different UI
```

Only one component is responsible for:

- tokenization
- normalization
- ranking
- snippet selection
- highlighting metadata
- match scoring

Today this lives in:

```
src/lib/noteSearch.ts
```

No component should implement its own search algorithm.

---

# Search Engine Responsibilities

The search engine owns:

- ranking
- matching
- snippets
- scoring
- result ordering

It should know nothing about:

- sidebars
- pages
- dialogs
- cards
- popovers
- layouts

The engine simply receives:

```
documents
query
```

and returns

```
NoteSearchResult[]
```

---

# Search Experiences

Muninn intentionally exposes the search engine through two different user experiences.

These are not the same feature.

---

# 1. Quick Search

Purpose:

Jump to any note as quickly as possible.

Inspired by:

- Obsidian Quick Switcher
- VS Code Quick Open
- macOS Spotlight

Quick Search always searches the **entire vault**.

It ignores:

- categories
- tags
- sorting
- current page

It is intended for users who already know approximately what they are looking for.

Pipeline:

```
Entire Vault
      │
      ▼
searchNoteDocuments()
      │
      ▼
Top ranked results
      │
      ▼
Show first 10
```

Characteristics:

- global
- keyboard-first
- fast
- no browsing
- no filters
- no sort controls

---

# 2. Library Search

Library Search exists inside pages such as:

- All Notes
- Favorites
- Recently Updated

Unlike Quick Search, it operates on the currently selected dataset.

- All Notes → entire vault
- Favorites → favorite notes only
- Recently Updated → recently updated notes only

Category and Tag filters further refine that dataset before the search engine is invoked.

Pipeline:

```
Current Dataset
        │
        ▼
 Category Filter
        │
        ▼
    Tag Filter
        │
        ▼
searchNoteDocuments()
        │
        ▼
 Sort (when no query)
        │
        ▼
     Render
```

Examples:

Entire vault:

```
All Notes
Category = All
Tags = All
Search = server
```

Search only Technology:

```
All Notes
Category = Technology
Search = server
```

Search only Favorites:

```
Favorites
Search = server
```

This allows users to narrow their search scope before searching.

---

# Shared Behaviour

Quick Search and Library Search must always agree on:

- ranking
- snippets
- matching
- highlighting

Searching for the same query should produce the same ordering whenever both operate on the same dataset.

---

# Ranking

Ranking priority should generally follow:

1. Title prefix
2. Title contains
3. Aliases
4. Headings
5. Tags
6. Body
7. Filename

Future ranking improvements should happen inside the search engine only.

---

# Matching Strategy

Different fields intentionally use different matching rules.

Title

- prefix
- contains
- fuzzy

Aliases

- contains
- fuzzy

Headings

- contains
- light fuzzy

Tags

- normalized contains
- no fuzzy

Body

- token matching
- contains
- no aggressive fuzzy

Filename

- contains
- light fuzzy

This avoids noisy matches while still making titles forgiving.

---

# Result Snippets

The displayed snippet should come from the location that produced the highest-ranked match.

Before body sections are indexed, inline Dataview expressions are resolved through `src/lib/inlineDataview.ts` using the note's normalized metadata. Matching and snippet generation therefore operate on the value a reader sees, not source placeholders such as `= this.usecase`. Quick Search and every Library Search surface inherit this behavior from `buildNoteSearchDocuments()`; UI components must not perform a second replacement.

Examples:

If a heading matched:

```
Heading
Server Configuration
```

the snippet should show the heading.

If the body matched:

```
...
Configure Pi-hole
as the primary DNS server.
...
```

the snippet should come from the body.

The snippet should explain *why* the result appeared.

---

# Highlighting

Highlighting should mirror the actual match.

If the search engine matched using normalized text or fuzzy matching, the rendered highlight should represent that match whenever reasonably possible.

Search logic and highlighting should never drift apart.

---

# Presentation-Only Tag Prioritization

Library Browser cards may reorder a display-only copy of their tags so tags matching the active search remain visible inside a compact preview.

This is not search ranking. The rule is:

1. copy the note's source tag array
2. use `tagMatchesNoteSearchQuery()` from `src/lib/noteSearch.ts`
3. stably place matching tags before non-matching tags
4. preserve relative source order inside both groups
5. apply the visual preview limit only after promotion

The component must not mutate normalized note tags, change result ranking, filter additional notes, or implement its own tokenization and normalization.

Tag highlighting must continue to use the shared `highlightSearchText()` helper with the `tag` field. Promotion and highlighting therefore consume the same normalized query semantics, including multiple terms, case folding, Swedish characters, and literal regex-special characters.

If search matching changes, update the shared matcher and its tests first. UI components should consume the revised contract rather than compensate locally.

---

# Result Counts

Quick Search

- displays only the first 10 results
- always reports the total number of matching notes

Example:

```
48 matching notes
```

while only rendering

```
10
```

Library Search renders the complete filtered result set.

---

# Show All Results

Quick Search should preserve the current query.

```
server

↓

/notes?q=server
```

The Library Search page should restore the search automatically.

---

# Search UI

Search logic belongs to the engine.

Presentation belongs to the UI.

The engine should never know whether results are displayed as:

- cards
- rows
- popovers
- dialogs
- lists

---

# Future Extensions

The search engine should be extendable without changing the search UIs.

Possible future indexed fields:

- backlinks
- outgoing links
- block references
- embedded PDFs
- OCR text
- image captions
- frontmatter
- custom plugin metadata

The UI should automatically benefit from these additions because all search experiences consume the same engine.

---

# Architectural Principle

There should always be exactly one implementation of:

- matching
- ranking
- snippet generation
- highlight metadata

Every search experience in Muninn should consume that implementation rather than creating its own.

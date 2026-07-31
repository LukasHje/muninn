# Books Experience

Books is Muninn's first stateful, first-class Digital Bookshelf. It deliberately separates its emotional Home from its practical Library catalogue.

Read `knowledge-vs-experience-state.md` before changing this Experience.

## Ownership

Vault-owned Knowledge State includes title, author, bibliographic metadata, cover references, description, reviews, highlights, links, and authored reading notes. Muninn reads this data and never modifies the vault.

Muninn-owned Experience State includes reading status, personal rating, progress, started and finished dates, favorites, recently opened state, and Books UI preferences. Interactive controls write only through the Local Experience State service.

Existing vault fields that resemble Experience State may be displayed as authored metadata for compatibility, but the Books UI does not use frontmatter as its write target.

## State Model

Books supports four explicit reading states:

- `want-to-read`
- `currently-reading`
- `read`
- `did-not-finish`

An absent state represents an unread, uncategorized book. Rating uses an integer from one through five. Progress is optional and constrained to zero through one hundred percent. Moving a book to Currently Reading sets `startedAt` when absent. Moving it to Read sets `finishedAt`; moving away from Read retains historical timestamps unless a future product decision introduces explicit history editing.

## Composition

### Home

- A warm atmospheric hero owns and renders the Books artwork directly. A dark side gradient and bottom fade preserve the image while keeping the title, description, and statistics readable; the generic Experience artwork layer must not supply or obscure this hero.
- The hero's tinted-glass Read panel contains a status-distribution donut for Read, Currently Reading, Want to Read, and Did Not Finish. It deliberately avoids a legend: the adjacent large percentage communicates only the Read share, while uncategorized books remain a quiet neutral segment. Read completion is a two-layer SVG gauge laid directly on top of the panel's right-hand border radius, with no inset gap. Both the always-visible muted track and the warm progress layer share a tapered profile: full gauge width at the top, narrowing toward the panel's one-pixel border at the bottom. The progress terminates in a tangent-aligned wedge. It follows only that curved edge and must never render as a separate interior bar.
- The Books Experience owns the full content viewport beside the unchanged application sidebar. Hero and shelves run edge to edge without the standard content gutter or glass surfaces.
- Home contains exactly three permanent shelves: Want to Read, Currently Reading, and Read. Do not add genres, dynamic categories, Favorites, or other shelves to Home.
- Each Home shelf shows no more than five books and never more covers than fit in one row. Shelf tracks never scroll horizontally.
- `See all` appears only when the shelf contains more books than Home can display. It enters Library with that shelf's reading-status filter selected.
- Empty shelves retain their position and show library-inspired copy.
- Home owns atmosphere, storytelling, inspiration, reading motivation, and the question “What should I read next?” It never owns search, filters, sorting, or layout controls.

### Library

- Library is a separate catalogue view inside the Books Experience. Entering it removes the hero and the bookshelf metaphor.
- Library uses the same warm palette and typography but contains no wood, shelf boards, furniture simulation, or decorative niches.
- Library owns search, status and rating filters, author and genre browsing, sorting, and grid/list presentation.
- Library may scale to thousands of books; Home must remain visually stable regardless of collection size.
- Returning Home restores the three curated shelves.

### Shared objects

- Book Cards resemble standing books and let cover artwork provide the identity. They never repeat title or author beneath a real cover; a slim status overlay, optional personal rating, and reading-progress line are the only chrome attached to the cover.
- The Books inspector is a dark, book-first object rather than the generic metadata inspector. Cover, identity, local status, rating, progress, and primary actions form one compact header; authored Notes and a restrained two-column Information section follow below.

## Interaction Contract

Status, rating, progress, favorite, filtering, search, sorting, Home/Library navigation, and layout changes update without a page reload. Durable book state survives reload through the Local Experience State service. UI controls must remain usable after lazy inspector insertion and Astro client navigation.

Book selection continues to use the shared Experience inspector lifecycle. The standard Note View remains the authoritative place for reading vault content. The inspector may open that note but never edit Markdown.

Books always enters with its inspector closed, even if a stale selection remains in the URL or browser history. Only an explicit Book Card interaction may open the Books inspector.

## Responsive Contract

Books owns the existing Experience result scroller. Home shelf rows clip cleanly to the available width. Library wraps its catalogue grid or presents a compact list and uses vertical scrolling only. On mobile, covers remain legible, touch targets remain at least 44 pixels where practical, and the inspector uses the shell-owned full-screen overlay.

## Extension Rules

- Add bibliographic aliases in the Books domain adapter, not Astro components.
- Add durable interactions to `BookState` with validation and schema-version consideration.
- Never read or write browser storage directly from a Book Card or inspector.
- Never use frontmatter as a fallback write path.
- Preserve the shared card-selection, inspector, shell, and note-navigation contracts.
- Update this document when the state model or ownership boundary changes.

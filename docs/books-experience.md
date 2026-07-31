# Books Experience

Books is Muninn's first stateful, first-class Digital Bookshelf. It deliberately separates its emotional Home from its practical Library catalogue.

Read `knowledge-vs-experience-state.md` before changing this Experience.

## Ownership

Vault-owned Knowledge State includes title, author, bibliographic metadata, cover references, description, reviews, highlights, links, and authored reading notes. Muninn reads this data and never modifies the vault.

Remote ISBN cover artwork is application-managed enrichment derived from that bibliographic Knowledge State. Muninn proxies Open Library ISBN covers through `/book-covers/{isbn}` and persists validated image responses under its application state directory. The cache never writes into the vault. A cached cover remains available when the upstream service or internet connection is unavailable; an uncached or invalid response falls back to the generated cloth-bound cover.

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
- The hero's tinted-glass Read panel contains a status-distribution donut for Read, Currently Reading, Want to Read, and Did Not Finish. It deliberately avoids a legend: the adjacent large percentage communicates only the Read share, while uncategorized books remain a quiet neutral segment. Read completion is a two-layer SVG gauge laid directly on top of the panel's right-hand border radius, with no inset gap. Both the always-visible muted track and the warm progress layer share a tapered profile: full gauge width at the top, narrowing toward the panel's one-pixel border at the bottom. The progress has a clean, tangent-aligned end rather than a pointed tip. It follows only that curved edge and must never render as a separate interior bar.
- The Books Experience owns the full content viewport beside the unchanged application sidebar. Hero and shelves run edge to edge without the standard content gutter or glass surfaces.
- Home composes its three rows through the reusable `BookShelf` and `BookShelfRow` layout components. Books Home owns the wall background at page level; neither bookshelf component nor any row may paint an opaque row background. `BookShelf` owns one continuous 12–18 pixel left pillar and one continuous right pillar, each built from fixed top and bottom SVG caps with a mid SVG stretched between them. Each `BookShelfRow` owns its horizontally stretching shelf plank and inset slot grid between those pillars. The source SVGs under `src/assets/experiences/books/` own the furniture artwork. Shelf CSS is limited to layout, spacing, positioning, and responsive behavior; it must not recreate wood grain, bevels, borders, pillars, or plank shadows.
- Books render above the bookshelf artwork and overlap the top of each plank slightly, so the covers read as physical objects standing on a continuous piece of furniture. Each plank extends half a pillar width into both side columns, aligning its end centers with the pillar centers and producing a restrained physical overhang. Replacing the three SVG assets must not require changes to card or interaction logic.
- Home contains exactly three permanent shelves: Want to Read, Currently Reading, and Read. Do not add genres, dynamic categories, Favorites, or other shelves to Home.
- Each Home shelf calculates one non-wrapping row from the Books content width after subtracting the pillars and 24–32 pixels of book padding on both sides. Slots use a separate responsive card width and never inherit dimensions from the shelf SVG, so a sparse shelf retains normal-sized books instead of stretching them across the furniture. It targets two or three slots on phones, four to six on tablets, and at most eight on desktop; shelf artwork continues uninterrupted through unused space.
- When a shelf contains more books than its calculated slots, the final slot becomes `See all →` and the remaining slots contain books. That action enters Library with the shelf's reading-status filter selected. A shelf that fits every book does not render the action.
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
- Vault-local cover artwork is served from the vault asset pipeline. ISBN-derived remote artwork is requested only through Muninn's persistent cover route; Book Cards and the inspector must use the same resolved cover URL and fallback behavior.
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

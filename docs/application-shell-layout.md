# Muninn Application Shell Layout

Muninn uses an application-style viewport at every supported screen size. The interface stays anchored to the browser while users interact with independently scrollable content regions. Desktop and mobile use different shell compositions; mobile is not a compressed desktop grid.

This document defines viewport sizing and scroll ownership for Application UI. It complements `docs/ui-boundaries.md`, which defines the separation between Application UI and Markdown UI.

Standard note hero and metadata presentation rules live in `docs/note-reader-ui.md`. This document owns only their relationship to the application shell.

## Design Goal

Muninn should behave like a fixed workspace rather than a long document:

```text
Browser viewport
├── Sidebar
│   ├── Brand, search, and primary navigation
│   ├── Scrollable Experiences list
│   └── Persistent footer controls
└── Main workspace
    └── Feature-owned content and scroll regions
```

The browser page itself should not scroll merely because navigation or result lists contain more items than fit on screen. Long content belongs to the region that owns it.

## Responsive Modes

Muninn intentionally uses two layout modes.

### Desktop application mode

At the `xl` breakpoint and above:

- the application shell is exactly `100dvh` high
- document-level overflow is disabled
- the sidebar is exactly viewport height
- the main workspace fills the remaining grid column
- the main workspace or a feature-owned descendant provides vertical scrolling
- persistent controls remain visible while their content regions scroll

`dvh` is used instead of `vh` so the shell follows the browser's dynamic viewport height.

### Mobile and narrow-screen application mode

Below the `xl` breakpoint:

- the application shell remains exactly `100dvh` high
- the document body does not scroll
- the main workspace is the only permanently visible region and uses the full available width
- a compact shell-owned header exposes navigation and the current page title
- the sidebar becomes an off-canvas drawer instead of occupying a column
- the Experience inspector becomes a full-screen overlay instead of reducing workspace width
- shell overlays lock background interaction and retain the workspace's scroll position
- shell edges and overlays include all relevant safe-area insets

The `xl` breakpoint (`1280px`) is the single shell breakpoint. Components may use the project's existing narrower content breakpoints for card columns or typography, but must not invent independent shell modes.

The mobile shell is conceptually composed as:

```text
Application shell (100dvh)
├── Mobile header
├── Sidebar drawer (conditional)
├── Main workspace
├── Inspector overlay (conditional)
├── Note metadata drawer (conditional)
└── Overlay backdrop
```

## Scroll Ownership

Every desktop region must have one clear vertical scroll owner.

| Region | Fixed content | Scroll owner |
| --- | --- | --- |
| Application shell | Browser-sized frame | None; shell overflow is hidden |
| Sidebar | Brand, Quick Search, primary navigation, footer | Experiences list |
| General main content | Main column | Main workspace |
| Library Browser | Page heading, search, filters, result heading | Result list or grid |
| Experience | Hero, filters, workspace frame | Note browser and inspector content independently |

Avoid accidental chains where the document, main workspace, panel, and list can all scroll in the same direction.

## Application Shell Contract

`src/layouts/MainLayout.astro` owns the viewport contract:

- `body` never acts as the primary scroll container
- the outer shell uses exactly `100dvh` and hides overflow
- the two-column grid inherits the full available height
- the sidebar column has a fixed width
- the main column uses `minmax(0, 1fr)` so content can shrink without forcing horizontal overflow
- the main workspace uses internal vertical scrolling for ordinary pages at every size
- the mobile header, overlay state, background interaction lock, focus management, gestures, and safe-area padding are shell responsibilities

The shell owns only the browser-sized frame. Individual features still own the layout and scrolling inside their workspace.

## Shell Implementation Ownership

`src/layouts/MainLayout.astro` provides the shell structure and overlay mounting layer. `src/components/ApplicationShellClient.ts` is the single client-side controller for global shell overlays.

The controller owns:

- the mutually exclusive overlay state (`none`, `sidebar`, `inspector`, or `metadata`)
- backdrop ownership
- focus movement, trapping, and restoration
- background `inert` state
- workspace scroll capture and restoration
- Escape and pointer gesture handling
- breakpoint cleanup
- shell-level mounting of note metadata overlay UI

Feature components report their state and provide content or triggers. They must not create parallel global modal controllers, additional body scroll locks, independent safe-area systems, or competing overlay backdrops.

The note reader authors its metadata trigger and drawer content, but the shell mounts them into its overlay layer. This prevents note layout, workspace padding, and scroll containers from becoming positioning contexts or reserving reader width.

Astro client navigation reinitializes the shell on `astro:page-load` and clears transient overlay state on `astro:before-swap`. New shell interactions must remain safe across client-side route changes rather than relying only on an initial document load.

## Mobile Header Contract

Below `xl`, the shell provides a compact header that:

- includes a semantic menu button with `aria-controls` and `aria-expanded`
- displays the current view or note title when available
- truncates its title on one line instead of increasing the header height
- respects the top, left, and right safe-area insets
- keeps a minimum 44 by 44 pixel menu target

Experiences must not render substitute shell headers.

## Sidebar Contract

`src/components/Sidebar.astro` is a full-height flex column on desktop.

The following regions are persistent and must not shrink:

- brand
- Quick Search
- primary navigation
- footer and application controls

The Experiences section consumes the remaining flexible space. Its list:

- has a bounded height of approximately five entries
- scrolls vertically when more Experiences exist
- uses native scrolling rather than a JavaScript carousel
- contains overscroll within the sidebar
- leaves sufficient right padding between counts and the scrollbar

Adding Experiences must never push the sidebar footer below the viewport.

On mobile and narrow screens, the same Sidebar component is hosted inside a shell-owned drawer:

- it opens from the left at `88vw`, capped at `22rem`
- the drawer scrolls internally without resetting its scroll position when toggled
- a scrim, close button, or Escape closes it
- a horizontal swipe left closes it
- an optional edge swipe beginning within 24 pixels of the left edge opens it
- swipe recognition waits for a directional movement threshold and does not attach to ordinary horizontal content away from the edge
- focus moves into the drawer, remains trapped while modal, and returns to the opening control

Navigation remains available through the menu button; gestures are never the only mechanism.

## Library Browser Contract

`src/components/VaultNotesBrowser.astro` is shared by:

- All Notes
- Favorites
- Recently Updated

The browser is a full-height flex column at every size:

- the page heading, search, and filter controls are fixed within the workspace
- the Results panel fills the remaining height
- the Results title and count remain visible
- only the result list or grid scrolls

List and grid layouts must share the same scroll container. Filtering, sorting, and search must not change scroll ownership.

Library Browser tag previews are presentation-only and use the available card width for at most two visual rows. Tags retain their natural width and flow across each row; a compact `+N` indicator replaces tags that do not fit and is itself included in the two-row fit. In list layout, the preview spans beneath the title/update row so the update label does not reserve empty space beside the tags. During search, tags matching the full query or any normalized query term are stably promoted before fitting. Source tag arrays and search ranking remain unchanged.

Tag promotion must use the shared matcher documented in `docs/search-engine.md`; Library components may not introduce their own query normalization.

## Experience Contract

`src/components/experiences/ExperienceView.astro` owns a viewport-fitted workspace within the padded main column.

Its height accounts for the vertical padding applied by `MainLayout`. Within the Experience:

- the hero and filter controls remain fixed
- the note browser scrolls vertically
- the inspector frame remains fixed
- inspector content scrolls independently
- the outer Experience canvas hides overflow

Opening the inspector must not transfer scrolling to the document or displace the surrounding application shell.

Below `xl`, the same inspector content is presented by the shell as a full-screen modal overlay:

- it fills `100dvh` and respects every safe-area inset
- its content is the overlay's only vertical scroll owner
- it has a visible close action; Escape is an additional mechanism
- background content is inert and cannot be scrolled or focused
- focus moves into the inspector, is trapped there, and returns to the selected card on close
- opening and closing retains both main-workspace and Experience-list scroll positions

Experience code continues to own selected-note and inspector-content state. It reports whether the inspector is open to the shell; the shell owns modal presentation and coordination.

## Note Metadata Drawer Contract

The Note Metadata Drawer is distinct from the Experience Inspector:

- the Experience Inspector examines a selected item while the user remains in a browse or Experience view
- the Note Metadata Drawer shows properties for the note currently open in the reader
- the Sidebar Drawer provides global navigation

The note reader provides a semantic trigger and reusable metadata content. The application shell mounts both into its overlay layer and owns the drawer's modal presentation, positioning, backdrop, focus handling, inert state, scroll lock, safe areas, and gestures. Shell-level mounting prevents workspace padding and note layout from offsetting the trigger or reserving content width on mobile and desktop. When the workspace has a vertical scrollbar, the shell offsets the trigger only by the measured scrollbar rail so the control remains edge-bound without covering scrolling UI.

The Note Metadata Drawer:

- enters from the right on mobile and desktop
- uses up to `92vw` on narrow screens and a fixed `26rem` width on desktop
- has a visible close button and an independently scrolling content region
- can optionally open from a 24-pixel right-edge swipe and close with a rightward swipe
- excludes code, tables, galleries, media, and other horizontal controls from gesture capture
- preserves the main workspace's exact scroll position while open
- reuses `NoteProperties` and, for cover layouts, the existing note image presentation
- can also be opened from the note hero's `+N` tag-overflow button; closing restores focus to that button

The note hero keeps a compact four-tag preview below the desktop breakpoint. At desktop width, tags use one measured row capped to the same `max-w-3xl` width as the hero description. Any tags that do not fit are represented by the interactive `+N` metadata trigger.

Normal note layouts no longer append or reserve a column for the full properties/image metadata panel. Metadata remains available to parsing, search, Experiences, and other consumers; only its standard reader presentation changes.

## Overlay Coordination

Only one modal shell overlay may be active:

- opening the inspector closes the drawer first
- opening the drawer requests that an active inspector close
- opening note metadata closes the mobile sidebar drawer and requests that an active inspector close
- opening either the sidebar or inspector closes note metadata
- selecting a sidebar link closes the drawer before client navigation
- route changes clear all transient shell overlay state
- breakpoint changes clear modal metadata state and remove stale inert or transform state
- backdrop presses close whichever drawer currently owns the backdrop

Muninn does not add synthetic history entries solely for overlays. Browser Back therefore follows the existing route state. Close controls, Escape, and the drawer backdrop are deterministic; history interception should only be added later if overlay selection becomes part of a centralized route-state model.

Background locking uses the fixed shell plus `inert` on regions outside the active modal. Scroll positions are recorded before an overlay opens and restored without scrolling focused controls into view.

## Safe Areas and Motion

The viewport metadata enables `viewport-fit=cover`. The shell applies `env(safe-area-inset-*)` to:

- the mobile header
- main workspace edges
- sidebar drawer edges
- the full-screen inspector
- note metadata drawer edges and scroll content

Animations and gesture access must respect `prefers-reduced-motion`. Reduced motion shortens visual transitions without removing semantic controls.

## Implementation Rules

When building or changing a desktop feature screen:

1. Decide which element owns vertical scrolling.
2. Give every flex or grid ancestor between the viewport and that element a constrained height.
3. Use `min-h-0` on flexible descendants that must be allowed to shrink.
4. Use `overflow-hidden` on frames that must remain fixed.
5. Use `overflow-y-auto` only on the intended scroll owner.
6. Use `overscroll-contain` where scrolling should remain within the region.
7. Keep headers and persistent controls outside the scroll owner with `shrink-0` where necessary.
8. Keep viewport, safe-area, drawer, overlay, and background-lock behavior in the application shell rather than Experiences.
9. Use the shared `xl` shell breakpoint rather than scattering alternative shell thresholds.

Do not solve viewport layout with JavaScript measurements when CSS grid, flexbox, `dvh`, and overflow ownership are sufficient.

Muninn currently permits two narrow measurement exceptions:

- count-aware tag previews measure natural-width items so a correct `+N` control fits without cutting a tag
- the shell measures the workspace scrollbar rail so the fixed metadata trigger sits beside it rather than covering it

These measurements refine presentation after CSS has established ownership and dimensions. They must not determine shell height, invent breakpoints, resize the main workspace, or become a general layout engine. On platforms with overlay scrollbars, the desktop metadata trigger uses a small fallback inset only while vertical overflow exists.

## Common Failure Modes

### Footer leaves the viewport

Cause: sidebar content grows in normal flow.

Fix: keep the sidebar height constrained, make persistent regions non-shrinking, and assign overflow to the Experiences list.

### Whole page scrolls behind a list

Cause: the intended list has no constrained ancestor height, so it expands the document.

Fix: propagate height constraints through the parent flex/grid chain and put `overflow-y-auto` on the list.

### Nested double scrollbars

Cause: both a parent panel and its child list own vertical overflow.

Fix: choose one owner. The parent should normally use `overflow-hidden`, while the content region uses `overflow-y-auto`.

### Content refuses to shrink

Cause: a flex or grid child retains its default minimum content height.

Fix: add `min-h-0` to the appropriate flexible ancestor or child.

### Mobile content is clipped

Cause: a content region expands inside the fixed shell instead of assigning overflow to its intended internal owner.

Fix: propagate `min-h-0`, retain the fixed shell, and assign scrolling to the workspace, result list, drawer, or inspector content as appropriate.

## Verification Checklist

Viewport-related changes should be checked at minimum in these states:

- desktop with a short viewport
- desktop with more than five Experiences
- All Notes with enough results to overflow
- Favorites with empty and overflowing result sets
- Recently Updated with overflowing results
- Experience view with the inspector closed and open
- `393 × 852` mobile portrait with drawer and inspector closed/open
- `430 × 932` larger mobile portrait
- `852 × 393` landscape phone
- a narrow tablet width
- drawer close by button, scrim, Escape, and swipe
- metadata drawer open from the trigger and close by button, scrim, Escape, and swipe
- focus containment and restoration for drawer, inspector, and note metadata
- note-reader scroll preservation while metadata is open
- safe-area top and bottom spacing
- no horizontal viewport overflow

The expected result at every size is the same: the shell stays anchored, persistent controls remain visible, and only the region containing excess content scrolls. Experiences provide content and actions; they do not create independent viewport, drawer, overlay, safe-area, or gesture systems.

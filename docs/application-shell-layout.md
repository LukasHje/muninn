# Muninn Application Shell Layout

Muninn uses an application-style viewport on desktop. The interface should feel anchored to the browser while users interact with independently scrollable content regions.

This document defines viewport sizing and scroll ownership for Application UI. It complements `docs/ui-boundaries.md`, which defines the separation between Application UI and Markdown UI.

## Design Goal

Desktop Muninn should behave like a fixed workspace rather than a long document:

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

### Mobile and narrow-screen document mode

Below the `xl` breakpoint:

- normal document flow is preserved
- the sidebar and main content stack naturally
- page height is content-driven
- the browser document remains the primary scroll container
- desktop-only fixed heights and nested scroll constraints must not be imposed

This distinction avoids forcing an app-shell interaction model onto screens where stacked document flow is more usable.

## Scroll Ownership

Every desktop region must have one clear vertical scroll owner.

| Region | Fixed content | Scroll owner |
| --- | --- | --- |
| Application shell | Browser-sized grid | None; shell overflow is hidden |
| Sidebar | Brand, Quick Search, primary navigation, footer | Experiences list |
| General main content | Main column | Main workspace |
| Library Browser | Page heading, search, filters, result heading | Result list or grid |
| Experience | Hero, filters, workspace frame | Note browser and inspector content independently |

Avoid accidental chains where the document, main workspace, panel, and list can all scroll in the same direction.

## Application Shell Contract

`src/layouts/MainLayout.astro` owns the desktop viewport contract:

- `body` prevents document-level overflow at `xl`
- the outer shell uses `h-dvh` and hides overflow
- the two-column grid inherits the full available height
- the sidebar column has a fixed width
- the main column uses `minmax(0, 1fr)` so content can shrink without forcing horizontal overflow
- the main workspace uses internal vertical scrolling for ordinary pages

The shell owns only the browser-sized frame. Individual features still own the layout and scrolling inside their workspace.

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

## Library Browser Contract

`src/components/VaultNotesBrowser.astro` is shared by:

- All Notes
- Favorites
- Recently Updated

On desktop, the browser is a full-height flex column:

- the page heading, search, and filter controls are fixed within the workspace
- the Results panel fills the remaining height
- the Results title and count remain visible
- only the result list or grid scrolls

List and grid layouts must share the same scroll container. Filtering, sorting, and search must not change scroll ownership.

## Experience Contract

`src/components/experiences/ExperienceView.astro` owns a viewport-fitted workspace within the padded main column.

Its height accounts for the vertical padding applied by `MainLayout`. Within the Experience:

- the hero and filter controls remain fixed
- the note browser scrolls vertically
- the inspector frame remains fixed
- inspector content scrolls independently
- the outer Experience canvas hides overflow

Opening the inspector must not transfer scrolling to the document or displace the surrounding application shell.

## Implementation Rules

When building or changing a desktop feature screen:

1. Decide which element owns vertical scrolling.
2. Give every flex or grid ancestor between the viewport and that element a constrained height.
3. Use `min-h-0` on flexible descendants that must be allowed to shrink.
4. Use `overflow-hidden` on frames that must remain fixed.
5. Use `overflow-y-auto` only on the intended scroll owner.
6. Use `overscroll-contain` where scrolling should remain within the region.
7. Keep headers and persistent controls outside the scroll owner with `shrink-0` where necessary.
8. Apply fixed-height behavior only at the desktop breakpoint unless the mobile interaction is explicitly designed for it.

Do not solve viewport layout with JavaScript measurements when CSS grid, flexbox, `dvh`, and overflow ownership are sufficient.

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

Cause: desktop viewport constraints were applied without a responsive breakpoint.

Fix: preserve content-driven height and normal document scrolling below `xl`.

## Verification Checklist

Viewport-related changes should be checked at minimum in these states:

- desktop with a short viewport
- desktop with more than five Experiences
- All Notes with enough results to overflow
- Favorites with empty and overflowing result sets
- Recently Updated with overflowing results
- Experience view with the inspector closed and open
- mobile or narrow layout using normal document scrolling

The expected desktop result is always the same: the shell stays anchored, persistent controls remain visible, and only the region containing excess content scrolls.

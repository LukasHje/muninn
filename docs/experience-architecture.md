# Experience Architecture

Muninn Experiences are data-driven application surfaces over the unified Vault note model.

```text
Vault
    ↓
Selector Engine
    ↓
Matching Notes
    ↓
Experience Definition
    ↓
Landing Page
    ↓
Card Family
    ↓
Feature Extraction (when supported by the Card Family)
    ↓
Inspector
    ↓
Rendered Experience
```

The browser consumes an `ExperienceDefinition`. It must not know how an Experience discovers notes or contain branches for individual Experience ids.

## Registry

Every Experience is registered centrally in `src/lib/experiences/registry.ts` and defines:

- `id`
- `title` and description
- `selector`
- `theme`
- sidebar and hero icons
- hero and placeholder assets
- route and Library link
- Card Family
- filter, statistics, metadata, and section preferences
- optional landing page override
- optional inspector override

Gear provides a custom landing page, Product Card, and inspector. Recipes provides a custom editorial landing page, Recipe Card, dashboard, and inspector. Vehicles provides a thematic landing page, Vehicle Card, dashboard, and inspector as the reference pattern for the next-generation domain Experiences. Travel, Books, Technology, and Homelab use the Default Experience implementation until their own typed presentation layers exist.

## Default Experience

An Experience without a component override receives:

- Default landing page
- Default hero
- registered sidebar and hero icons
- Generic Note Card
- Default inspector
- default metadata presentation

This fallback makes a newly registered Experience browsable before it receives a custom design. Adding an Experience must not require modifying the browser.

## Selector Engine

Selectors abstract note discovery from presentation. The currently supported selectors are:

### Frontmatter

```ts
{
  type: "frontmatter",
  field: "type",
  value: "gear"
}
```

Frontmatter matching is case-insensitive. Both note fields and selector values may be scalar or lists, allowing aliases such as `value: ["recipes", "recept"]` without domain-specific matcher code.

### Path

```ts
{
  type: "path",
  value: "07 Mitt homelab"
}
```

Path values are relative to the Vault root. Matching includes every note recursively below that path and respects path-segment boundaries.

Future selector types may include tag, folder, filename, glob, and logical AND/OR/NOT composition. New selector behavior belongs in the selector engine, never in routes, browser components, or the registry consumer.

## UI Resolution

Landing pages and inspectors use registered component keys. A resolver selects the requested override or the Default component. Card rendering follows the same principle through `cardFamily`.

No resolver may branch on `definition.id`. The definition chooses behavior declaratively.

## Artwork Workspace

`ExperienceLandingRenderer` wraps every resolved landing page in the shared `ExperienceArtworkWorkspace`. This wrapper owns the decorative layer between the Application Shell and `ExperienceView`:

- registered hero artwork is painted from the top edge of the main workspace;
- a shared readability veil protects left-aligned hero content;
- the artwork fades through the fixed Experience chrome into the normal canvas background;
- missing artwork receives a theme-derived fallback without changing the layout contract.

Hero components own only foreground content such as title, description, statistics, and filters. They must remain transparent and must not load or paint `definition.assets.heroArtwork` themselves. Custom landing pages also must not reproduce the workspace wrapper; central ownership ensures that Default and future Experiences inherit the same presentation automatically.

## Dashboard Composition

An Experience may provide a dashboard through the named `dashboard` slot in `ExperienceView`. The shared dashboard primitives own horizontal overflow, snap behavior, widget dimensions, and compact metadata or note lists. A domain landing page composes those primitives and supplies its domain model; it must not create a second browser, overlay controller, or viewport system.

The dashboard is part of the fixed Experience chrome. The existing Library workspace remains the only vertical scroll owner. On narrow screens, dashboard widgets scroll horizontally so they do not consume unbounded vertical space. In a short landscape viewport, the optional dashboard may be omitted and the hero compressed to protect a usable Library scroll region; discovery chrome must never reduce the Library to zero height.

## Filters and Statistics

Metadata filters are multi-value aware. A note matches when any normalized value for the configured field equals the requested filter value. Option counts count a note once per distinct value, even when aliases such as singular and plural frontmatter keys are merged.

Statistics are registry-defined. `metadata-breakdown` provides the Default and Gear behavior; `summary` composes reusable totals such as favorites, unique metadata values, and unique tags. New Experiences should extend these declarative metrics instead of adding Experience-id checks to the statistics pipeline.

An Experience may hide the generic metadata filter row when a custom dashboard owns the visible filter controls. Those controls must still write normal Experience filter parameters and use the shared filter pipeline. Recipes uses this for its derived `recipe_kind` dashboard category buttons. Vehicles uses the same contract for garage dashboard controls, writing normal `vehicle_status`, `vehicle_category`, `drivetrain`, and `fuel` filter parameters back into the shared filter pipeline.

The Vehicles dashboard presents Wishlist and Planned as the single canonical `planned` state. For those planned vehicles, `target_drivetrain`, `target_fuel`, and `target_transmission` act as fallbacks when the corresponding actual specification is absent; owned vehicles continue to prefer `drivetrain`, `fuel`, and `transmission`. Its visible body-style list is limited to the five most common raw values. The filter controller instead uses the derived `vehicle_category` dimension, which groups related body-style variants such as bicycle subtypes into one canonical category while preserving the raw metadata for cards and inspectors. Missing drivetrain metadata is grouped as `Other`, and the drivetrain visualization is generated from the current vault snapshot without a chart dependency.

## Boundaries

- The Registry owns Experience configuration, not matching algorithms.
- The Selector Engine owns note discovery, not presentation.
- The Browser owns filtering, selection, and interaction, not domain rules.
- Card Families own card hierarchy and feature presentation.
- Dashboard models own domain-specific aggregation; dashboard primitives own reusable presentation.
- Inspectors own contextual application UI, not the authoritative Note View.
- Markdown rendering remains owned by the rendering pipeline.

## Domain Adapters

When an Experience needs domain-specific metadata, implement a small adapter under `src/lib/experiences/` rather than parsing frontmatter inside Astro components. The adapter should:

- normalize aliases and optional fields into a stable typed model;
- expose dashboard/statistics helpers that consume `LibraryItem[]`;
- return `null` or empty arrays for missing data instead of inventing values;
- preserve the shared selector, filter, note-selection, favorite, and inspector contracts.

Vehicles follows this pattern in `src/lib/experiences/vehicles.ts`. Future Travel, Books, and Homelab implementations should follow the same slice rather than branching on `definition.id` inside the shared browser.

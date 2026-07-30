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

Gear provides a custom landing page, Product Card, and inspector. Recipes provides a custom editorial landing page, Recipe Card, dashboard, and inspector. Vehicles provides a thematic landing page, Vehicle Card, dashboard, and inspector as the reference pattern for the next-generation domain Experiences. Homelab provides a path-aware adapter, infrastructure dashboard, and Node Card while retaining Generic Note Cards for non-node documentation. Travel, Books, and Technology use the Default Experience implementation until their own typed presentation layers exist.

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

All Experience hero titles and descriptions use the shared serif hero typography. Individual Experiences may adjust scale and spacing, but must not replace that common editorial type identity with a domain-specific font stack.

## Dashboard Composition

An Experience may provide a dashboard through the named `dashboard` slot in `ExperienceView`. The shared dashboard primitives own horizontal overflow, snap behavior, widget dimensions, and compact metadata or note lists. A domain landing page composes those primitives and supplies its domain model; it must not create a second browser, overlay controller, or viewport system.

The dashboard is part of the fixed Experience chrome. The existing Library workspace remains the only vertical scroll owner. On narrow screens, dashboard widgets scroll horizontally so they do not consume unbounded vertical space. In a short landscape viewport, the optional dashboard may be omitted and the hero compressed to protect a usable Library scroll region; discovery chrome must never reduce the Library to zero height.

On phone-sized viewports, `ExperienceView` owns one shared discovery-panel toggle around the hero, statistics, filters, browser controls, and optional dashboard. The expanded panel exposes a top-right collapse action; the collapsed presentation is a single compact row that restores the complete panel. This is presentation state only: it must not enter the URL, reset filters, replace domain controls, or introduce another scroll owner. Individual Experiences may style their content inside the panel, but must not implement a separate mobile collapse controller.

Recipes uses a compact seven-metric overview followed by a cuisine percentage distribution instead of the general widget carousel. The overview may overflow horizontally on narrow screens, but remains fixed Experience chrome and does not acquire vertical scroll ownership.

## Filters and Statistics

Metadata filters are multi-value aware. A note matches when any normalized value for the configured field equals the requested filter value. Option counts count a note once per distinct value, even when aliases such as singular and plural frontmatter keys are merged.

Statistics are registry-defined. `metadata-breakdown` provides the Default and Gear behavior; `summary` composes reusable totals such as favorites, unique metadata values, and unique tags. New Experiences should extend these declarative metrics instead of adding Experience-id checks to the statistics pipeline.

An Experience may hide the generic metadata filter row when a custom dashboard owns the visible filter controls. Those controls must still write normal Experience filter parameters and use the shared filter pipeline. Recipes uses this for its compact recipe-kind metrics and cuisine distribution. Vehicles uses the same contract for garage dashboard controls, writing normal `vehicle_status`, `vehicle_category`, `drivetrain`, and `fuel` filter parameters back into the shared filter pipeline.

The Vehicles dashboard presents Wishlist and Planned as the single canonical `planned` state. For those planned vehicles, `target_drivetrain`, `target_fuel`, and `target_transmission` act as fallbacks when the corresponding actual specification is absent; owned vehicles continue to prefer `drivetrain`, `fuel`, and `transmission`. Its visible body-style list is limited to the five most common raw values. The filter controller instead uses the derived `vehicle_category` dimension, which groups related body-style variants such as bicycle subtypes into one canonical category while preserving the raw metadata for cards and inspectors. Missing drivetrain metadata is grouped as `Other`, and the drivetrain visualization is generated from the current vault snapshot without a chart dependency.

## Browser Controls

Every Experience uses `ExperienceBrowserControls`, which composes the shared `ExperienceSortControls` and `ExperienceLayoutControls`. Domain dashboards may choose where the controller is composed, but must not implement their own sorting, grid/list toggles, labels, query parsing, or navigation logic. The shared components expose CSS custom properties for local sizing or thematic treatment; domain-specific styling must not duplicate behavior or markup.

The URL contract is:

- `sort=updated|created|title`
- `order=asc|desc`
- `layout=grid|list`

The shared controller exposes two sort buttons. Its date button cycles through updated newest, updated oldest, created newest, and created oldest. The alphabetical button toggles between A–Z and Z–A. Grid and list buttons switch the shared Experience card-list layout. Browser-control navigation preserves active filters while clearing inspector selection and transient Experience scroll state.

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

Homelab follows the same adapter boundary in `src/lib/experiences/homelab.ts` and classifies each note along independent dimensions: Entity, Lifecycle, Operational Status, and Card Kind. Entity describes what the note represents and prioritizes explicit `entity` or `type` frontmatter over filename, semantic folder, and content heuristics. Lifecycle describes organizational state and prioritizes explicit `lifecycle` frontmatter before the `Current`, `Planned`, `To_Upgrade`, and `Archived_Specs` path segments. Operational Status prioritizes explicit `status` frontmatter and only then falls back from Lifecycle. Muninn's globally inferred normalized note type is not explicit Homelab frontmatter and must not suppress Homelab heuristics.

Homelab normalizes governance notes to Documentation. A governance document may describe servers, NAS devices, networking, or other infrastructure without representing those entities itself; its referenced hardware terms must therefore never promote it to a Node Card.

Card Kind is a pure presentation mapping from Entity. Machine entities resolve to Node, Service to Service, Display/UPS/Part/Specification to Specification, Dashboard to Dashboard, and Documentation to Documentation. Lifecycle folders never choose cards: Current does not imply Server, Parts Database never automatically produces Nodes, and Archived preserves the original Entity. This behavior is private to Homelab; it is not a global note classification contract.

The Homelab dashboard's Service Split counts unique service roots rather than individual Markdown files. It prefers explicit `service_category` or `category` metadata, then derives the categories Applications, Media, Utilities, Monitoring, Networking, Storage, Development, Automation, Security, Infrastructure, and Other from service identity, tags, and content. `Self-hosted Applications` and its singular variants normalize to Applications. Multiple notes below one service folder contribute one service to the split.

Service identity comes from the service note itself, not an organizational category folder below `Services`. A concrete service note uses its note title, so `Services/Monitoring/Prometheus.md` resolves to Prometheus. Generic roots such as `Index.md`, `Overview.md`, `Service.md`, and `README.md` instead use their immediate parent folder, so `Services/Monitoring/Grafana/Index.md` resolves to Grafana. The same identity resolver owns Service Card titles and unique-service dashboard counts.

The Services metric displays the total number of unique documented services. Its footer separately counts unique services for which at least one note explicitly declares `status: active`; missing status is not interpreted as active.

Homelab presents dashboard metrics as individual sibling panels rather than wrapping statistics and controls in one visual container. The statistics row owns horizontal overflow, and Technologies remains a single non-wrapping badge row with its own horizontal scroll. Filters and shared browser controls sit in separate sibling surfaces below the statistics row.

Homelab exposes `homelab_entity`, `homelab_lifecycle`, and `homelab_status` as separate filter dimensions. Dashboard entity and lifecycle counts consume the same classification object used by cards and inspectors. The legacy `homelab_kind` metadata lookup remains an entity alias for compatibility, but new UI and URLs use `homelab_entity`.

The Homelab hero exposes compact Node, Service, Specification, and Documentation totals without increasing the shared hero height. Its overview is a fixed-height, horizontally scrolling row of independent distribution panels. Node, service, platform, and documentation panels are derived from existing classification and metadata. Storage is conditional and appears only when useful storage facts can be inferred; Technologies remains a one-line horizontally scrollable chip list.

Homelab inspector relationships are read-only navigation. They may be inferred from explicit host and installation fields, wikilinks and backlinks, filenames, and stable identities such as hostname. Missing or ambiguous relationships are omitted rather than introducing vault editing or organization workflows.

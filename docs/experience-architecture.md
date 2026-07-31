# Experience Architecture

Muninn Experiences are data-driven application surfaces over the unified Vault note model.

All Experiences follow the project-wide [Knowledge State vs Experience State](knowledge-vs-experience-state.md) ownership model. Vault-authored information is read-only Knowledge State. Interaction data and application preferences are Experience State owned by Muninn. An Experience may combine them for presentation, but must not blur their ownership or write Experience State into the vault.

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

Gear provides a custom landing page, Product Card, and inspector. Recipes provides a custom editorial landing page, Recipe Card, dashboard, and inspector. Vehicles provides a thematic landing page, Vehicle Card, dashboard, and inspector as the reference pattern for the next-generation domain Experiences. Books provides a custom Digital Bookshelf, Book Card, local reading state, and inspector. Homelab provides a path-aware adapter, infrastructure dashboard, and Node Card while retaining Generic Note Cards for non-node documentation. Travel and Technology use the Default Experience implementation until their own typed presentation layers exist.

Books deliberately changes presentation at the phone breakpoint. Desktop and tablet enter through the curated bookshelf Home, while phones enter directly into the Library catalogue and do not render the furniture metaphor. The phone Library retains the atmospheric, shared collapsible Experience Hero and exposes its filter chips as a horizontally scrollable control strip. Hero statistics and filter controls may scroll horizontally, but must never introduce vertical scrolling inside their rows.

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

On phone-sized viewports, `ExperienceView` owns one shared discovery-panel toggle around the hero, statistics, filters, browser controls, and optional dashboard. The expanded Hero exposes a top-right collapse action. Collapsing compresses that same atmospheric Hero into a 70–100 pixel dashboard header: registered artwork remains cropped behind a dark gradient, while title, up to three summary statistics, and the full-width `Overview & Filters` affordance remain visible. It must never be replaced by a separate white accordion or disclosure card. This is presentation state only: it must not enter the URL, reset filters, replace domain controls, or introduce another scroll owner. Individual Experiences may style their content inside the panel, but must not implement a separate mobile collapse controller.

The compact preference is session-scoped per Experience so filter, sorting, layout, and inspector navigation within the same Experience retain the chosen Hero size. Navigating to another application surface clears that Experience preference; returning later starts expanded.

Recipes uses a compact seven-metric overview followed by a cuisine percentage distribution instead of the general widget carousel. The overview may overflow horizontally on narrow screens, but remains fixed Experience chrome and does not acquire vertical scroll ownership.

## Filters and Statistics

Metadata filters are multi-value aware. A note matches when any normalized value for the configured field equals the requested filter value. Option counts count a note once per distinct value, even when aliases such as singular and plural frontmatter keys are merged.

Statistics are registry-defined. `metadata-breakdown` provides the Default and Gear behavior; `summary` composes reusable totals such as favorites, unique metadata values, and unique tags. New Experiences should extend these declarative metrics instead of adding Experience-id checks to the statistics pipeline.

An Experience may hide the generic metadata filter row when a custom dashboard owns the visible filter controls. Those controls must still write normal Experience filter parameters and use the shared filter pipeline. Recipes uses this for its compact recipe-kind metrics and cuisine distribution. Vehicles uses the same contract for garage dashboard controls, writing normal `vehicle_status`, `vehicle_category`, `drivetrain`, and `fuel` filter parameters back into the shared filter pipeline.

The Vehicles dashboard presents Wishlist and Planned as the single canonical `planned` state, while `previously-owned` and equivalent former-ownership values participate in the canonical `owned` state. For planned vehicles, `target_drivetrain`, `target_fuel`, and `target_transmission` act as fallbacks when the corresponding actual specification is absent; owned vehicles continue to prefer `drivetrain`, `fuel`, and `transmission`. Its visible body-style list is limited to the five most common raw values. Those raw labels link through the derived `vehicle_category` dimension, which groups related body-style variants such as bicycle subtypes into one canonical filter category while preserving the raw metadata for cards and inspectors. Motorcycle signals take precedence over generic cycle wording so Motorcycle and Bicycle remain disjoint categories. Missing drivetrain metadata is grouped as `Other`, and the drivetrain visualization is generated from the current vault snapshot without a chart dependency.

Vehicles uses a compact fixed dashboard rhythm so statistics and controls do not consume the card browser's vertical workspace. Statistic panels keep dense labels, values, and distribution rows within a roughly six-rem strip, followed by a single compact filter and browser-control row. The statistic strip owns horizontal overflow only; vertical gestures and scrolling remain outside that strip. This compression may reduce internal spacing and control chrome, but it must not remove metrics, filters, sorting, or layout actions.

## Browser Controls

Every Experience uses `ExperienceBrowserControls`, which composes the shared `ExperienceSortControls` and `ExperienceLayoutControls`. Domain dashboards may choose where the controller is composed, but must not implement their own sorting, grid/list toggles, labels, query parsing, or navigation logic. The shared components expose CSS custom properties for local sizing or thematic treatment; domain-specific styling must not duplicate behavior or markup.

The URL contract is:

- `sort=updated|created|title`
- `order=asc|desc`
- `layout=grid|list`

The shared controller exposes two sort buttons. Its date button cycles through updated newest, updated oldest, created newest, and created oldest. The alphabetical button toggles between A–Z and Z–A. Grid and list buttons switch the existing card-list presentation in place without refreshing or rerendering the Experience page; the URL parameter is replaced so reloads retain the selected layout. The toggle preserves active filters while clearing inspector selection and transient Experience scroll state. Subsequent same-Experience filter and sorting navigation must read the live card-list layout rather than stale link parameters rendered before an in-place toggle.

## Boundaries

- Knowledge State belongs to the vault and is read-only to Muninn.
- Experience State belongs to Muninn and must never be written into Markdown or other vault files.
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

Vehicles, Books, and Homelab follow this pattern in their domain adapters. Future Travel and Technology implementations should follow the same slice rather than branching on `definition.id` inside the shared browser.

Homelab follows the same adapter boundary in `src/lib/experiences/homelab.ts` and classifies each note along independent dimensions: Entity, Lifecycle, Operational Status, and Card Kind. Entity describes what the note represents and normally prioritizes explicit `entity` or `type` frontmatter over filename, semantic folder, and content heuristics. `07.00 Dashboard`, `07.01 Infrastructure`, `07.04 Knowledgebase`, and `07.97 Resources` are deliberate exceptions: they are semantic documentation boundaries, so every descendant is Documentation even when a guide mentions machines, has a dashboard-like filename, or contains object-like metadata. Lifecycle describes organizational state and prioritizes explicit `lifecycle` frontmatter before the `Current`, `Planned`, `To_Upgrade`, and `Archived_Specs` path segments. Operational Status prioritizes explicit `status` frontmatter and only then falls back from Lifecycle. Muninn's globally inferred normalized note type is not explicit Homelab frontmatter and must not suppress Homelab heuristics.

`07.05 Hardware_specs` is the exclusive source of physical hardware inventory. Server, NAS, Workstation, Mini PC, Router, Switch, VM, Raspberry Pi, Display, UPS, Part, and Specification classification is valid only inside that inventory subtree, including its lifecycle folders. Hardware frontmatter or vocabulary elsewhere describes equipment and resolves to Documentation rather than creating a duplicate inventory object. Within Hardware_specs, Display, UPS, Part, and Specification continue to map to Specification Cards independently of Node rendering.

### Classification Precedence

Homelab Entity classification is deterministic and evaluates rules in this order:

1. **Documentation boundaries.** Every descendant of `07.00 Dashboard`, `07.01 Infrastructure`, `07.04 Knowledgebase`, and `07.97 Resources` is Documentation. This rule is absolute and wins over frontmatter, filenames, categories, and content. Therefore `type: server` under `07.01 Infrastructure` still produces a Documentation Card.
2. **Explicit Entity.** Outside those boundaries, explicit `entity` or `type` frontmatter is normalized first. An explicit hardware inventory Entity is accepted only inside `07.05 Hardware_specs`; outside the inventory it is demoted to Documentation. Explicit non-inventory entities retain their normal mapping.
3. **Safe structural and identity rules.** Inside Hardware_specs, `Parts_Database` produces Part, while unambiguous display, UPS, APC backup-system, and component filenames may produce Specification entities. Those inventory rules never run outside Hardware_specs. Dashboard-like filenames may produce Dashboard outside protected documentation roots and the Inspiration subtree. These rules run before broad semantic inference because their signals describe note identity rather than incidental prose.
4. **Services boundary.** Under `07.02 Services`, a recognized service root or service Index produces Service; its subordinate configuration, exporter, dashboard, and reference notes produce Documentation. Machine language inside either form can never produce a Node. An explicit machine type in the Services subtree is likewise constrained by the Hardware_specs rule and resolves to Documentation.
5. **Inventory gate.** If no earlier rule matched and the note is outside `07.05 Hardware_specs`, classification stops at Documentation. Physical inventory heuristics never run outside the hardware inventory.
6. **Conservative hardware heuristics.** Only inside Hardware_specs may title, role, category, OS, hostname, CPU/RAM presence, and a small set of machine terms infer NAS, Raspberry Pi, Mini PC, Workstation, Router, Switch, VM, Server, or a generic Specification.
7. **Generic fallback.** Anything still unresolved becomes Documentation.

The folder boundaries exist because documentation frequently describes hardware without representing inventory. Hardware inventory is folder-scoped so a single physical, planned, or archived object has one authoritative home and references elsewhere cannot create duplicate Nodes or Specification objects. Heuristics are intentionally conservative: they run only after stronger structural and explicit signals, and physical inventory heuristics are unavailable outside Hardware_specs.

`category` is not an Entity override. Once a note has safely classified as Service, explicit `service_category` or `category` is normalized to choose its service distribution and artwork; only then may service-category heuristics run. Lifecycle and Operational Status are independent dimensions: explicit lifecycle/status metadata has priority within those dimensions, but neither can change Entity or Card Kind.

Homelab normalizes governance notes to Documentation. A governance document may describe servers, NAS devices, networking, or other infrastructure without representing those entities itself; its referenced hardware terms must therefore never promote it to a Node Card.

Card Kind is a pure presentation mapping from Entity. Machine entities resolve to Node, Service to Service, Display/UPS/Part/Specification to Specification, Dashboard to Dashboard, and Documentation to Documentation. Lifecycle folders never choose cards: Current does not imply Server, Parts Database never automatically produces Nodes, and Archived preserves the original Entity. This behavior is private to Homelab; it is not a global note classification contract.

### Device Type and Form Factor

Homelab keeps semantic identity separate from physical appearance. The explicit `type` or `entity` field answers **“What is this device?”** and continues to own Entity and Card Kind. The optional `form_factor` field answers **“What does this device look like?”** and influences curated artwork only. It must never promote, demote, or reclassify a note.

Present form factors are exposed as a separate `homelab_form_factor` filter dimension for Node Cards. A Laptop filter therefore selects workstation or server Nodes whose normalized form factor is Laptop without changing their Entity, node-distribution category, or behavior.

For example, `type: workstation` remains a Workstation Node whether `form_factor` is `desktop`, `laptop`, or `all-in-one`. Likewise, a Server may use `rack`, `rackmount`, `tower`, `mini-pc`, or `embedded` artwork without changing its Server identity. Supported normalized form factors include desktop, laptop, all-in-one, tower, rack, mini-pc, handheld, appliance, and embedded, with common aliases such as notebook, AIO, rackmount, SFF, edge-device, and IoT. Embedded covers compact edge nodes such as Pi-class boards, ESP gateways, AI satellites, and sensor nodes; it describes their construction rather than creating a new semantic Entity.

Artwork selection is registry-driven and resolves from both Entity and normalized form factor. Exact combinations such as `server:rack`, `server:tower`, `server:desktop`, `workstation:laptop`, and `workstation:all-in-one` receive stable artwork keys. `server:desktop` represents a low-profile horizontal desktop/HTPC-style server and is intentionally distinct from both a Tower Server and Desktop Workstation. If an exact pair is unavailable, the resolver uses the form factor's generic artwork, then existing role/category overrides such as NAS or Raspberry Pi, then the Entity default, and finally the generic Experience fallback. Missing or unrecognized `form_factor` values therefore preserve backwards-compatible type and role behavior.

The form-factor type is intentionally open rather than a closed Entity enum. Adding thin-client, blade, wearable, kiosk, vehicle-mounted, or another physical variant extends the artwork registry and alias list; it does not alter classification, filters, statistics, relationships, metadata extraction, or any other behavioral model. Artwork keys resolve to local assets in the central Experience registry, and cards never contain image paths or pair-selection branches.

Homelab Cards and the Homelab Inspector consume the same category-artwork resolver. The Inspector intentionally ignores note-owned covers, thumbnails, and body images just as the cards do. Its contextual header is followed by a compact full-width artwork hero and a separate full-width metadata panel; summary and relation content retain their existing order below those surfaces.

The Homelab dashboard's Service Split counts unique service roots rather than individual Markdown files. It prefers explicit `service_category` or `category` metadata, then derives the categories Applications, Media, Utilities, Monitoring, Networking, Storage, Development, Automation, Security, Infrastructure, and Other from service identity, tags, and content. `Self-hosted Applications` and its singular variants normalize to Applications. Multiple notes below one service folder contribute one service to the split.

Service-distribution rows are toggle filters using the shared `homelab_service_category` URL dimension. Selecting a row applies its category while preserving unrelated filters and browser preferences; selecting the active row again removes only that category filter and returns to the corresponding unfiltered service distribution.

Service identity comes from the service note itself, not an organizational category folder below `Services`. A concrete service note uses its note title, so `Services/Monitoring/Prometheus.md` resolves to Prometheus. Generic roots such as `Index.md`, `Overview.md`, `Service.md`, and `README.md` instead use their immediate parent folder, so `Services/Monitoring/Grafana/Index.md` resolves to Grafana. The same identity resolver owns Service Card titles and unique-service dashboard counts.

The Services metric displays the total number of unique documented services. Its footer separately counts unique services for which at least one note explicitly declares `status: active`; missing status is not interpreted as active.

Homelab presents dashboard metrics as individual sibling panels rather than wrapping statistics and controls in one visual container. The statistics row owns horizontal overflow, and Technologies remains a single non-wrapping badge row with its own horizontal scroll. Filters and shared browser controls sit in separate sibling surfaces below the statistics row.

Homelab exposes `homelab_entity`, `homelab_lifecycle`, and `homelab_status` as separate filter dimensions. Dashboard entity and lifecycle counts consume the same classification object used by cards and inspectors. The legacy `homelab_kind` metadata lookup remains an entity alias for compatibility, but new UI and URLs use `homelab_entity`.

The Homelab hero exposes compact Node, Service, Specification, and Documentation totals without increasing the shared hero height. Its overview is a fixed-height, horizontally scrolling row of independent distribution panels. Node, service, platform, and documentation panels are derived from existing classification and metadata. Storage is conditional and appears only when useful storage facts can be inferred; Technologies remains a one-line horizontally scrollable chip list.

Homelab inspector relationships are read-only navigation. They may be inferred from explicit host and installation fields, wikilinks and backlinks, filenames, and stable identities such as hostname. Missing or ambiguous relationships are omitted rather than introducing vault editing or organization workflows.

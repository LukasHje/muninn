# Experience Card Families

Experience browsing should not customize a single generic note card.

Different Experiences need different card hierarchies:

- products
- vehicles
- journeys
- books
- recipes
- generic notes

Trying to express those differences through one increasingly configurable card component will collapse layout, metadata priority, and responsive behavior into a single abstraction.

## Principle

The Experience chooses a **Card Family**.

The browser remains generic.

```text
Experience
    ↓
Card Family
    ↓
Rendered Card
```

Examples:

- Gear → `product`
- Vehicles → `vehicle`
- Travel → `journey`
- Books → `book`
- Recipes → `recipe`
- fallback browsing → `generic-note`

`product`, `recipe`, `vehicle`, `book`, `homelab`, and `generic-note` are implemented today. Journey Cards remain an intended future family; Travel uses `generic-note` until its custom family exists.

## Homelab Card Contract

The `homelab` family delegates to Node Card only for machine entities such as Server, NAS, Workstation, Mini PC, Router, Switch, VM, and Raspberry Pi. Current or Planned folders never imply a machine entity. Node Card presents a cover, operational-status badge, title/role, up to four OS/CPU/RAM/storage-or-network facts, placement, and updated time. Its adapter compacts raw specifications into comparable facts: CPU descriptions prefer core count, RAM and storage prefer capacity, and network descriptions prefer the fastest documented wired link. Missing fields are omitted. Present but non-specific RAM, storage, or network values render as `TBD` instead of leaking ambiguous raw prose into the card.

CPU product tiers such as Intel `i5` and AMD `Ryzen 5` must never be interpreted as core counts. Explicit core/thread notation has priority, followed by a small Homelab-local table for documented CPU models whose physical core counts are known. Unrecognized models retain a compact model name rather than guessing.

Homelab iteration 2 implements five internal card kinds behind the single registered `homelab` Card Family:

- Node for physical and virtual machines; the iteration 1 hierarchy remains intact.
- Service for a software service root or service index, with platform, host, version, runtime, storage, network, or port facts when present.
- Specification for parts, archived specifications, upgrade candidates, and hardware-specification filenames, with datasheet-oriented facts.
- Dashboard for explicitly configured dashboards and dashboard/overview/topology artifacts inferred from their folder and filename.
- Documentation for configuration pages, guides, references, and every non-machine fallback.

All five kinds share the same card frame, dimensions, image boundary, hover behavior, favorite action, footer, glass surface, and inspector-selection contract. They vary only their information hierarchy. Card Kind is derived from Entity and cannot be overridden independently: object identity, organization, operational state, and presentation remain separate. Service subdocuments such as configuration pages remain Documentation entities even when they live below a service root; the service root note or its Index receives Service entity and Service Card.

Homelab cards always use curated category artwork. They deliberately ignore note-owned `thumbnail`, `cover`, and body images; those remain available in note view but cannot make the visual card index inconsistent. Machine artwork may use a metadata-derived hardware category without changing Entity—for example, a `type: server` note with an explicit TrueNAS/NAS role uses NAS artwork while remaining under the Server filter. Services use their derived service category with `Other` as the generic fallback, Specification Cards use the shared Specification artwork, and Documentation uses the shared Documentation artwork.

Node artwork additionally supports the optional `form_factor` frontmatter field. Device `type` remains the semantic identity and owns all behavior; form factor describes only physical construction. Artwork resolution first checks the combined Entity/form-factor pair, allowing Server Tower and Workstation Tower to use independent presentation keys while remaining distinct semantic types. A Server with `form_factor: desktop` uses dedicated low-profile horizontal desktop-server artwork rather than either tower artwork or Desktop Workstation artwork. Desktop, laptop, all-in-one, and Mini PC Workstations therefore remain the same Entity while receiving different images. Compact edge devices may use `form_factor: embedded` (including edge-device and IoT aliases) without introducing an Embedded Entity.

When no form factor exists, conservative type defaults preserve existing notes: Server uses its tower-server default, Workstation uses Desktop Workstation, and NAS, Router, Switch, Smartphone, and other known types retain their recognizable category defaults. Role/category overrides remain available for legacy notes such as a Server explicitly described as a NAS. Both pair resolution and alias normalization belong to the Homelab adapter's artwork registry; asset paths belong to the central Experience registry, never the Astro card component.

The shared Homelab grid card uses a compact fixed-height preview rather than the general 16:9 card image. This keeps the complete title, facts, and footer visible within the Library viewport. Dashboard images retain their richer visual treatment inside the same height boundary; list layout keeps its smaller shared thumbnail contract.

When a Homelab card exposes Operational Status, its badge belongs at the right edge of the title-and-role row and is vertically centered against that copy block. Lifecycle may supply a last-resort status fallback, but it does not choose the card. Status must not overlay the compact preview image.

Homelab status badges are compact text-only badges without a leading indicator dot. Their local palette is green `#6C8061` for active/owned, blue `#657986` for planned/standby, restrained light red for offline, and neutral gray for archived/retired. Other Experience status badges retain their own presentation.

Service Operational Status is Homelab-local. Common aliases normalize to active, standby, offline, maintenance, retired, planned, or archived, but the global Experience mapping from `active` to `owned` must never be applied to Homelab services. Standby (including idle/ready aliases) uses the blue planned-state palette. A service's Lifecycle never changes Service Card rendering. The Homelab inspector therefore resolves status through the Homelab adapter.

## Responsibilities

### Experience

Owns:

- title
- selector
- hero assets
- sidebar icon
- theme / accent
- landing page
- card family

### Card Family

Owns:

- DOM structure
- spacing
- information hierarchy
- responsive behavior
- how extracted product features are presented
- visual presentation

### Browser

Owns:

- browsing
- selection
- filtering
- sorting
- rendering the chosen card family

The browser must not contain Gear-specific or domain-specific card logic.

## Current structure

Card family selection lives in the Experience registry via `definition.cardFamily`.

Rendering is routed through a generic Experience card renderer that selects the matching component family.

This keeps the Experience layer declarative while allowing each family to evolve independently.

Product-oriented card families should consume a dedicated Product Feature Extraction system rather than arbitrary frontmatter fields.

The Default Experience always has a viable fallback through `generic-note`. Registering an Experience does not require creating a new Card Family.

## Recipe Card Contract

The `recipe` family uses an editorial hierarchy optimized for meal discovery:

- four columns on wide desktop, with the shared responsive grid behavior below that breakpoint
- a 4:3 cover or shared image fallback
- the shared favorite control over the image
- title followed by at most two category or cuisine tags
- one compact facts row for rating, servings, and cooking or total time; cookie recipes expressed as pieces use the cookie icon instead of the people icon
- an optional lifecycle footer for the normalized `Made` or `To try` recipe status
- a compact list presentation at every viewport size with a full-height, cropped cover at left, the same information hierarchy in the center, and the favorite action in the top-right corner

Grid cards deliberately omit the note summary. The full note and contextual inspector remain responsible for descriptive content.

It consumes normalized recipe metadata from `src/lib/experiences/recipes.ts`. Cards must omit absent values rather than invent defaults, and they must retain the shared `data-experience-card` selection contract so the generic browser can open the Recipe inspector.

## Book Card Contract

The `book` family represents standing books rather than generic note panels. Cover artwork dominates a narrow 2:3 volume, with a dark attached footer for title, author, reading status, optional progress, and a finished-book rating. Missing cover art receives a deterministic cloth-bound placeholder derived from the title; remote cover failure must reveal that fallback rather than a broken image.

Book Cards are rendered into horizontally scrolling shelf tracks. They retain the shared `data-experience-card` selection contract so the Experience workspace owns inspector selection. Durable status, progress, rating, and favorite presentation comes exclusively from Muninn's Local Experience State service and never from a component write to frontmatter.

## Vehicle Card Contract

The `vehicle` family uses a compact garage/archive hierarchy optimized for vehicle comparison:

- cover, thumbnail, note image, category-specific placeholder, or configured generic placeholder
- manufacturer and model when available, otherwise the note title
- generation, year, and body style as secondary context
- title, variant, and status presented over a theme-aware image fade
- up to four specs, prioritizing drivetrain, fuel, year, body style, and transmission
- a compact updated timestamp below the spec divider
- the shared favorite control

It consumes normalized vehicle metadata from `src/lib/experiences/vehicles.ts`. Cards must omit absent values rather than invent defaults, and they must retain the shared `data-experience-card` selection contract so the generic browser can open the Vehicle inspector.

## Generic Note Image Contract

`generic-note` uses the same full-bleed preview behavior as ordinary Library and dashboard cards:

- a real note image fills the complete fixed-height image frame with `object-fit: cover`
- the frame clips overflow so cards keep a stable, scannable height
- the image may receive a restrained hover scale inside the clipped frame
- an Experience placeholder remains centered with internal spacing and `object-fit: contain`

Do not apply placeholder treatment to note images. Conversely, do not crop an Experience illustration or logo merely to make it full bleed. Image candidate selection remains owned by the shared Experience selectors; the Card Family owns only presentation.

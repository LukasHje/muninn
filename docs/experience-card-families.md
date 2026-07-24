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

`product`, `recipe`, `vehicle`, and `generic-note` are implemented today. Journey and Book Cards describe intended future families; Travel and Books use `generic-note` until their custom families exist.

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
- one compact facts row for rating, servings, and cooking or total time
- an optional lifecycle footer for the normalized `Made` or `To try` recipe status

Grid cards deliberately omit the note summary. The full note and contextual inspector remain responsible for descriptive content.

It consumes normalized recipe metadata from `src/lib/experiences/recipes.ts`. Cards must omit absent values rather than invent defaults, and they must retain the shared `data-experience-card` selection contract so the generic browser can open the Recipe inspector.

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

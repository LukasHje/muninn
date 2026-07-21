# Experience Card Families

Experience browsing should not customize a single generic note card.

Different Experiences need different card hierarchies:

- products
- vehicles
- journeys
- books
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
- fallback browsing → `generic-note`

Only `product` and `generic-note` are implemented today. Vehicle, Journey, and Book Cards describe intended future families; those Experiences use `generic-note` until their custom family exists.

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

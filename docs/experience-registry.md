# Experience Registry

Status: Implemented

The central registry is the source of truth for Experience identity and composition. It prevents routes, sidebar navigation, selectors, assets, and UI choices from being scattered through the application.

## Definition

Each `ExperienceDefinition` owns:

- `id`, title, description, route, and Library link
- a typed `selector`
- a `theme`
- sidebar and hero icons
- hero artwork and placeholder assets
- a Card Family
- optional landing page and inspector overrides
- filter, statistics, metadata, and section preferences

The registry does not implement selectors, traverse the Vault, parse Markdown, or render UI.

## Registered Experiences

- Gear: custom landing page, Product Card, and custom inspector
- Vehicles: Default Experience
- Travel: Default Experience
- Recipes: Default Experience
- Books: Default Experience
- Technology: Default Experience
- Homelab: Default Experience

The first six use frontmatter selectors. A selector may accept multiple equivalent values, as Recipes does for `recipes` and `recept`. Homelab uses a path selector and demonstrates that the registry is not tied to `type` metadata.

## Assets

Assets are declared by each definition. Existing hero artwork follows:

```text
/public/experiences/[experience]/experiences-heroart-[experience].webp
```

Hero artwork and placeholder thumbnails may be absent. Default UI then renders the registered hero icon instead of requesting a missing image.

## Component Fallbacks

`landingPage` and `inspector` are optional. Their absence selects the Default Experience implementation. `cardFamily` always resolves through the generic card renderer and falls back to `generic-note`.

The browser consumes only the resolved definition. It must not contain Experience-id branches.

## Data Ownership

```text
Registry
    ↓
Selector Engine
    ↓
Filters and Statistics
    ↓
Component Resolvers
    ↓
Experience Browser
```

Adding an Experience should normally require one registry entry and its assets. New selector algorithms or Card Families are separate subsystem changes.

## Browser Scaling

The card grid exposes a stable `data-experience-card-list` boundary and uses delegated interaction. Future incremental rendering or virtualization can replace full server emission behind that boundary without changing selector, filter, inspector, or registry ownership.

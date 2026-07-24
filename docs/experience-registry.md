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
- Vehicles: custom thematic landing page, Vehicle Card, dashboard, and custom inspector
- Travel: Default Experience
- Recipes: custom editorial landing page, dashboard, Recipe Card, and custom inspector
- Books: Default Experience
- Technology: Default Experience
- Homelab: Default Experience

The first six use frontmatter selectors. A selector may accept multiple equivalent values, as Recipes does for `recipe`, `recipes`, and `recept`, and Vehicles does for `vehicle`, `vehicles`, and `fordon`. Homelab uses a path selector and demonstrates that the registry is not tied to `type` metadata.

## Assets

Assets are declared by each definition. Existing hero artwork follows:

```text
/public/experiences/[experience]/experiences-heroart-[experience].[image-extension]
```

An Experience may instead keep a cohesive asset set under `/public/experiences/[experience]-assets/`; Recipes uses this convention for its editorial hero. The registry remains the authority for the public path, so renderers must not derive paths from ids.

Hero artwork and placeholder thumbnails may be absent. The shared artwork workspace then renders a theme-derived background and the hero keeps its registered icon instead of requesting a missing image. Individual landing pages and hero components must not resolve or paint the registered artwork themselves. An Experience may additionally register `placeholderThumbnailsByCategory`; the registry owns these public asset paths, while the domain adapter owns category normalization and fallback selection.

## Component Fallbacks

`landingPage` and `inspector` are optional. Their absence selects the Default Experience implementation. `cardFamily` always resolves through the generic card renderer and falls back to `generic-note`.

The browser consumes only the resolved definition. It must not contain Experience-id branches.

## Recipe Definition

Recipes deliberately accepts common vault vocabulary without requiring migration:

- `type`: `recipe`, `recipes`, or `recept`
- `category` / `categories`
- `ingredient` / `ingredients`
- `collection` / `collections`
- optional timing, difficulty, servings, cuisine, rating, favorite, and reviewed fields

Missing recipe metadata degrades to omitted UI or an empty statistic; it must not exclude an otherwise matching recipe note. Field aliases are resolved by shared selectors, not by Recipe components.

Recipes does not render the generic Experience metadata filter row. Its dashboard category control owns the visible category filtering and writes the derived `recipe_kind` filter into the normal Experience filter pipeline. The four recipe kinds are:

- Food
- Drink
- Dessert
- Other

`Food` is the fallback for ordinary meals, breakfast, lunch, dinner, baked bread, and snacks. `Drink` is reserved for alcoholic drinks and cocktails. Coffee, tea, chai, and hot chocolate intentionally fall into `Other` until the drink taxonomy is expanded.

## Vehicles Definition

Vehicles accepts common garage vocabulary without requiring vault migration:

- `type`: `vehicle`, `vehicles`, or `fordon`
- status aliases through `vehicle_status`, `status`, or `state`
- manufacturer aliases such as `manufacturer`, `make`, `brand`, `märke`, and `tillverkare`
- vehicle fields such as `model`, `generation`, `year`, `body_style`, `drivetrain`, `fuel`, `transmission`, `mileage`, `owner`, `location`, and `rating`

Vehicles does not render the generic Experience metadata filter row. Its dashboard owns the visible garage controls and writes normal Experience filter parameters into the shared filter pipeline.

Vehicle statistics and cards must be derived from actual notes. Missing fields are omitted or represented with neutral empty states; mockup values must not be hardcoded into the implementation.

Vehicles resolves missing images in this order: explicit thumbnail, explicit cover, normalized note image, category placeholder, then the generic Vehicle placeholder when the note has no usable body style. Known categories without a registered placeholder render their category icon instead of borrowing an incorrect vehicle silhouette. Photographic category placeholders fill the image frame; the generic illustration retains contained placeholder presentation.

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

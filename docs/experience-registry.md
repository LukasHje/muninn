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
- Homelab: custom path-aware landing page, infrastructure dashboard, Node Card, and metadata-focused inspector

The first six use frontmatter selectors. A selector may accept multiple equivalent values, as Recipes does for `recipe`, `recipes`, and `recept`, and Vehicles does for `vehicle`, `vehicles`, and `fordon`. Homelab uses a path selector and demonstrates that the registry is not tied to `type` metadata.

Homelab's registered presentation uses an Experience-local adapter with independent Entity, Form Factor, Lifecycle, Operational Status, and Card Kind dimensions. Explicit object frontmatter normally owns Entity; the Dashboard, Infrastructure, Knowledgebase, and Resources subtrees are intentional Documentation boundaries; numbered lifecycle folders own Lifecycle only; explicit status owns Operational Status; and Card Kind is derived solely from Entity. The registry declares separate `homelab_entity`, `homelab_form_factor`, `homelab_lifecycle`, and `homelab_status` filter keys without implementing any classification rules itself.

Physical inventory entities are additionally scoped to the `07.05 Hardware_specs` inventory subtree. This path constraint prevents machine, display, UPS, and component references in operational or supporting documentation from entering Node or Specification filters; it does not infer a specific Entity from lifecycle folders.

Homelab hardware may declare an optional `form_factor`. This is not an Entity dimension: `type` answers what a device is and owns behavior, while form factor answers what it physically looks like. The domain adapter resolves a stable artwork key from the Entity/form-factor pair, with generic form-factor, role/category, and Entity fallbacks. The central Experience registry only maps those keys to bundled asset paths. This separation permits an asset to evolve or a new physical variant to be registered without changing classification or card components; existing notes without form factor continue through conservative type and role defaults.

## Assets

Assets are declared by each definition. Existing hero artwork follows:

```text
/public/experiences/[experience]/experiences-heroart-[experience].[image-extension]
```

Production hero artwork should use WebP at its intended display resolution. Lossless source files may be retained outside `public/`, but must not be shipped alongside the optimized asset because everything under `public/` is copied into the runtime image.

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
- optional timing, difficulty, servings, cuisine, rating, favorite, reviewed, and `recipe_status` fields

Missing recipe metadata degrades to omitted UI or an empty statistic; it must not exclude an otherwise matching recipe note. Field aliases are resolved by shared selectors, not by Recipe components.

The canonical lifecycle field is:

```yaml
recipe_status: made # made | to_try
```

`made` and `to_try` are normalized to the two presentation states `Made` and `To try`. Supported English and Swedish field aliases are accepted by the shared selector layer. A generic `status` field is intentionally not consumed because it may describe publishing or document workflow rather than the recipe lifecycle.

Recipes does not render the generic Experience metadata filter row. Its compact statistics and cuisine controls own the visible category filtering and write `recipe_kind`, `favorite`, `reviewed`, and `cuisine` filters into the normal Experience filter pipeline. The four recipe kinds are:

- Food
- Drink
- Dessert
- Other

`Food` is the fallback for ordinary meals, breakfast, lunch, dinner, baked bread, and snacks. `Drink` is reserved for alcoholic drinks and cocktails. Coffee, tea, chai, and hot chocolate intentionally fall into `Other` until the drink taxonomy is expanded.

The Recipe dashboard model derives seven key values from the current note set: total recipes, favorites, Food/Mains, Desserts, Drinks, average rating, and recipes needing review. Cuisine distribution reports percentage shares from normalized cuisine metadata and groups values outside the five largest cuisines into `Other`.

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

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

Gear currently provides the only custom landing page, Product Card, and inspector. Vehicles, Travel, Recipes, Books, Technology, and Homelab use the Default Experience implementation.

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

## Boundaries

- The Registry owns Experience configuration, not matching algorithms.
- The Selector Engine owns note discovery, not presentation.
- The Browser owns filtering, selection, and interaction, not domain rules.
- Card Families own card hierarchy and feature presentation.
- Inspectors own contextual application UI, not the authoritative Note View.
- Markdown rendering remains owned by the rendering pipeline.

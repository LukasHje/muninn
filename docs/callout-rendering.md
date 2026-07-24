# Callout Rendering

Muninn supports Obsidian callout syntax inside rendered notes while keeping parsing and presentation separate.

```text
Markdown blockquote syntax
    ↓
Obsidian parser identifies type, title and fold state
    ↓
Callout renderer resolves alias, Lucide icon and color
    ↓
Markdown UI presents the callout
```

## Ownership

`src/lib/markdown/obsidian.ts` owns syntax recognition. It extracts:

- the type identifier from `[!type]`
- an optional custom title
- `+` or `-` fold state
- nested Markdown content

It must not decide colors, icons or layout.

`src/components/obsidian/calloutDefinitions.ts` owns the display-only mapping from Obsidian type identifiers to canonical types, icons and tone classes. `Callout.astro` owns callout markup, interaction and styling. These files are part of Markdown UI and must not affect the application shell.

## Nested Content Contract

A callout body is a nested Markdown document, not an opaque Markdown string. After one blockquote level is removed, the body re-enters the full Core → Obsidian → Plugin pipeline. Consequently, typed blocks such as `DataviewBlock`, `DataviewJSBlock`, maps, media sliders and nested callouts must remain typed children in the document tree.

Muninn accepts both fully quoted fenced blocks and Obsidian's lazy fenced continuation form:

````markdown
> [!info]- Status
>```dataviewjs
dv.paragraph("Rendered inside the callout");
>```
````

While such a quoted fence is open, unquoted code lines belong to the callout until its closing fence. The parser must not terminate the callout at the first lazy continuation line or flatten the fence into ordinary Markdown.

Callout rendering traverses its typed children recursively. Fold state affects only visibility and interaction; it must never prevent nested blocks from being parsed or executed.

## Supported Types and Aliases

Muninn follows Obsidian's built-in callout families:

| Canonical type | Aliases | Lucide icon | Color family |
| --- | --- | --- | --- |
| `note` | — | notebook with pen | blue |
| `abstract` | `summary`, `tldr` | clipboard list | teal |
| `info` | — | information circle | cyan |
| `todo` | — | checked circle | cyan |
| `tip` | `hint`, `important` | flame | teal |
| `success` | `check`, `done` | check | green |
| `question` | `help`, `faq` | question circle | lime |
| `warning` | `caution`, `attention` | warning triangle | orange |
| `failure` | `fail`, `missing` | x | red |
| `danger` | `error` | lightning bolt | crimson |
| `bug` | — | bug | pink-red |
| `example` | — | list | purple |
| `quote` | `cite` | quotation marks | gray |

Type identifiers are case-insensitive. Unsupported identifiers use the `note` appearance, matching Obsidian's fallback behavior. The original Markdown remains unchanged.

## Icon Contract

Callouts use the shared `Icon.astro` component. A definition must never name an icon that the shared component cannot render; otherwise the SVG element is present but visually empty. When a new callout icon is needed, add its Lucide-compatible path data to the shared icon component and cover the definition with a mapping test.

Icons are decorative because the visible title supplies the accessible name. Foldable callouts retain native `details` and `summary` behavior.

## Styling Contract

Each canonical type sets one RGB token. The renderer derives its accent, border and subtle background tint from that token so icon and container cannot drift into unrelated colors. Callout body text remains neutral and readable rather than inheriting a saturated accent color.

Aliases resolve before the tone is selected. Do not duplicate alias selectors in CSS or add visual mapping inside the parser.

## Extension Rule

When Obsidian adds or changes a built-in type:

1. update the centralized alias and appearance maps
2. ensure the shared icon component supports the selected Lucide icon
3. add or update mapping tests
4. update the table in this document

Custom user-defined Obsidian CSS callouts are not interpreted from vault CSS in the current implementation. They intentionally receive the safe `note` fallback.

# Recipe Experience

This document owns the Recipe Experience-specific contract, current limitations, and planned ingredient discovery work. Shared Experience behavior remains defined by `experience-architecture.md`, `experience-registry.md`, `experience-card-families.md`, and `experiences.md`.

## Current State

Recipes is a custom Experience with an editorial hero, compact dashboard, cuisine filters, Recipe Cards, and a contextual inspector. Recipe notes are selected through normalized `recipe`, `recipes`, and `recept` type values. Optional English and Swedish metadata aliases supply ratings, timing, servings, cuisine, favorites, review state, and recipe lifecycle state.

The ingredient pipeline currently has one responsibility: recover authored ingredient data for presentation. It reads frontmatter ingredient values and Markdown lists beneath an `Ingredients` or `Ingredienser` heading, including lists below deeper subgroup headings. The Recipe inspector renders the original Markdown section through `NoteContent` so quantities, spelling, language, subgroup headings, emphasis, and links remain intact.

Recipe presentation classification is separate. Signals such as coffee, tea, chocolate drinks, desserts, and cocktails may select an appropriate recipe kind or icon. These signals describe the recipe's visual presentation; they do not classify or rewrite individual ingredients.

## Restrictions

- Never replace the inspector's authored ingredient text with normalized labels.
- Never infer translated ingredient names for display in the inspector.
- Never use recipe presentation classification as ingredient classification. For example, `kakao` must not become the ingredient category `Coffee` merely because coffee, tea, and chocolate drinks share a presentation icon.
- Keep quantities and units out of canonical ingredient identities, but preserve them in authored display data.
- Ingredient normalization must be additive derived data. It must not mutate note content, frontmatter, or the raw ingredient representation.
- A recipe contributes at most once to a canonical ingredient counter, even if that ingredient occurs several times in the recipe.
- Filtering and counters must use the same canonical values and the shared Experience filter pipeline.
- A future vault-derived ingredient index must participate in central vault cache invalidation and update when Reload Vault is used.

## Future Feature: Ingredient Taxonomy

The planned dashboard feature is a separate normalized ingredient taxonomy for discovery and aggregation. It should enable:

- popular ingredient statistics;
- recipe filtering by ingredient family;
- small clickable ingredient icons;
- an optional compact count badge showing how many recipes match each ingredient;
- consistent matching across Swedish and English recipes.

The taxonomy should map supported aliases and specific foods to a language-neutral canonical value. Examples:

| Authored values | Canonical value |
| --- | --- |
| `fish`, `fisk`, `abborre`, `rödspätta`, `lax` | `fish` |
| `beef`, `nötkött`, `högrev` | `beef` |
| `shrimp`, `prawn`, `räka`, `räkor` | `shrimp` |
| `seafood`, `skaldjur`, supported shellfish | `seafood` |
| `lamb`, `lamm` | `lamb` |
| `cheese`, `ost`, supported cheese varieties | `cheese` |
| `milk`, `mjölk` | `milk` |
| `salad`, `sallad`, supported leafy greens | `salad` |

Each supported value should be defined centrally with:

- a stable canonical id;
- a user-facing label;
- an icon;
- Swedish and English aliases;
- optional species, cuts, varieties, or subordinate terms;
- explicit precedence where one term could match several families.

The output should be modeled separately from raw ingredients, for example as derived canonical ingredient ids attached to a recipe. Dashboard counters count matching recipes rather than raw occurrences. Clicking an ingredient uses its canonical id in the normal Experience filter state and returns every recipe whose derived ingredient set contains that id.

## Open Design Questions

- Whether parent and child families can coexist, such as `shrimp` together with `seafood`, or whether only the most specific value is emitted.
- Whether the UI label follows the application language while canonical ids remain English and stable.
- How unsupported ingredients appear, if at all, in dashboard discovery.
- Whether aliases live in a typed source module, a data file, or a more general supported-values registry shared by other Experiences.
- Which ingredient families are useful enough to expose as dashboard shortcuts rather than only through search or filtering.

## Implementation Boundary

Do not add taxonomy matching ad hoc inside the inspector, cards, or dashboard component. Matching belongs in a central Recipe domain module. Presentation components consume its derived canonical values, labels, icons, and counts. Tests should cover bilingual aliases, specific-to-family mappings, ambiguous terms, duplicate occurrences, and the invariant that the inspector remains 1:1 with the note.

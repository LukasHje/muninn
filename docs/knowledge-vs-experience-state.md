# Knowledge State vs Experience State

Muninn separates the information stored in an Obsidian vault from the interaction state created while using Muninn. This is a project-wide ownership boundary and one of Muninn's core architectural principles.

```text
Obsidian vault                         Muninn
Knowledge State                       Experience State

What do I know?                       How do I interact with it?
Portable source of truth              Application-owned enhancement
Read-only to Muninn                   Persisted by Muninn
```

The distinction is semantic rather than technological. Storage location, UI placement, or the component that displays a value does not determine ownership. The meaning and expected lifecycle of the information determine ownership.

## Knowledge State

Knowledge State belongs to the vault.

It represents information that should remain portable, visible and editable inside Obsidian, and synchronized through normal vault workflows. It includes:

- notes;
- Markdown content;
- frontmatter;
- properties;
- tags;
- Markdown links and wikilinks;
- attachments and embeds;
- Dataview metadata;
- folder structure.

Knowledge State is the source of truth for what the user knows and has authored. Muninn consumes and presents this state but must treat the vault as read-only. Features must not silently edit Markdown, rewrite frontmatter, reorganize folders, or create application bookkeeping inside the vault.

Derived values may be calculated from Knowledge State for search, presentation, classification, statistics, or navigation. Those derivations do not transfer ownership to Muninn and must remain reproducible from the vault. A cache of vault-derived data is still derived Knowledge State, not Experience State.

## Experience State

Experience State belongs to Muninn.

It represents interactions and preferences that enrich browsing without becoming part of the underlying knowledge. Examples include:

- reading status;
- personal ratings;
- favorites;
- collections;
- recently opened items;
- reading progress;
- view preferences;
- sorting and filters;
- grid or list layout;
- inspector state;
- local bookmarks;
- future movie, game, or music progress.

Experience State must never be written back into Markdown, frontmatter, properties, tags, or other vault files. It may reference a note through a stable identity, but the interaction record remains application-owned.

Experience State can be durable or transient:

- Durable state includes ratings, progress, favorites, collections, and watchlists.
- Session or navigation state includes active filters, sorting, layout, and inspector visibility.

Both forms belong to Muninn. Persistence duration does not change ownership.

## Design Philosophy

Knowledge answers:

> What do I know?

Experience answers:

> How do I interact with it?

These are intentionally different concerns. Obsidian remains the knowledge system; Muninn is the experience layer built on top of it.

The vault should stay clean, portable, and useful without Muninn. A user must be able to open it in Obsidian, synchronize it using ordinary vault workflows, or move it to another Markdown-based tool without carrying application-specific interaction bookkeeping.

At the same time, Muninn should be free to build rich, stateful Experiences without polluting notes. Application state may combine with read-only vault data at presentation time, but the two sources retain separate ownership and update paths.

## Ownership Decision

Before introducing a field or state transition, ask:

1. Does this describe knowledge the user should be able to read and edit in Obsidian?
2. Should it remain meaningful when the vault is used without Muninn?
3. Should it synchronize as part of the vault?

If yes, it is Knowledge State and belongs in the vault.

Then ask:

1. Does this describe how the user consumes, organizes, or navigates content specifically in Muninn?
2. Is it a preference, activity record, progress value, or application affordance?
3. Would placing it in Markdown primarily serve Muninn's UI?

If yes, it is Experience State and belongs to Muninn.

Ambiguous data must be resolved from product meaning rather than implementation convenience. A value must not be placed in frontmatter merely because vault metadata is already available, and it must not be hidden in an application database if it is authored knowledge that should remain portable.

Future Experiences should default to this model unless a strong architectural reason establishes a different ownership contract. Any exception must be explicit and documented before implementation.

## Existing Vault Metadata

Existing vaults may already contain frontmatter such as `rating`, `favorite`, `status`, or `collection`. Muninn may continue to read such fields as authored Knowledge State for compatibility, but their presence does not authorize the application to update them.

Future interactive controls must write to Experience State rather than back to those fields. If a future Experience combines legacy vault metadata with application-owned state, it must define deterministic precedence and migration behavior before implementation. Compatibility reads must not become implicit write-back.

The same word may describe different concepts depending on product meaning. An authored thematic collection intended to travel with the vault can be Knowledge State, while a private Muninn shelf assembled through the UI is Experience State. Code and documentation should name these concepts clearly instead of treating identical labels as identical ownership.

## Combining the States

An Experience may present both states together without merging their ownership:

```text
Knowledge State                     Experience State
title, author, cover, notes          rating, progress, favorite
             \                       /
              \                     /
                 Experience view
```

For example, a Book Card may read its title, author, cover, ISBN, and annotations from the vault while reading its progress and personal rating from Muninn. Updating the rating changes only Experience State. Editing the author remains an Obsidian/vault workflow.

Application code should preserve this boundary in its models and write paths. A combined view model is acceptable for rendering, but it must not obscure which source owns each field.

## Persistence

Experience State is expected to be persisted locally by Muninn. The persistence implementation may evolve as the application grows.

Possible implementations include:

- local storage;
- browser storage;
- IndexedDB;
- SQLite;
- an application database.

This architecture deliberately does not select or depend on a particular persistence technology. The stable abstraction is ownership:

- Knowledge belongs to the vault.
- Experience belongs to Muninn.

A future persistence layer should expose Experience State independently from vault ingestion and Markdown rendering. Replacing one persistence technology with another must not alter the ownership boundary or require migrating Experience State into vault files.

Muninn must also define stable note identity before durable Experience State depends on notes across renames or moves. That identity problem belongs to the future persistence design; it does not justify writing interaction state into the vault.

### Local Experience State Service

The first persistence implementation is a reusable browser-local service under `src/lib/experienceState/`. It provides a versioned, namespaced `ExperienceLocalState<T>` abstraction backed by Web Storage. Domain code supplies its own state type and validation; UI components do not read or write `localStorage` directly.

The service contract includes:

- one namespace per Experience domain;
- schema versioning and defensive parsing;
- immutable `get`, `set`, `update`, `remove`, and `list` operations;
- same-tab change notifications plus browser `storage` event synchronization;
- dependency injection of the storage adapter for tests and future backends.

Books is the first consumer. Its `BookState` is keyed by the vault note id and contains reading status, rating, optional progress, start and finish timestamps, favorite state, and an update timestamp. Book components consume the Books domain controller rather than importing the storage implementation.

Browser storage is an implementation choice, not the architecture. A later SQLite, IndexedDB, or application-database adapter must be able to replace it behind the same ownership boundary. The vault is never a storage adapter for Experience State.

## Future Direction

This separation allows Experiences to become substantially richer over time.

### Books

- reading status;
- personal rating;
- reading progress;
- shelves or collections.

Bibliographic metadata, excerpts, annotations, and authored reading notes remain Knowledge State. Progress, rating, and library interaction remain Experience State.

### Movies

- watched state;
- personal rating;
- watchlist membership;
- playback or viewing progress.

### Games

- completed state;
- hours played;
- backlog membership;
- play progress.

### Recipes

- cooked state;
- personal rating;
- family favorite;
- recent cooking activity.

Ingredients, instructions, and authored recipe notes remain Knowledge State.

### Gear

- owned or wishlist interaction state;
- loaned-out state;
- maintenance reminders;
- Experience-specific collections.

Technical specifications and authored equipment knowledge remain in the vault. If ownership is itself intentionally maintained as portable inventory knowledge, that particular field remains Knowledge State; the product meaning decides the boundary.

### Homelab

- dashboard preferences;
- collapsed sections;
- favorite services;
- local display preferences.

Infrastructure documentation, topology, specifications, and configuration knowledge remain in the vault.

## Architectural Invariants

- The vault is the source of truth for Knowledge State.
- Muninn treats vault content as read-only.
- Experience State never modifies Markdown or other vault files.
- Vault-derived caches remain reproducible Knowledge State.
- Experience State persistence remains independent of vault ingestion.
- Rendering may combine both states but must preserve their ownership.
- New features determine ownership before selecting storage.
- Persistence technology may change without changing the model.
- Exceptions require a strong reason and an explicit documented contract.

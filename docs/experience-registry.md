# Experience Registry

Status: Proposed and Implemented Incrementally

---

## Purpose

Muninn needs one place where curated experiences are defined.

Without a registry, experience behaviour gets scattered across:

- sidebar navigation
- routes
- placeholder assets
- titles and descriptions
- note selection logic
- future widgets

The registry keeps that identity in one place.

---

## Scope

The registry defines **Experiences**.

It does not replace:

- the unified note model
- the generic Library Browser
- note layouts

Notes remain normal markdown notes.

The registry only decides how a collection of notes is presented as a Muninn-level experience.

---

## Definition Shape

Each experience definition owns:

- `key`
- `title`
- `description`
- `icon`
- `tone`
- `href`
- `libraryHref`
- `heroArtwork`
- `placeholderThumbnail`
- `cardFamily`
- `featureSections`
- sidebar identity
- supported metadata filters
- preferred inspector headings

This keeps the experience configuration declarative.

Hero artwork follows a shared asset convention:

- `/public/experiences/[experience]/experiences-heroart-[experience].webp`

The registry resolves that path from the experience key.

This avoids one-off hero image wiring for individual experiences.

---

## Ownership Boundaries

### Registry

Owns:

- experience identity
- application routing targets
- sidebar visibility
- placeholder assets
- which metadata dimensions are important for browsing

Must not own:

- markdown parsing
- Obsidian syntax
- note rendering internals
- note selection logic
- statistics logic
- filtering logic

### Experience Data Layer

Owns:

- selecting notes for an experience
- computing statistics
- building filter options
- choosing the selected inspector note
- resolving thumbnail fallback behaviour

Must not own:

- raw markdown parsing rules outside standard helper utilities
- page styling details

Recommended split:

- `registry.ts`
- `selectors.ts`
- `filters.ts`
- `statistics.ts`
- optional small composition helpers

### Experience UI

Owns:

- hero
- stats
- filters
- card browser
- inspector panel

Must not own:

- note classification heuristics
- vault traversal
- markdown syntax rules

---

## Placeholder Behaviour

Experience placeholder thumbnails are application assets.

Notes should never reference them directly.

Resolution order:

1. frontmatter `thumbnail`
2. frontmatter `cover`
3. first resolved note image
4. experience placeholder asset

This keeps notes portable while allowing the application to remain visually complete.

---

## Inspector Panel

The inspector panel is part of the application UI, not the full note layout.

Its job is to:

- show the currently selected note
- surface important metadata
- render recognized markdown sections when present
- allow opening the full note

The first implementation is query-driven and server-rendered:

- selecting a card updates the experience page state
- the user remains inside the experience
- full note navigation remains explicit

This preserves reuse and avoids an experience-specific client state system.

The inspector panel must remain a generic selected-note inspector.

It must not contain Gear-specific assumptions.

---

## Composition Order

The intended layering is:

Registry

↓

Selectors / Filters / Statistics

↓

Reusable UI Components

↓

Experience View

↓

Route

The experience orchestration layer should stay relatively small.

Its main responsibility is orchestration and composition, not feature ownership.

---

## Why This Minimizes Duplication

Adding a future experience should primarily require:

1. registering a new definition
2. optionally adding a placeholder asset
3. optionally adjusting experience-specific filter preferences

It should not require:

- a new sidebar switch branch
- a bespoke route implementation
- a bespoke inspector panel
- a bespoke card browser
- duplicated placeholder logic

That is the main architectural goal of this subsystem.

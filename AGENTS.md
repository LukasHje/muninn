## Development

When starting the dev server, use background mode:

```bash
npm run dev -- --background
```

Manage the background server with:

```bash
npm run astro -- dev stop
npm run astro -- dev status
npm run astro -- dev logs
```

---

## Documentation

Astro documentation:

https://docs.astro.build

Project documentation lives in:

```
docs/
```

Before making architectural or feature-level changes, always read the relevant internal documentation.

### Rendering

- docs/rendering-philosophy.md
- docs/rendering-pipeline.md
- docs/ui-boundaries.md
- docs/attachment-rendering.md
- docs/callout-rendering.md
- docs/dataview-rendering.md

Read these before changing Markdown parsing, rendered note content, attachments, embeds, Dataview execution, or the boundary between Application UI and Markdown UI.

---

### Note reader

- docs/note-reader-ui.md

Read this before changing the standard note hero, metadata presentation, domain/type kickers, hero tag previews, or the Note Metadata Drawer content.

---

### Application shell

- docs/application-shell-layout.md

This document defines responsive viewport sizing, scroll ownership, and the fixed desktop workspace contract.

Read it before changing `MainLayout`, sidebar sizing, mobile headers, drawers, inspectors, overlays, viewport breakpoints, safe areas, focus management, or scroll locking.

### Motion

- docs/motion-system.md

Read this before adding or changing positive interaction feedback, icon morphs, success pops, bursts, favorite/rating animation, or reduced-motion behavior. Reuse the shared MotionBurst system rather than introducing feature-local keyframes or particles.

---

### Search

- docs/search-engine.md

Search behaviour must remain centralized.

Do **not** implement matching, ranking, snippet generation, or highlighting inside UI components.

All search experiences (Quick Search, Library Search, future search features) must consume the shared search engine.

Presentation-only tag prioritization must reuse the shared search matching and highlighting semantics documented here.

---

### Vault ingestion, cache, and reload

- docs/vault-ingestion.md
- docs/vault-cache.md

Read these before changing recursive vault discovery, infrastructure exclusions, vault-derived caches, cache invalidation, the admin reload endpoint, reload triggers, or the sidebar Reload Vault control.

Every new vault-derived cache must participate in the central invalidation contract.

---

### Container runtime and releases

- docs/container-runtime.md

Read this before changing the Dockerfile, `.dockerignore`, container mounts, production startup command, Astro output adapter, runtime dependencies, or release-image flow.

The production image must preserve the documented builder/runtime boundary. Vault content, source code, development dependencies, and build tools must not be copied into the runtime stage.

---

### Domains and Experiences

- docs/knowledge-vs-experience-state.md
- docs/domain-language.md
- docs/experience-architecture.md
- docs/experience-registry.md
- docs/experience-card-families.md
- docs/experience-product-specifications.md
- docs/experiences.md
- docs/books-experience.md
- docs/recipe-experience.md

Read the relevant documents before changing domain inference, Experience discovery or registration, shared Experience layouts, inspector behaviour, card families, or product specification extraction.

### Knowledge State and Experience State

When implementing a feature, first determine whether its data belongs to Knowledge State or Experience State.

If information represents knowledge that should remain portable, editable inside Obsidian, and synchronized through normal vault workflows, it belongs in the vault. The vault is the source of truth and Muninn must treat it as read-only.

If information only enriches how the user interacts with Muninn, it belongs to Experience State. Experience State must never modify Markdown, frontmatter, properties, or other vault files.

Future Experiences should default to this ownership model unless a strong architectural reason for an exception is documented before implementation. Read `docs/knowledge-vs-experience-state.md` before introducing fields, persistence, progress tracking, favorites, ratings, collections, history, bookmarks, or other stateful Experience behavior.

---

### General principle

When introducing a new subsystem with non-trivial architecture, document it in `docs/` before expanding the implementation.

AGENTS.md should remain an index into the project documentation rather than duplicating it.

When a change alters an existing contract, update its owning document in the same change. Do not use documentation only as a retrospective change log; preserve invariants, ownership boundaries, extension rules, and known failure modes for future work.

---

## External References

Consult the Astro documentation before making changes in these areas:

- Routing
  https://docs.astro.build/en/guides/routing/

- Astro Components
  https://docs.astro.build/en/basics/astro-components/

- Framework Components
  https://docs.astro.build/en/guides/framework-components/

- Content Collections
  https://docs.astro.build/en/guides/content-collections/

- Styling / Tailwind
  https://docs.astro.build/en/guides/styling/

- Internationalization
  https://docs.astro.build/en/guides/internationalization/

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

Read these before changing Markdown parsing, rendered note content, attachments, embeds, or the boundary between Application UI and Markdown UI.

---

### Note reader

- docs/note-reader-ui.md

Read this before changing the standard note hero, metadata presentation, domain/type kickers, hero tag previews, or the Note Metadata Drawer content.

---

### Application shell

- docs/application-shell-layout.md

This document defines responsive viewport sizing, scroll ownership, and the fixed desktop workspace contract.

Read it before changing `MainLayout`, sidebar sizing, mobile headers, drawers, inspectors, overlays, viewport breakpoints, safe areas, focus management, or scroll locking.

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

### Domains and Experiences

- docs/domain-language.md
- docs/experience-architecture.md
- docs/experience-registry.md
- docs/experience-card-families.md
- docs/experience-product-specifications.md
- docs/experiences.md

Read the relevant documents before changing domain inference, Experience discovery or registration, shared Experience layouts, inspector behaviour, card families, or product specification extraction.

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

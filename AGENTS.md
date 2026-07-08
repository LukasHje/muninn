## Development

When starting the dev server, use background mode:

```bash
npm dev --background
```

Manage the background server with:

```bash
npm dev stop
npm dev status
npm dev logs
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

- docs/rendering-pipeline.md
- docs/ui-boundaries.md

These documents define the separation between Application UI and Markdown UI, ownership boundaries, and the rendering pipeline.

---

### Search

- docs/search-engine.md

Search behaviour must remain centralized.

Do **not** implement matching, ranking, snippet generation, or highlighting inside UI components.

All search experiences (Quick Search, Library Search, future search features) must consume the shared search engine.

---

### General principle

When introducing a new subsystem with non-trivial architecture, document it in `docs/` before expanding the implementation.

AGENTS.md should remain an index into the project documentation rather than duplicating it.

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
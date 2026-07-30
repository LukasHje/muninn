# Operating System Asset Registry

Muninn's operating-system artwork is local application infrastructure. Runtime code must never download icons or depend on an external image host.

## Assets and registry

Optimized source SVG files live in `src/assets/os/`. The updater also writes identical deployment copies to `public/assets/os/`, which Astro bundles into the production output. `src/lib/os-registry.ts` is generated with stable local `/assets/os/...` URLs. This explicit public copy is required because Muninn uses Astro's server output: server-side `import.meta.url` asset references would otherwise resolve against the deployed JavaScript chunk instead of a browser asset URL.

The generated registry contains the canonical ID, friendly label, local icon URL, and aliases for each supported operating system. Consumers call `resolveOperatingSystem(value)` instead of branching on operating-system names. `formatOperatingSystem(os, version)` additionally produces the display label used by Homelab cards.

Frontmatter may provide release information separately:

```yaml
os: ubuntu
os_version: 24.04 LTS
```

It may also use a complete value. The resolver identifies the longest known OS prefix and preserves the remaining release or codename:

```yaml
os: TrueNAS SCALE Dragonfish 24.04
```

Both forms resolve to the TrueNAS asset. If both an inline suffix and `os_version` exist, non-duplicate details are retained.

Individual registry entries may suppress incidental inline suffixes when they are not useful card metadata. CachyOS uses this policy, so values such as `CachyOS (x86_64)` and other inline architecture notes display simply as `CachyOS`. A separately supplied `os_version` remains visible.

## Updating assets

Run this explicitly during development:

```bash
npm run update-os-icons
```

The utility in `scripts/update-os-icons.ts` downloads curated Simple Icons artwork where it is available, may use an explicit official project-owned SVG source such as CachyOS when Simple Icons has no entry, and uses bundled curated artwork where an appropriate upstream icon is unavailable. It optimizes all SVGs with SVGO, writes both asset directories, regenerates `src/lib/os-registry.ts`, and prints a concise report. Review and commit both asset copies and the generated registry.

This command is deliberately absent from `prebuild`, startup, and runtime paths. Production builds use only committed local files.

## Aliases and fallbacks

Aliases and labels are normalized case-insensitively, with punctuation and whitespace treated consistently. Full values such as `Ubuntu 24.04 LTS` match the longest registered prefix. Known Linux-like values that do not have dedicated artwork fall back to generic Linux; unrelated unknown values use the Unknown asset.

Add aliases to the curated source manifest, then regenerate the registry. Do not add switch statements in card components.

## Future registries

`src/lib/asset-registry.ts` owns the generic normalization and alias resolver. CPU vendors, hypervisors, runtimes, service categories, and hardware vendors should use the same definition shape and resolver factory while keeping their own generated definitions and asset directories. Domain components should consume those typed helpers and remain unaware of upstream asset sources.

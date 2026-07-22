# Container Runtime and Release Image

This document owns Muninn's production-container contract: why the application needs a server runtime, what may enter the final image, how filesystem data is mounted, and how the release pipeline selects the artifact it publishes.

## Runtime choice

Muninn is not a static Astro site even though much of its interface is delivered as browser assets. It uses `output: "server"` with the official Node adapter in standalone mode.

Node is required at runtime for:

- lazy vault discovery and cache rebuilding;
- server-rendered Library, Experience, and note routes;
- dynamic `/vault-assets/*` file responses from the mounted vault;
- favorites and scratchpad state APIs;
- `POST /api/admin/reload-vault`.

A static nginx image cannot provide those behaviours and is therefore not an equivalent runtime. The supported production entry point is:

```sh
node ./dist/server/entry.mjs
```

Astro's standalone server owns both page/API requests and `dist/client` assets. `astro preview` is a local preview command and must not be used as the production process.

## Image boundary

The Dockerfile uses two stages.

### Builder

The builder contains the full locked dependency tree, source code, Astro, TypeScript tooling, and asset compilers. Dependency manifests are copied before application files so the expensive `npm ci` layer remains cacheable when only source changes.

The build runs against an intentionally empty temporary vault. Vault notes and generated `public/vault-assets` are runtime data and must never be baked into a release image. Vite's SSR `noExternal` contract bundles server dependencies into the generated server chunks so the result can run without a package installation.

### Runtime

The final stage contains only:

- the Node 22 Alpine runtime;
- `dist/`.

It must not contain `src/`, `docs/`, tests, the vault, generated vault assets, `node_modules`, TypeScript, the Astro CLI, Vite, or other build tools. The `vite.ssr.noExternal` setting is part of the container-runtime contract: removing it reintroduces external imports and would make the dist-only image fail at startup. Client-only libraries and build integrations remain in `devDependencies` to keep their lifecycle explicit even though no package tree is copied into runtime.

The process runs as the image's unprivileged `node` user (UID/GID 1000) with `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=4321`, and `VAULT_PATH=/vault`.

The container health check requests the static favicon. This verifies that the standalone HTTP server and client-asset serving are alive without scanning the vault or rebuilding invalidated vault caches.

## Filesystem contract

Runtime data is outside the image:

| Container path | Access | Owner | Purpose |
| --- | --- | --- | --- |
| `/vault` | read-only | deployment | Obsidian vault content |
| `/state` | read-write | Muninn | favorites and scratchpad state |
| `/tmp` | temporary | container | bounded process temporary space |

The host vault must be readable by UID/GID 1000 and the state path must be writable by it. The root filesystem is read-only in the supplied Compose service. Logs go to stdout/stderr; Muninn does not require a `/logs` mount. The old `/app/public/vault-assets` cache mount is not a runtime input: assets are streamed from `/vault` by the application route.

## Build context

`.dockerignore` excludes repository metadata, editor state, documentation, tests, reports, screenshots, local data, generated output, local dependencies, and generated vault assets. The Dockerfile also uses explicit `COPY` instructions rather than copying the repository root.

Both controls matter:

- ignore rules keep irrelevant or sensitive data out of the build context;
- explicit copies make the builder's inputs reviewable;
- the multi-stage boundary prevents builder files from entering the runtime even if they are required during compilation.

## Release pipeline contract

The release workflow is owned by the `muninn-ops` repository. It checks the selected mirrored Muninn revision out as `app`, then builds:

```sh
docker build --file app/Dockerfile --tag muninn:<version> app
```

Therefore the root Dockerfile and root `.dockerignore` in the exact release revision define the published image. The pipeline smoke-tests that image, saves and reloads the same candidate, applies the registry tag, and pushes it. It does not use a separate development Dockerfile or rebuild after the smoke test.

Muninn's `.forgejo/workflows/notify-ops.yml` dispatches `release-pipeline.yml` in the ops repository. Keep that workflow filename synchronized with the ops repository; a renamed or stale dispatch target prevents the release pipeline from starting at all.

Changing the release image requires changing this Dockerfile contract; changing only a local Compose file does not affect registry releases.

## Inspection and size verification

Use a clean production build when reviewing image changes:

```sh
docker build --pull -t muninn:production .
docker image inspect muninn:production --format '{{.Size}}'
docker history --no-trunc muninn:production
docker run --rm --entrypoint sh muninn:production -c \
  'du -sh /app/dist && find /app -maxdepth 1 -mindepth 1 -print'
```

The only expected `/app` entry is `dist`. Verify that `/app/node_modules`, `/app/src`, `/app/docs`, `/app/public`, and build-only executables are absent. Also inspect generated server modules for bare package imports whenever Astro, its Node adapter, or the bundling configuration changes.

Image sizes vary with base-image revisions and Docker's compressed/uncompressed reporting. Treat the current registry artifact as the baseline and compare using the same command and platform. Large changes should be explained by `docker history` and by directory sizes inside the container, not by tag-level size alone.

## Change rules

- Do not replace the Node runtime with a static server while dynamic routes remain.
- Do not run `astro preview` in production.
- Do not copy the repository root or any `node_modules` into the final stage.
- Keep runtime packages in `dependencies`; keep client-only libraries, types, tests, and build integrations in `devDependencies`.
- Never make a release depend on a build-time vault.
- If a new feature writes data, give it an explicit persistent mount rather than writing into the image filesystem.
- If the Astro adapter, output mode, or SSR externalization changes, re-evaluate startup, asset serving, generated bare imports, health checks, and the release smoke test together.

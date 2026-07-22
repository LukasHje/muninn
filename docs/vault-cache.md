# Vault Cache Invalidation

Muninn caches vault-derived data in memory so normal page requests do not repeatedly scan and parse the Obsidian vault.

All callers that need to discard this data must use:

```ts
invalidateVaultCaches()
```

The function lives in `src/lib/vaultCache.ts` and is the single invalidation entry point for HTTP endpoints, filesystem watchers, webhooks, scheduled jobs, and CLI commands.

## Contract

Invalidation:

- clears the cached vault snapshot and parsed note metadata
- clears note lookup data
- clears all vault asset indexes
- does not scan the filesystem
- does not parse notes
- does not build search documents

The next ordinary request rebuilds the data it needs through the existing lazy loading pipeline. Search documents are derived from the rebuilt vault snapshot and are not stored in a separate server-side cache today.

## Ownership

Each module owns its private cache and exports a narrow invalidation function. `vaultCache.ts` composes those module-level functions but does not own loading or parsing logic.

UI code must never import the internal invalidation function. It calls the admin HTTP endpoint, which only invalidates caches and returns a result.

## Concurrency

Invalidation replaces cached promise references with `null`. Requests that already hold an old promise may finish using that snapshot, while the next request starts a fresh load. This keeps invalidation lightweight and avoids coupling it to the loading pipeline.

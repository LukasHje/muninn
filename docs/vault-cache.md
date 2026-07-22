# Vault Cache Invalidation

Muninn caches vault-derived data in memory so ordinary requests do not repeatedly scan and parse the mounted Obsidian vault.

This document defines how cached vault data may be discarded without restarting the server or coupling invalidation to filesystem loading.

## Central Contract

Every caller that needs to discard vault-derived data must use:

```ts
invalidateVaultCaches()
```

The function lives in `src/lib/vaultCache.ts` and is the single invalidation entry point for HTTP endpoints and future filesystem watchers, webhooks, scheduled jobs, or CLI commands.

Invalidation:

- clears the cached vault snapshot and parsed note metadata
- clears note lookup data
- clears the current and legacy vault asset indexes
- performs no filesystem scan
- parses no notes
- builds no search documents
- returns without waiting for a rebuild

The next ordinary request rebuilds only the data it needs through the existing lazy loading pipeline. Search documents are currently derived from the rebuilt vault snapshot and are not stored in a separate server-side cache.

Invalidation and rebuilding must remain separate operations.

## Cache Ownership

Each module owns its private cache and exports a narrow invalidation function. `vaultCache.ts` composes those invalidators but does not own loading, scanning, parsing, or index construction.

The current registry is:

| Cache owner | Invalidator | Responsibility |
| --- | --- | --- |
| `src/lib/vault.ts` | `invalidateVaultDataCache()` | Vault snapshot, parsed notes, note lookup |
| `src/lib/vaultAssetIndex.ts` | `invalidateVaultAssetIndexCache()` | Current asset index |
| `src/lib/resolveVaultAsset.ts` | `invalidateLegacyVaultAssetIndexCache()` | Legacy asset lookup index |

The module-level invalidators are implementation details. External triggers import only `invalidateVaultCaches()`.

## Adding a Vault-Derived Cache

Any new module-global cache derived from vault files, note metadata, or vault assets must participate in central invalidation.

When adding one:

1. Keep the cache private to its owning module.
2. Export a narrow, synchronous invalidation function.
3. Make invalidation discard references only; do not rebuild inside it.
4. Register the invalidator in `src/lib/vaultCache.ts`.
5. Update the cache registry in this document.
6. Add focused tests when stale data could survive invalidation.

Do not scatter direct assignments to private cache globals across API routes, UI code, watchers, or commands.

## Admin HTTP Endpoint

The manual trigger is:

```http
POST /api/admin/reload-vault
```

It calls `invalidateVaultCaches()` and returns:

```json
{
  "success": true
}
```

The response uses `Cache-Control: no-store`. The endpoint must not scan the vault, parse notes, rebuild indexes, restart the process, or contain UI cooldown logic.

### Trust boundary

The endpoint intentionally has no application-level authentication. Muninn is designed here as a self-hosted application inside a trusted local network.

This is an explicit deployment assumption, not a general statement that mutation endpoints never require authentication. Deployments exposed beyond a trusted network should enforce access at the reverse proxy or network boundary. If Muninn's deployment model changes, this trust decision must be revisited before adding more admin actions.

## Sidebar Reload Control

The sidebar UI calls the HTTP endpoint; it never imports cache implementation code.

Its two-minute cooldown:

- exists only to prevent accidental repeated clicks
- is implemented in `src/components/SidebarClient.ts`
- stores the cooldown deadline in `sessionStorage`
- survives client-side navigation and a same-tab refresh
- is not backend rate limiting
- is not authentication or authorization
- does not delay the first successful invalidation

The compact sidebar label uses minute granularity while at least one minute remains: `2min`, then `1min`. It switches to per-second updates at `59s` and continues down to `1s`. The stored deadline remains millisecond-based; this formatting affects presentation only.

The control reports running, success, and failure states through an `aria-live` status region. A failed request reports failure but does not change the backend contract.

## Concurrency Semantics

Invalidation replaces cached promise references with `null`. Requests that already hold an old promise may finish using that snapshot, while a later request starts a fresh load.

This is intentional eventual consistency for a lightweight manual refresh. Invalidation does not cancel in-flight work and does not guarantee that every concurrent response switches snapshots at one atomic instant.

Do not add locking, eager rescans, or request cancellation unless a future consistency requirement justifies the additional complexity and updates this contract.

## Future Triggers

Future triggers may include:

- filesystem watchers
- Syncthing webhooks
- scheduled refreshes
- CLI commands

Every trigger should call the same central function. Trigger-specific policy belongs at the trigger boundary; loading and parsing remain owned by the existing lazy pipeline.

## Verification

Changes to cache invalidation should verify:

- every registered cache reference is discarded
- invalidation performs no filesystem traversal
- `POST /api/admin/reload-vault` returns the documented response
- the next ordinary request rebuilds through existing loaders
- repeated invalidations remain safe
- current requests may finish without corrupting the replacement cache
- the sidebar control cannot accidentally issue repeated requests during cooldown

# Vault Ingestion Contract

Muninn discovers vault content through one recursive traversal before parsing notes, resolving assets, building search data, or calculating Experience counts.

## Ownership

`src/lib/vaultTraversal.ts` owns the decision about whether a directory may be traversed and whether a discovered file belongs to the vault dataset.

All vault consumers must use `listVaultFilesRecursively()`. They must not implement independent recursive discovery or repeat infrastructure filename checks downstream.

Early exclusion is important because a file rejected during traversal can never enter:

- note parsing
- Library and Recently Updated views
- search documents
- Experiences and category counts
- asset indexing

## Infrastructure exclusions

Muninn excludes synchronization infrastructure rather than presenting it as user-authored vault content.

Current rules:

| Source | Marker | Rule |
| --- | --- | --- |
| Syncthing file versioning | directory named `.stversions` | do not descend into the directory |
| Syncthing conflict handling | filename containing `.sync-conflict-` | do not return the file from traversal |

Syncthing conflict copies use a filename such as:

```text
Category experience design.sync-conflict-20260722-002017-A5TW3EW.md
```

Although Syncthing propagates these as ordinary files, Muninn treats the marker as infrastructure metadata. The exclusion applies to every file type so a conflicted attachment cannot enter the asset index either.

## Extension rules

When adding another infrastructure exclusion:

1. Add it to the centralized directory or file helper in `vaultTraversal.ts`.
2. Apply it during discovery, before parsing or asset classification.
3. Match a provider-owned marker narrowly enough to avoid hiding normal vault content.
4. Add a direct helper test and a recursive traversal regression test.
5. Update this document.

Do not add configuration for provider-owned metadata unless a real user-content collision requires an explicit escape hatch.

## Scope boundary

Traversal decides whether a path belongs to the vault dataset. It does not:

- resolve synchronization conflicts
- delete or rename conflict copies
- choose which conflicting version is authoritative
- parse Markdown
- classify notes or attachments
- rebuild caches

Users must still inspect and resolve the underlying Syncthing conflict. Muninn only prevents the conflict copy from appearing as a second note or asset.

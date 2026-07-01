# Data Folder

`data/vault/` is ignored by git and intended for local private testing with your real Obsidian vault.

Muninn treats the Obsidian vault as read-only data. The app reads notes and assets from it, but does not write anything back into the vault.

You can use Muninn in three common ways:

- Place your private vault in `data/vault/`
- Set `VAULT_PATH` to any folder on disk
- In Docker, mount your vault to `/vault` and set `VAULT_PATH=/vault`

If no `VAULT_PATH` is set, Muninn falls back to `data/example-vault/` so the app can run without private content.

In local development, app-specific state is stored in `data/local-state/`.

Within that state directory, `Anteckningsblock` notes are stored in `data/local-state/scratchpad/`.

These notes are owned by Muninn and are not written to the Obsidian vault.

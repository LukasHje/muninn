# Muninn

Muninn is an Astro-based reader for an Obsidian vault. The application never needs to know where the vault exists on the host machine. Outside Docker it reads from `VAULT_PATH`, and inside Docker it only reads from `/vault`.

Important:

- The Obsidian vault is read-only from Muninn's perspective.
- Muninn reads notes and assets from the vault, but does not write anything back into it.
- `Anteckningsblock` is app-owned data stored separately from the vault.
- `Anteckningsblock` is never written to the Obsidian vault.

## Local Development

Local development remains unchanged:

```sh
npm install
cp .env.example .env
npm run dev
```

Use the committed example vault by default:

```env
VAULT_PATH=./data/example-vault
```

If you want to test against a private local vault instead:

```env
VAULT_PATH=./data/vault
```

## Docker

Create a real `.env` for your deployment environment:

```env
VAULT_HOST_PATH=/your/vault
CACHE_HOST_PATH=/your/cache
LOGS_HOST_PATH=/your/logs
STATE_HOST_PATH=/your/state
```

Then start the container:

```sh
docker compose up
```

Inside the container, Muninn reads the vault from:

```env
VAULT_PATH=/vault
```

That internal path is fixed by `docker-compose.yml`. Only the host-side mount values differ between Windows, macOS, Linux, Synology, TrueNAS, Unraid, Portainer overrides, or other deployment platforms.

## Notes

- `data/vault/` is treated as local ignored data.
- `data/example-vault/` is committed so the app can run without a private vault.
- The Obsidian vault is treated as a read-only content source.
- `Anteckningsblock` belongs to Muninn, not to Obsidian.
- Local app-owned state lives in `data/local-state/`.
- In Docker, app-owned state lives in `/state/`.
- Scratchpad notes are not synced or written back to the vault.
- `public/vault-assets/` is generated during `predev` and `prebuild`.
- `.env` is local-only and should never be committed.

## Commands

- `npm run dev` starts the local Astro dev server.
- `npm run build` builds the production server output.
- `npm run preview` previews the built app locally.

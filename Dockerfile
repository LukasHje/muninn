# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY astro.config.mjs tsconfig.json ./
COPY public ./public
COPY src ./src

# Vault content is runtime data. Building against an intentionally empty vault
# prevents notes and generated vault assets from being baked into the image.
RUN mkdir -p /tmp/muninn-build-vault \
	&& VAULT_PATH=/tmp/muninn-build-vault npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=4321 \
	VAULT_PATH=/vault

WORKDIR /app

RUN mkdir -p /vault /state \
	&& chown -R node:node /app /vault /state

COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:4321/favicon.svg').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "./dist/server/entry.mjs"]

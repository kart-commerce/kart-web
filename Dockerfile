# syntax=docker/dockerfile:1

# Stage 1: install deps + build the Angular SSR bundle.
FROM node:22-alpine AS build
WORKDIR /app

# Separate dependency-install layer from source copy so `npm ci` is cached
# across builds when only application source changes (kart-conventions.md /
# architecture.md "Layer Caching" convention, mirrored from the backend
# services' multi-stage Dockerfiles).
COPY package.json package-lock.json ./
# vendor/ holds the design-system package tarball (WEB-6) — npm ci needs the
# actual file present at install time, not just the manifests referencing it.
COPY vendor/ ./vendor/
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: minimal runtime image — only the published SSR server output.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist/kart-web ./dist/kart-web

EXPOSE 4000
CMD ["node", "dist/kart-web/server/server.mjs"]

# kart-web

Customer-facing storefront (Angular). Public-facing SSR Angular application for Kart's `Customer` actor, per `kart-platform/docs/client/kart-web/`.

This build covers **Release 0** (repo shell, SSR/hydration bootstrap, `@kart/design-system` integration, generated-API-client tooling) and **Release 1** (BFF auth/session core — register, native login, MFA, social login, password reset — and SSR category navigation), per `kart-platform/docs/releases/release-0-platform-bootstrap.md` and `release-1-identity-navigation.md`. Everything else in `docs/client/kart-web/tickets.md` (cart, checkout, i18n, PWA, GDPR, real-time, etc.) is out of scope for this pass — see those tickets' own release assignment.

## Stack

- Angular 22, standalone components, signals, **zoneless change detection** (`provideZonelessChangeDetection()` — no `zone.js` dependency).
- SSR via `@angular/ssr` + a custom Express server (`src/server.ts`) that also hosts the BFF auth routes.
- Karma + Jasmine (not Vitest) for unit tests — required to match `kart-devops`'s existing `angular-app-ci.yml` reusable workflow, which invokes `ng test -- --browsers=ChromeHeadless`.
- Redis-backed server-side session store (BFF pattern — the browser never holds a token, only an opaque `HttpOnly` session cookie).

## Prerequisites

- Node.js 22.x (`npm ci` warns on other majors but the app itself is unaffected).
- A running Redis instance (session store):
  ```bash
  docker run -d --name kart-web-redis -p 6379:6379 redis:7-alpine
  ```
- To exercise the auth flows end-to-end, a running `kart-identity-service` (see its own README — needs PostgreSQL + Redis + an RS256 signing key). To exercise category navigation against real data, a running `kart-category-service` (see "kart-category-service has no run instructions" below).

## Environment variables

| Variable | Default | Used by |
|---|---|---|
| `PORT` | `4000` | SSR server listen port |
| `REDIS_URL` | `redis://localhost:6380` | BFF session store — 6380 is `kart-devops/docker-compose.yml`'s host-mapped port for its shared Redis container (6379 is commonly already bound by a local Redis install); point at 6379 instead for your own standalone Redis |
| `SESSION_TTL_SECONDS` | `7776000` (90 days) | BFF session store + cookie `Max-Age` — matches `security.md`'s native-login absolute session cap |
| `IDENTITY_SERVICE_BASE_URL` | `http://localhost:8081` | BFF → kart-identity-service (server-to-server only; browser never talks to it directly). Port 8081 is kart-identity-service's own local dev port (its `launchSettings.json` http profile) — the same host port `kart-devops/docker-compose.yml` maps it to |
| `GATEWAY_BASE_URL` | `http://localhost:8100` | Angular app's generated clients' base URL — kart-api-gateway's own local dev port (its `launchSettings.json` http profile), matching `kart-devops/docker-compose.yml`'s host port for it |
| `NG_ALLOWED_HOSTS` | *(none — blocks all hosts)* | Angular SSR's built-in Host-header SSRF guard. **Required** for any real request to succeed — set to the hostname(s) you're serving on, e.g. `NG_ALLOWED_HOSTS=localhost` for local dev. |
| `NODE_ENV` | *(unset)* | `production` makes the session cookie `Secure` (requires HTTPS) |

## Local development

```bash
npm ci
REDIS_URL=redis://localhost:6380 NG_ALLOWED_HOSTS=localhost npm run build
REDIS_URL=redis://localhost:6380 NG_ALLOWED_HOSTS=localhost node dist/kart-web/server/server.mjs
```

Or `npm start` for the CSR dev server (no SSR/BFF routes — fine for iterating on component templates, but auth/category-nav need the real server above).

## Scripts

| Script | Purpose |
|---|---|
| `npm run build` | Production SSR build |
| `npm test` | Karma unit tests (`ChromeHeadless` in CI) |
| `npm run lint` | ESLint (`@angular-eslint`) |
| `npm run watch` | Dev build, watch mode |

## Testing notes

- `src/app/**` (services, components, interceptors, guards) is unit-tested via Karma/Jasmine + `HttpClientTestingModule`.
- `src/server/bff/**` (session store, identity-service client, cookie helpers) is **not** unit-tested under Karma — these use Node-only APIs (`ioredis`, `node:crypto`, server-side `fetch`) that don't run in a browser test environment. They were integration-tested manually against a real running `kart-identity-service`/`kart-category-service` + Redis + Postgres stack (register → login → MFA → logout, and SSR category-tree rendering against seeded data) rather than covered by an automated suite in this pass.
- `src/test-providers.ts` (wired via `angular.json`'s `test.options.providersFile`) mirrors `app.config.ts`'s zoneless change detection for every spec's `TestBed` — without it, plain (non-signal) property mutations on host test components silently fail to re-render under `fixture.detectChanges()`.

## `@kart/design-system` — current integration state (known gap)

The design-system package (sibling repo `kart-design-system`) is not yet published to any registry, and its own `package.json` still names it `design-system` (unscoped), not `@kart/design-system`. Until real publishing to GitHub Packages exists:

- The package is built (`ng build`) and packed (`npm pack`) from `kart-design-system/dist/design-system`, and the resulting tarball is **vendored into this repo** at `vendor/design-system-0.0.1.tgz`, referenced as `"design-system": "file:vendor/design-system-0.0.1.tgz"` in `package.json`.
- This is deliberate: a `file:` dependency pointing at the *sibling repo's* `dist/` folder (the natural first thing to try) does not survive a Docker build or a real CI checkout, since only this repo is present in either context — vendoring a tarball keeps the dependency self-contained.
- To pick up a new design-system release before real publishing exists: rebuild the design-system repo, `npm pack` its `dist/design-system` output, replace `vendor/design-system-*.tgz`, update the version in `package.json`, `npm install`.
- Only the compiled CSS token files and the generated TS token constants are consumed today (`shared/ui/`'s components are hand-built against the CSS custom properties) — the design-system's own component layer is still a placeholder upstream.

## Generated API clients (WEB-3)

`src/app/core/http/generated/category/v1/` is `openapi-generator-cli`'s real `typescript-angular` output (verified by actually running the generator against `contracts/kart-category-service.api-contract.yaml` in this environment), committed to the repo. `.github/workflows/ci.yml` wires `kart-devops`'s `openapi-client-codegen.yml` reusable workflow to regenerate and drift-check it on every push.

kart-identity-service does **not** get a generated Angular client in this pass — every identity-service call happens server-side through the BFF (`src/server/bff/identity-client.ts`, a plain `fetch` wrapper, not an Angular `HttpClient` consumer), since the browser never talks to it directly. Generating an unused Angular client for it would just be dead code; add one if/when Angular feature code needs to call it directly (e.g., a future profile-management feature).

## kart-category-service has no run instructions (upstream gap)

Unlike `kart-identity-service` (whose README documents Postgres/Redis/signing-key setup), `kart-category-service`'s README is a single line with no run instructions. For reference, this is what was actually needed to run it locally during development of this app:

```bash
docker run -d --name kart-category-postgres -p 5432:5432 \
  -e POSTGRES_DB=kart_category -e POSTGRES_USER=kart_category_service -e POSTGRES_PASSWORD=changeme \
  postgres:16
docker run -d --name kart-category-redis -p 6379:6379 redis:7-alpine

cd ../kart-category-service
dotnet ef database update \
  --project src/Infrastructure/KartCategoryService.Infrastructure.csproj \
  --startup-project src/Api/KartCategoryService.Api.csproj
dotnet run --project src/Api/KartCategoryService.Api.csproj
# listens on http://localhost:8084 (its launchSettings.json http profile — the same host
# port kart-devops/docker-compose.yml maps it to)
```

RabbitMQ is optional to boot the service (topology/outbox-relay failures are logged, not fatal) but required for it to actually publish `CategoryUpdated`.

## Security notes

- `npm audit` reports vulnerabilities in Angular CLI's/Karma's own transitive **devDependency** chains (build/lint/test tooling only — never shipped in the deployed app). `npm audit fix --force` would downgrade `@angular/cli` to v19 and `karma` to a pre-fix version, which is a strictly worse outcome (incompatible with this repo's Angular 22 requirement and this repo's own working Karma setup) — left as-is, tracked upstream in Angular's/Karma's own dependency trees.
- The BFF (`src/server/bff/`) never returns a raw stack trace to the client on a downstream failure — see the error-handling middleware in `src/server.ts` (`502 upstream_unavailable`), added after a real (not hypothetical) stack-trace leak was caught during manual smoke testing against a real backend.

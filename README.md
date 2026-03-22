# SimplISS Backend

REST API and real-time layer for **SimplISS** — a QR-based restaurant ordering system. Built with **Node.js**, **Express 5**, **Prisma** (PostgreSQL), **Redis**, and **Socket.IO**.

All HTTP routes are versioned under **`/api/v1`**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Redis (Upstash or local)](#redis-upstash-or-local)
- [Database & Prisma](#database--prisma)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [Real-time (Socket.IO)](#real-time-socketio)
- [File uploads](#file-uploads)
- [Docker](#docker)
- [Production notes](#production-notes)
- [Troubleshooting](#troubleshooting)

---

## Features

- JWT access + refresh tokens, role-based access (`SUPER_ADMIN`, `RESTAURANT_ADMIN`, `KITCHEN_STAFF`)
- Restaurant-scoped data with **restaurant isolation** middleware
- Public customer flows (menu by slug/table, sessions, orders, bill request)
- Kitchen / admin order management, payments, reports, QR generation
- Rate limiting, Helmet, CORS, structured logging (Winston), centralized error handling
- Socket.IO namespaces for customer and kitchen updates (Redis adapter ready)

---

## Tech stack

| Layer        | Technology                          |
|-------------|--------------------------------------|
| Runtime     | Node.js 18+                          |
| Language    | TypeScript                           |
| HTTP        | Express 5                            |
| ORM / DB    | Prisma → **PostgreSQL**              |
| Cache / pub | Redis (ioredis, Socket.IO scaling)   |
| Real-time   | Socket.IO                            |
| Validation  | Zod                                  |
| Auth        | bcrypt, jsonwebtoken                 |

---

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** (local, Docker, or hosted e.g. Render)
- **Redis** — [Upstash](#redis-upstash-or-local) (recommended) or a local `redis://` instance

---

## Quick start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy the example file and edit values:

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
```

Minimum required:

- `DATABASE_URL` — PostgreSQL connection string  
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — each **≥ 32 characters**  
- **Redis:** either **`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`** (Upstash) **or** `REDIS_URL` (e.g. `redis://localhost:6379`)

See [Environment variables](#environment-variables) and [Redis (Upstash or local)](#redis-upstash-or-local).

### 3. Create schema and (optional) seed data

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

### 4. Run the API

```bash
npm run dev
```

Server listens on **`http://localhost:3000`** (or `PORT` from `.env`).

### 5. Health checks

| URL | Purpose |
|-----|---------|
| `GET /api/v1/health` | General health |
| `GET /api/v1/health/ready` | Readiness (e.g. DB) |
| `GET /api/v1/health/live` | Liveness |

---

## Environment variables

Loaded via `dotenv` from **`backend/.env`** (do **not** commit real secrets).

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` \| `staging` \| `production` (default: `development`) |
| `PORT` | No | HTTP port (default: `3000`) |
| `DATABASE_URL` | **Yes** | PostgreSQL URL. Cloud hosts often need `?schema=public&sslmode=require` |
| `UPSTASH_REDIS_REST_URL` | No* | Upstash REST base URL, e.g. `https://xxxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | No* | Upstash REST token (paired with URL above) |
| `REDIS_URL` | No** | Standard Redis URL (`redis://` or `rediss://`) when Upstash vars are not both set (default: `redis://localhost:6379`) |
| `JWT_ACCESS_SECRET` | **Yes** | Min 32 characters |
| `JWT_REFRESH_SECRET` | **Yes** | Min 32 characters |
| `CORS_ORIGIN` | No | Allowed browser origin for CORS (default: `http://localhost:8080`) |
| `STORAGE_TYPE` | No | `local` \| `s3` \| `cloudinary` (default: `local`) |
| `QR_BASE_URL` | No | Base URL embedded in QR links (default: `http://localhost:8080`) |
| `S3_*` / `CLOUDINARY_URL` | If used | See `.env.example` for optional object storage |

\*If both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set, they take precedence and the app builds a **`rediss://`** URL for [ioredis](https://github.com/redis/ioredis) (caching + Socket.IO Redis adapter). The HTTP REST API alone is not used for pub/sub.

\**Otherwise use `REDIS_URL` for local or any Redis-compatible URL.

Full template: **`.env.example`**.

---

## Redis (Upstash or local)

This app uses **ioredis** (TCP `redis://` / `rediss://`) for:

- Menu cache, session fast-path, order sequence counters  
- **Socket.IO** `@socket.io/redis-adapter` (needs Redis **pub/sub**)

So we connect to Upstash’s **Redis protocol endpoint** (TLS), not the HTTP REST API. The Upstash dashboard gives **REST URL + token**; we derive:

`rediss://default:<TOKEN>@<host>.upstash.io:6379`

Implementation: `src/config/redisUrl.ts` (`buildUpstashRedisUrl`, `resolveRedisUrl`).

**Local development:** use `REDIS_URL=redis://localhost:6379` and run Redis (e.g. Docker Compose) without setting the Upstash variables.

---

## Database & Prisma

- **Schema:** `prisma/schema.prisma`
- **Migrations:** `prisma/migrations/`
- **Seed:** `prisma/seed.ts` (users, restaurants, menus, tables; demo restaurant for customer testing)

Detailed PostgreSQL setup (local Docker, Render, SSL, Prisma Studio): **`docs/DATABASE.md`**.

Common commands:

```bash
npx prisma generate          # Regenerate Prisma Client after schema changes
npx prisma migrate dev       # Create & apply migration (development)
npx prisma migrate deploy    # Apply migrations (CI / production)
npx prisma db seed           # Run seed
npx prisma studio            # GUI at http://localhost:5555
```

**Important:** Prisma CLI and Prisma Studio read **`DATABASE_URL` from `backend/.env`**. If Studio shows empty tables, confirm `.env` points to the database you expect (e.g. cloud URL with `sslmode=require`), then restart Studio.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with `tsx watch` |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run `node dist/src/server.js` |
| `npm run prisma:generate` | `prisma generate` |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:seed` | `tsx prisma/seed.ts` |
| `npm run prisma:studio` | Prisma Studio |
| `npm run qr:demo` | Generate `docs/demo-customer-qr.png` for seeded demo table |
| `npm run lint` | ESLint on `src/**/*.ts` |
| `npm test` | Jest (configure as needed) |

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Data model
│   ├── seed.ts             # Seed data
│   └── migrations/         # SQL migrations
├── src/
│   ├── app.ts              # Express app, routes, middleware
│   ├── server.ts           # HTTP server, Redis, Socket.IO bootstrap
│   ├── config/             # env, redisUrl, database, redis, cors, logger
│   ├── middleware/         # auth, roles, validation, rate limits, errors
│   ├── modules/            # Feature modules (routes + controllers + services)
│   ├── socket/             # Socket.IO server & handlers
│   └── shared/             # Errors, types, utils
├── uploads/                # Local image storage (when STORAGE_TYPE=local)
├── scripts/
│   └── generate-demo-qr.ts # Demo QR PNG generator
├── docs/
│   ├── DATABASE.md         # PostgreSQL / cloud DB notes
│   └── demo-customer-qr.png
├── .env.example
├── Dockerfile
└── package.json
```

---

## API overview

Base path: **`/api/v1`**.

| Area | Prefix / notes |
|------|----------------|
| Health | `/health`, `/health/ready`, `/health/live` |
| Auth | `/auth` — login, refresh, logout, me |
| Super admin | `/admin/restaurants`, `/admin/users`, `/admin/stats` |
| Restaurant admin | `/restaurant/...` — profile, staff, tables, menu, orders, payments, reports, QR |
| Public (customer) | `/public/r/:slug/t/:tableId/...`, `/public/session/:sessionId/...` |

Authentication: **`Authorization: Bearer <access_token>`** for protected routes (unless public).

Example base URL for clients:

```text
http://localhost:3000/api/v1
```

---

## Real-time (Socket.IO)

The HTTP server attaches Socket.IO. Namespaces/paths used by the app include customer and kitchen flows (see `src/socket/`). Ensure the **same origin / CORS** and **`SOCKET_URL`** on the Flutter client match your deployment.

Redis is used for scaling adapters; configure `REDIS_URL` accordingly in production.

---

## File uploads

- Menu item images use multipart uploads (see `upload.middleware.ts`).
- **`STORAGE_TYPE=local`**: files under **`/uploads`** relative to the process cwd, served at **`GET /uploads/...`**.

---

## Deploy on Render

Your repo may look like `SimplISS/backend/...`. Render must run **build and start from the `backend` folder** (where `package.json` and `dist/` are created).

### Dashboard settings

| Setting | Value |
|--------|--------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `node dist/src/server.js` |

**Why builds failed with Express / `@types` errors:** Render sets `NODE_ENV=production` during install, so `npm install` **skips `devDependencies`**. This project keeps **`typescript`** and **`@types/*`** needed for `tsc` in **`dependencies`**, so the build works. If you add more build-only tools, either move them to `dependencies` or use `npm install --include=dev` in the build command.

If Root Directory is wrong (e.g. repo root without `backend`), the app looks for the compiled file in the wrong place and you get:

`Cannot find module '.../dist/src/server.js'`.

(`tsc` emits `src/server.ts` → `dist/src/server.js`.)

### Blueprint

At the **repository root**, `render.yaml` can define `rootDir: backend` so you don’t forget. Sync the blueprint in the Render dashboard after pushing.

Set **all env vars** (see [Environment variables](#environment-variables)) in Render — especially `DATABASE_URL`, JWT secrets, and Redis/Upstash.

---

## Docker

Build from the `backend` directory (or via repo root `docker compose` which includes this service).

The image runs:

```bash
node dist/src/server.js
```

Ensure **`DATABASE_URL`**, **`REDIS_URL`**, and JWT secrets are injected at runtime (env file or orchestrator secrets).

---

## Production notes

1. Set **`NODE_ENV=production`**, strong **JWT** secrets, and a **PostgreSQL** URL with TLS (`sslmode=require` on many hosts).
2. Set **`CORS_ORIGIN`** to your real web/app origin(s).
3. Run **`npx prisma migrate deploy`** on deploy (not only `dev`).
4. Run Redis reliably (managed Redis in production is recommended).
5. Back up the database and `uploads/` (or use S3/Cloudinary for images).

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| `Invalid environment variables` | JWT secrets length ≥ 32; `DATABASE_URL` set |
| DB connection errors | URL, firewall, `sslmode=require` for cloud Postgres |
| Redis connection errors | Redis running; or Upstash URL+token set; `rediss://` requires TLS (handled automatically) |
| Prisma Studio shows 0 rows | `.env` `DATABASE_URL` points to intended DB; restart Studio |
| CORS errors from browser | `CORS_ORIGIN` matches frontend origin (scheme + host + port) |

---

## License

ISC (see `package.json`).

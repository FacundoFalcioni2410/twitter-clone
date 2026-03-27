# Twitter Clone

A full-stack Twitter/X clone focused on performance, simplicity, and production-ready patterns.

## Prerequisites

| Tool    | Version | Notes                                    |
| ------- | ------- | ---------------------------------------- |
| Docker  | **25+** | Required                                 |
| Node.js | 20.x    | Only needed for local (non-Docker) setup |

## Quick Start (Docker)

```bash
docker compose up -d
docker compose exec app npm run db:migrate:deploy
docker compose exec app npm run db:seed
```

App available at http://localhost:3000

## Local Development

#### 1. Install dependencies

```bash
npm install
```

#### 2. Configure environment

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/twitterclone"
JWT_SECRET="your-super-secret-key-min-32-characters-long!!"
NODE_ENV="development"
```

#### 3. Start database, migrate, seed and run

```bash
docker compose up db -d
npm run db:migrate
npm run db:seed
npm run dev
```

App runs at http://localhost:3000

---

## Demo Credentials

All seeded accounts use the same password:

| Username   | Email                           | Password    |
| ---------- | ------------------------------- | ----------- |
| `facu2410` | `facundofalcioni2410@gmail.com` | `TestTest#` |
| `alicej`   | `alice@example.com`             | `TestTest#` |
| `bobsmith` | `bob@example.com`               | `TestTest#` |

See `prisma/seed.ts` for the full list.

---

## Running Tests

> **The database must be running before executing any tests.** Start just the DB with:
> ```bash
> docker compose up db -d
> ```
> Or run the full stack if you already have it up.

### Unit and integration

```bash
npm test
npm run test:coverage
npm run test:watch
```

### E2E (Playwright)

Playwright browsers must be installed once before running E2E tests:

```bash
npx playwright install
```

E2E tests spin up their own Next.js server, so the app must **not** be running, only the database should be up:

```bash
docker compose up db -d
npm run test:e2e
npm run test:e2e:watch
```

---

## Environment Variables

| Variable     | Required | Description                       |
| ------------ | -------- | --------------------------------- |
| DATABASE_URL | Yes      | PostgreSQL connection string      |
| JWT_SECRET   | Yes      | JWT signing secret (min 32 chars) |
| NODE_ENV     | No       | development or production         |

---

## Useful Scripts

| Command                   | Description                  |
| ------------------------- | ---------------------------- |
| npm run dev               | Start dev server             |
| npm run build             | Production build             |
| npm run db:migrate        | Run migrations (dev)         |
| npm run db:migrate:deploy | Run migrations (prod/Docker) |
| npm run db:seed           | Seed database                |
| npm run db:studio         | Prisma Studio                |
| npm run db:reset          | Reset database               |

---

## Technical Decisions

### Stack

**Next.js 16 (App Router + Server Actions)** keeps the full stack in one repo. Server Actions eliminate a separate API layer and give end-to-end type safety from DB to UI.

**Prisma 7** typed client over raw SQL. Schema changes are compile-time errors, and the migration workflow keeps all environments in sync.

**Custom JWT auth** preferred over NextAuth/Clerk to avoid external dependencies and session tables. A signed JWT in an httpOnly cookie is sufficient for this scope.

**Tailwind CSS v4** utility classes keep styles colocated with markup and fast to iterate on.

**Vitest** faster than Jest, native TypeScript support. Integration tests run against a real DB to catch issues that mocks hide.

**Playwright** E2E tests against a real browser and server, covering auth flows and critical paths.

The stack was chosen for cohesion, one language (TypeScript) from the database to the UI, one repo, no external services required. The goal was a system that is fast to iterate on, straightforward to onboard into, and where a change in the data model is immediately visible as a type error in the UI.

---

### Data Model

```
User ──< Tweet
User ──< Like >── Tweet
User ──< Follow >── User
```

Denormalized counters improve read performance and are updated atomically in transactions.

Unique constraints prevent duplicate follows and likes.

---

### Timeline and follow graph

The follow system is modeled as a directed relationship using a join table (`Follow`) with `followerId` and `followingId`. A unique constraint prevents duplicate follows. `followersCount` and `followingCount` are denormalized on the `User` model and updated atomically in the same transaction as the follow/unfollow, avoiding a COUNT query on every profile load. At this scale the difference is imperceptible, but it's a pattern that matters under real traffic.

Tweets are filtered by followed users plus the current user. The list of `followingIds` is retrieved first, then used in the tweet query (`authorId IN (...)`).

Pagination uses a `(createdAt, id)` cursor to ensure consistency under concurrent writes.

This approach corresponds to a fan-out on read model, which keeps writes simple but requires filtering at query time. At larger scale, a fan-out on write strategy or a materialized timeline would improve read performance.

---

### Authentication

1. Passwords hashed with bcryptjs
2. JWT signed with jose (HS256)
3. Stored in httpOnly cookie
4. Validated on each protected action

---

## Trade-offs and Limitations

### Search
Basic `LIKE` query — no full-text ranking or fuzzy matching.

### Real-time (SSE)
SSE was chosen over WebSockets because the app only needs server-to-client push, Server Actions cover the other direction. Works correctly on a single instance. Multi-instance deployments would need a shared pub/sub layer (Redis Pub/Sub, Firebase Cloud Messaging, Pusher Beams).

### Notifications
Delivered in real-time over SSE and persisted in PostgreSQL. If the recipient is offline when the event fires the SSE message is lost, but the notification will appear on the `/notifications` page on next visit.

### Images
Stored on the local filesystem and persisted via a Docker volume. Ideally images should never touch the app server's disk, an object storage service (S3, Azure Blob, etc.) is the right solution.

---

## AI Tooling

AI tooling was actively used during development, including generating parts of the codebase.

It was used for:
- Exploring architecture decisions and trade-offs before implementation
- Generating initial implementations for features and components
- Reviewing code and suggesting improvements
- Debugging by analyzing errors and investigating root causes

All generated code was reviewed, adapted, and validated before being integrated. Final decisions and overall system design remained under full control.
# Twitter Clone

A full-stack Twitter/X clone focused on performance, simplicity, and production-ready patterns.

## Quick Start (Docker)

Run the full stack with a single command:

```bash
docker compose up --build
```

In a separate terminal, run database setup:

```bash
docker compose exec app npm run db:migrate:deploy
docker compose exec app npm run db:seed
```

App will be available at http://localhost:3000

Use any of the seeded accounts to explore the app.

## Runbook

### Prerequisites

| Tool    | Version | Notes                                    |
| ------- | ------- | ---------------------------------------- |
| Docker  | **25+** | Required                                 |
| Node.js | 20.x    | Only needed for local (non-Docker) setup |

---

### Docker Setup (recommended)

```bash
docker compose up --build
```

Then:

```bash
docker compose exec app npm run db:migrate:deploy
docker compose exec app npm run db:seed
```

---

### Local Development (optional)

#### 1. Clone and install

```bash
git clone <repo-url>
cd twitter-clone
npm install
```

#### 2. Configure environment

```bash
cp .env.example .env
```

Example:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/twitterclone"
JWT_SECRET="your-super-secret-key-min-32-characters-long!!"
NODE_ENV="development"
```

#### 3. Start database

```bash
docker compose up db -d
```

#### 4. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

#### 5. Start app

```bash
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

### Unit and integration

```bash
npm test
npm run test:coverage
npm run test:watch
```

### E2E (Playwright)

```bash
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

Next.js 16 (App Router + Server Actions) removes the need for a separate API layer and keeps type safety from database to UI.

Prisma 7 provides a typed client, simple migrations, and efficient connection handling.

Custom JWT authentication stores sessions in httpOnly cookies, avoiding a session table.

Tailwind CSS v4 enables fast, utility-first styling with minimal setup.

Vitest is used for fast TypeScript testing against a real database.

Playwright covers end-to-end scenarios including authentication flows.

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

The follow system is modeled as a directed relationship using a join table (`Follow`) with `followerId` and `followingId`. A unique constraint prevents duplicate follows.

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

* No image upload
* No real-time updates
* Counters can drift in edge cases
* Basic search using LIKE
* Single-region deployment

---

## Next Steps

* Add image uploads (S3 or Cloudflare R2)
* Real-time timeline (WebSockets or SSE)
* Full-text search (PostgreSQL or external engine)
* Add observability (logging, metrics)

---

## AI Tooling

AI tooling was actively used during development, including generating parts of the codebase.

It was used for:
- Exploring architecture decisions and trade-offs before implementation
- Generating initial implementations for features and components
- Reviewing code and suggesting improvements
- Debugging by analyzing errors and investigating root causes

All generated code was reviewed, adapted, and validated before being integrated. Final decisions and overall system design remained under full control.
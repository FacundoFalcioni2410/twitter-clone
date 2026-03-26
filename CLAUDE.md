@AGENTS.md

# Twitter Clone — Project Conventions

## Stack
- **Framework**: Next.js 16 (App Router)
- **ORM**: Prisma 7 — `prisma-client` generator, output: `app/generated/prisma`
- **Database**: PostgreSQL 16
- **Auth**: Custom JWT (`jose`) + httpOnly cookies — NO third-party auth
- **Validation**: Zod
- **Styles**: Tailwind CSS v4
- **Tests**: Vitest (unit/integration) + Playwright (E2E)
- **Infra**: Docker + docker-compose

## Rules — follow these in every feature, no exceptions

### Data access
- **Mutations** always go through Server Actions in `app/actions/` (marked `"use server"`)
- **Reads** in Server Components call service functions in `app/actions/` directly (no HTTP round-trip)
- No API route handlers (`app/api/`) — not needed for a web-only app
- Client Components trigger mutations via Server Actions using `useTransition` or form `action` prop

### Action return shape
Every action returns the same shape — never throw to the client:
```ts
return { data: ..., error: null }  // success
return { data: null, error: "message" }  // failure
```

### Validation
- Validate every input with a Zod schema before touching the DB
- Schemas live in `app/lib/schemas/` so they can be shared between actions and client components

### Prisma
- Always import the singleton: `import { prisma } from "@/app/lib/db"`
- Never instantiate `PrismaClient` directly outside `app/lib/db.ts`
- Prisma 7 requires `@prisma/adapter-pg` — configured once in `app/lib/db.ts`

### Pagination
- Cursor-based: composite `(createdAt, id)` cursor
- Return shape: `{ data: [...], nextCursor: string | null }`

### Components
- Server Components fetch data by calling actions directly (they can `await` them)
- Client Components call actions via `useTransition` or form `action` prop
- Keep Client Components small — push data fetching up to Server Components

## Testing
- Coverage target: 85%+ on actions and lib

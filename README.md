# Twitter Clone

## Stack

- **Framework**: Next.js 16 (App Router + Server Actions)
- **ORM**: Prisma 7 — PostgreSQL 16
- **Auth**: Custom JWT (`jose`) + httpOnly cookies
- **Styles**: Tailwind CSS v4
- **Tests**: Vitest (unit/integration) + Playwright (E2E)
- **Infra**: Docker + docker-compose

## Setup

```bash
npm install
cp .env.example .env
docker-compose up postgres
npm run db:migrate
npm run dev
```

## Environment Variables

See `.env.example`.

| Variable       | Description                            |
| -------------- | -------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string           |
| `JWT_SECRET`   | JWT signing secret (min 32 chars)      |

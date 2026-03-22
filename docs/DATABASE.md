# PostgreSQL setup

## Local (Docker)

From the repo root:

```bash
docker compose up -d postgres redis
```

Set `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/simpliss?schema=public"
```

Then:

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

## Cloud (e.g. Render)

1. Create a PostgreSQL instance and copy the **external** connection string.
2. Append SSL (required on most hosts):

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require
```

3. Put that value in `DATABASE_URL` in `backend/.env` (never commit real credentials).

4. Put the full URL in `backend/.env` as `DATABASE_URL` (Prisma CLI reads `.env`; a mismatched local URL will make `db seed` hit the wrong server).

5. Apply schema and seed:

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### If `db seed` says “Can’t reach database server”

- Free-tier databases may **sleep**: open the Render dashboard or retry after a minute.
- Confirm `DATABASE_URL` includes `sslmode=require` for Render.
- Ensure nothing else in `.env` points to `localhost` when you intend to use the cloud DB.

### Security

- Never commit real `DATABASE_URL` values. If a password was shared in chat or tickets, **rotate it** in the host dashboard and update `.env` only on deploy machines.

## Demo customer QR

After seeding, generate a PNG that opens the demo table (slug `demo`, fixed table UUID in `prisma/seed.ts`):

```bash
cd backend
npm run qr:demo
```

Override the app base URL (Flutter web) if needed:

```bash
set DEMO_QR_BASE_URL=https://your-deployed-app.example.com
npm run qr:demo
```

Output: `backend/docs/demo-customer-qr.png`

Direct test URL (local web):

`http://localhost:8080/r/demo/t/11111111-1111-1111-1111-111111111111`

# Production Prisma Migration Deploy

Use this runbook when production code depends on a new Prisma migration.

## Rules

- Never run `prisma migrate dev` against production. It is for local development and can create or reset migration state.
- Production migrations must be applied with `prisma migrate deploy`.
- Required environment variable: `DATABASE_URL`.
- Do not paste or commit production database URLs, tokens, or secrets.

## Deploy Migrations

Run against the production database:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Or with the package script:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:deploy
```

If you are using Vercel-managed environment variables, run the command in an environment where production `DATABASE_URL` is available, or pull it into a temporary local env file and delete that file after use.

## After Migration

1. Confirm the command reports all migrations applied.
2. Redeploy the app so the running code and generated Prisma Client match the schema.
3. Retest the affected production flow.

For the campaign wizard save flow, retest:

- Create campaign with a specific Instagram post and specific keyword.
- Create campaign with any post and any comment.
- Save as draft and activate campaign.

## Vercel Build Integration

AP3K uses the `vercel-build` package script. Production deployments apply pending migrations before compiling the application. Preview and local builds do not mutate the production schema. The script prefers `DATABASE_URL_UNPOOLED` and falls back to `DATABASE_URL` only when a direct connection is unavailable:

```bash
npm run vercel-build
```

Keep `DATABASE_URL_UNPOOLED` configured in the production Vercel environment. A failed migration stops the deployment before new code can depend on an unapplied schema.

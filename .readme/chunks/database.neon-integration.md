# Neon Temporary Database Integration

## Purpose
Provides zero-config temporary PostgreSQL database for development with option to claim permanently.

## Key Deviations from Standard
- Development database provisioned automatically via `get-db` CLI
- Database expires in 72 hours unless claimed
- Credentials stored in `.env.local` (gitignored)
- Seamless transition from temporary to permanent database

## Automatic Provisioning

### First Dev Start: `npm run dev`
The dev script includes: `db-remote:neon` which runs:
```bash
npx get-db --yes --env .env.local --ref nextjs-boilerplate
```

This:
1. Creates temporary Neon PostgreSQL database
2. Writes `DATABASE_URL` to `.env.local`
3. Database accessible immediately
4. Expires in 72 hours

### Environment Variables Created
```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb
DATABASE_URL_DIRECT=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb (optional)
```

## Claiming Temporary Database

### Command: `npm run neon:claim`
Run before 72-hour expiration:
```bash
npx get-db claim --env .env.local --ref nextjs-boilerplate
```

This:
- Converts temporary database to permanent
- Same connection string continues working
- No data migration needed
- Database never expires

## Production Database Setup

### Option 1: Use Claimed Neon DB
1. Run `npm run neon:claim` in development
2. Copy `DATABASE_URL` from `.env.local` to production env vars
3. Deploy with production env vars configured

### Option 2: Create New Neon Database
1. Sign up at neon.tech
2. Create new database
3. Copy connection string
4. Set `DATABASE_URL` in production environment

### Option 3: Use Different Provider
Compatible with any PostgreSQL provider:
- Supabase
- Railway
- Render
- AWS RDS
- Any PostgreSQL 12+

## Important Patterns

### Getting Fresh Database
```bash
# Delete existing credentials
rm .env.local

# Restart dev server
npm run dev
# Creates new temporary database
```

### Checking Database Status
```bash
# View current connection
cat .env.local | grep DATABASE_URL

# Test connection
npm run db:studio
# Opens Drizzle Studio
```

### Migration Management
Migrations apply automatically:
- `npm run dev` - Runs migrations before starting
- `npm run build` - Runs migrations during build
- `npm run db:migrate` - Manual migration

## Gotchas / Constraints

- Temporary databases expire after 72 hours
- Must claim before expiration to keep data
- `.env.local` is gitignored - don't commit database credentials
- Each developer gets their own temporary database
- Shared dev database requires manual credential sharing
- Database deletion is permanent (no recovery)

## Environment Variable Priority
1. `.env.local` (gitignored, developer-specific)
2. `.env.production` (committed, production defaults)
3. `.env` (committed, shared defaults)

## Related Systems
- `.readme/chunks/database.pglite-local.md` - Local database alternative
- `.readme/chunks/config.env-validation.md` - DATABASE_URL validation

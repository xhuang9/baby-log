# Neon temporary database workflow (this repo)

## Current setup
- `npm run dev` provisions a temporary Neon Postgres DB via `get-db` and writes `DATABASE_URL` into `.env.local`.
- The database expires in 72 hours unless you claim it.

## Key files
- Scripts: `package.json` (`db-remote:neon`, `neon:claim`)
  ```json
  {
    "scripts": {
      "db-remote:neon": "npx get-db --yes --env .env.local --ref nextjs-boilerplate",
      "neon:claim": "npx get-db claim --env .env.local --ref nextjs-boilerplate"
    }
  }
  ```
- Local credentials: `.env.local` (gitignored)

## How to use
- Start dev (auto-provision): `npm run dev`.
- Claim DB before expiration: `npm run neon:claim`.
- Get a fresh DB: delete `.env.local` and run `npm run dev` again.
  ```bash
  rm .env.local
  npm run dev
  ```

## Resources
- https://neon.tech/docs/introduction/about
- https://www.npmjs.com/package/get-db

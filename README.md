# Baby Log

A calm, local-first baby tracking app designed for tired new parents.

## What is Baby Log?

Baby Log helps parents and caregivers track their newborn's daily activities:

- **Feeding** - Bottle and breast feeds with timer, duration tracking, and automatic amount estimation
- **Nappy Changes** - Track type, colour, and consistency
- **Sleep** - Log sleep sessions with duration
- **Sharing** - Invite caregivers to share baby care duties

Built with a calming aesthetic (soft greens, pinks, and blues) and designed to work offline, because sometimes the 3 AM feed happens without WiFi.

## Features

- **Local-first** - Data syncs instantly to IndexedDB so the app works offline. Changes sync to the cloud when connected.
- **Multi-baby Support** - Track multiple babies and switch between them easily
- **Caregiver Sharing** - Invite partners, grandparents, or nannies to log activities
- **Dark & Light Mode** - Easy on tired eyes at any hour
- **PWA Ready** - Install on your phone's home screen for quick access

## Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: DrizzleORM + Neon PostgreSQL
- **Local Storage**: Dexie (IndexedDB)
- **Auth**: Clerk
- **Testing**: Vitest + Playwright

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (this project uses pnpm, not npm)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd baby-log

# Install dependencies
pnpm install
```

### Environment Setup

Create a `.env.local` file with your credentials:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Database (auto-provisioned on first run, or use your own)
DATABASE_URL=your_database_url
```

### Development

```bash
# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Database

```bash
# Generate migration after schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open database studio
pnpm db:studio
```

### Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e
```

### Code Quality

```bash
# Lint code
pnpm lint

# Type check
pnpm typecheck

# Check for unused dependencies
pnpm check:deps
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   └── [locale]/          # Locale-aware routing
│       ├── (auth)/        # Protected routes (require login)
│       └── api/           # API routes
├── components/            # React components
├── lib/
│   ├── local-db/         # Dexie IndexedDB setup
│   └── ...               # Third-party library configs
├── models/               # DrizzleORM schema
├── services/             # Sync and operations layer
├── locales/              # i18n translations
└── styles/               # Global CSS and theming
```

## Documentation

Detailed documentation lives in `.readme/sections/`. Key sections:

| Section | Purpose |
|---------|---------|
| `architecture.index.md` | Project structure and patterns |
| `local-first.index.md` | Offline-first data architecture |
| `feed-logging.index.md` | Activity tracking implementation |
| `authentication.index.md` | Clerk setup and protected routes |
| `styling.index.md` | Brand colours and theming |

## License

**All Rights Reserved** - Copyright (c) 2026 Parry Huang

This source code is proprietary and confidential. It is made available for viewing purposes only, specifically for employment evaluation by prospective employers and recruiters.

No permission is granted to use, copy, modify, merge, publish, distribute, sublicense, or sell copies of this software.

See [LICENSE](LICENSE) for full terms.

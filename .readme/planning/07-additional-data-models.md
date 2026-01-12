# Additional Data Models

**Priority:** High
**Dependencies:** 01-state-management-sync.md
**Estimated Scope:** Large

---

## Overview

Add new data models for Sleep, Solids, Bath, and Activities. Update the dashboard to support adding these log types. By default, new users only see Feed and Sleep (most important for newborns).

---

## New Data Models

### Sleep Log

```typescript
type SleepLog = {
  id: string;              // UUID
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  location: 'crib' | 'bassinet' | 'bed' | 'stroller' | 'car' | 'other';
  quality: 'good' | 'fair' | 'poor' | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

### Solids Log

```typescript
type SolidsLog = {
  id: string;              // UUID
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  foods: string[];         // Array of food names
  amountEaten: 'none' | 'little' | 'some' | 'most' | 'all';
  reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | 'allergic' | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

### Bath Log

```typescript
type BathLog = {
  id: string;              // UUID
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  durationMinutes: number | null;
  temperature: 'warm' | 'lukewarm' | 'cool' | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

### Activity Log

```typescript
type ActivityLog = {
  id: string;              // UUID
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  endedAt: Date | null;
  activityType: 'tummy_time' | 'play' | 'reading' | 'outdoor' | 'other';
  durationMinutes: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## Database Schema

```sql
-- Sleep logs
CREATE TABLE sleep_logs (
  id UUID PRIMARY KEY,
  baby_id INTEGER REFERENCES babies(id) NOT NULL,
  logged_by_user_id INTEGER REFERENCES users(id) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  location VARCHAR(50),
  quality VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Solids logs
CREATE TABLE solids_logs (
  id UUID PRIMARY KEY,
  baby_id INTEGER REFERENCES babies(id) NOT NULL,
  logged_by_user_id INTEGER REFERENCES users(id) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  foods TEXT[],
  amount_eaten VARCHAR(20),
  reaction VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bath logs
CREATE TABLE bath_logs (
  id UUID PRIMARY KEY,
  baby_id INTEGER REFERENCES babies(id) NOT NULL,
  logged_by_user_id INTEGER REFERENCES users(id) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER,
  temperature VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY,
  baby_id INTEGER REFERENCES babies(id) NOT NULL,
  logged_by_user_id INTEGER REFERENCES users(id) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  activity_type VARCHAR(50) NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Visibility Configuration

### User Preferences

```typescript
type DashboardVisibility = {
  feed: boolean;      // Default: true
  sleep: boolean;     // Default: true
  solids: boolean;    // Default: false (enable for 4+ months)
  bath: boolean;      // Default: false
  activities: boolean; // Default: false
};
```

### Age-Based Suggestions

| Baby Age | Suggested Visible |
|----------|-------------------|
| 0-4 months | Feed, Sleep |
| 4-6 months | Feed, Sleep, Solids |
| 6+ months | All |

---

## Dashboard Updates

### Overview Page with Multiple Tiles

```
┌─────────────────────────────────────────┐
│  Locke1                          [+]    │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ 🍼 Feed                             ││
│  │ 2h ago · 120ml bottle               ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ 😴 Sleep                            ││
│  │ 1h ago · 45m nap                    ││
│  └─────────────────────────────────────┘│
│                                          │
│  [+ Add more trackers]                   │
└─────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Database Schema

- [ ] Add `sleep_logs` table to `Schema.ts`
- [ ] Add `solids_logs` table to `Schema.ts`
- [ ] Add `bath_logs` table to `Schema.ts`
- [ ] Add `activity_logs` table to `Schema.ts`
- [ ] Run `pnpm run db:generate` and `pnpm run db:migrate`

### Phase 2: Dexie Schema

- [ ] Add `sleepLogs` table to `local-db.ts`
- [ ] Add `solidsLogs` table to `local-db.ts`
- [ ] Add `bathLogs` table to `local-db.ts`
- [ ] Add `activityLogs` table to `local-db.ts`
- [ ] Increment Dexie version

### Phase 3: Server Actions

- [ ] Create `src/actions/sleepLogActions.ts`
- [ ] Create `src/actions/solidsLogActions.ts`
- [ ] Create `src/actions/bathLogActions.ts`
- [ ] Create `src/actions/activityLogActions.ts`

### Phase 4: UI Components

- [ ] Create `overview/_components/SleepTile.tsx`
- [ ] Create `overview/_components/SolidsTile.tsx`
- [ ] Create `overview/_components/BathTile.tsx`
- [ ] Create `overview/_components/ActivityTile.tsx`
- [ ] Create add sheets for each type

### Phase 5: Visibility Settings

- [ ] Add `dashboardVisibility` to user preferences
- [ ] Create "Manage trackers" UI in settings
- [ ] Implement age-based suggestions
- [ ] Show/hide tiles based on visibility

### Phase 6: Sync Integration

- [ ] Add new log types to sync endpoints
- [ ] Update query keys for new types
- [ ] Update outbox to handle new types

---

## Success Criteria

- [ ] All new log types can be created
- [ ] Dashboard shows only visible log types
- [ ] Users can customize visible trackers
- [ ] New logs sync correctly
- [ ] Works offline

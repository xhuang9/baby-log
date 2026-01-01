import { boolean, index, integer, pgEnum, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core';

// This file defines the structure of your database tables using the Drizzle ORM.

// To modify the database schema:
// 1. Update this file with your desired changes.
// 2. Generate a new migration by running: `npm run db:generate`

// The generated migration file will reflect your schema changes.
// It automatically run the command `db-server:file`, which apply the migration before Next.js starts in development mode,
// Alternatively, if your database is running, you can run `npm run db:migrate` and there is no need to restart the server.

// Need a database for production? Just claim it by running `npm run neon:claim`.
// Tested and compatible with Next.js Boilerplate

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$onUpdate(() => new Date()), // default NULL
} as const;

// This table is for test only
export const counterSchema = pgTable('counter', {
  id: serial('id').primaryKey(),
  count: integer('count').default(0),
  ...timestamps,
});

export const userSchema = pgTable('user', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').unique(), // e.g. user_2ZJHkQ9mA3xYp8RZqWcT1
  locked: boolean('locked').default(false),
  useMetric: boolean('use_metric').notNull().default(true), // true = metric (cm, kg), false = imperial (inches, lbs)
  colorTheme: text('color_theme').notNull().default('system'), // 'light', 'dark', 'system'
  ...timestamps,
});

export const babiesSchema = pgTable('babies', {
  id: serial('id').primaryKey(),
  ownerUserId: integer('owner_user_id').references(() => userSchema.id),
  name: text('name').notNull(),
  birthDate: timestamp('birth_date', { mode: 'date' }).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  ...timestamps,
});

export const accessLevelEnum = pgEnum('access_level_enum', [
  'owner',
  'editor',
  'viewer',
]);

export const babyAccessSchema = pgTable('baby_access', {
  babyId: integer('baby_id').references(() => babiesSchema.id),
  userId: integer('user_id').references(() => userSchema.id),
  accessLevel: accessLevelEnum('access_level').notNull().default('viewer'),
  ...timestamps,
}, t => [
  primaryKey({ columns: [t.babyId, t.userId] }),
  index('baby_access_user_id_idx').on(t.userId),
]);

export const babyMeasurementsSchema = pgTable('baby_measurements', {
  id: serial('id').primaryKey(),
  babyId: integer('baby_id').references(() => babiesSchema.id).notNull(),
  measuredAt: timestamp('measured_at', { mode: 'date' })
    .notNull()
    .defaultNow(),
  weightsG: integer('weights_g').notNull(), // in grams
  heightsMm: integer('heights_mm').notNull(), // in millimeters
  headCircumferencesMm: integer('head_circumferences_mm').notNull(), // in millimeters
  ...timestamps,
}, t => [
  index('baby_measurements_baby_measured_at_idx')
    .on(t.babyId, t.measuredAt),
]);

export const feedLogSchema = pgTable('feed_log', {
  id: serial('id').primaryKey(),
  babyId: integer('baby_id').references(() => babiesSchema.id).notNull(),
  method: text('method').notNull(), // e.g. breast, bottle
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }), // can be null if ongoing
  amountMl: integer('amount_ml'), // in milliliters
  isEstimated: boolean('is_estimated').notNull().default(false),
  estimatedSource: text('estimated_source'), // e.g. user_rate|default_model|manual_guess
  endSide: text('end_side'), // e.g. left, right (for breast feeding)
  ...timestamps,
}, t => [
  index('feed_log_baby_started_at_idx').on(t.babyId, t.startedAt),
]);

import { pgTable, serial, integer, timestamp, index, foreignKey, type AnyPgColumn, unique, text, boolean, jsonb, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const accessLevelEnum = pgEnum("access_level_enum", ['owner', 'editor', 'viewer'])
export const accessRequestStatusEnum = pgEnum("access_request_status_enum", ['pending', 'approved', 'rejected', 'canceled'])
export const genderEnum = pgEnum("gender_enum", ['male', 'female', 'other', 'unknown'])
export const inviteStatusEnum = pgEnum("invite_status_enum", ['pending', 'accepted', 'revoked', 'expired'])
export const inviteTypeEnum = pgEnum("invite_type_enum", ['passkey', 'email'])
export const nappyColourEnum = pgEnum("nappy_colour_enum", ['green', 'yellow', 'brown', 'black', 'red', 'grey'])
export const nappyConsistencyEnum = pgEnum("nappy_consistency_enum", ['watery', 'runny', 'mushy', 'pasty', 'formed', 'hardPellets'])
export const nappyTypeEnum = pgEnum("nappy_type_enum", ['wee', 'poo', 'mixed', 'dry', 'clean'])
export const solidsReactionEnum = pgEnum("solids_reaction_enum", ['allergic', 'hate', 'liked', 'loved'])
export const syncOpEnum = pgEnum("sync_op_enum", ['create', 'update', 'delete'])


export const counter = pgTable("counter", {
	id: serial().primaryKey().notNull(),
	count: integer().default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const babyMeasurements = pgTable("baby_measurements", {
	id: serial().primaryKey().notNull(),
	babyId: integer("baby_id").notNull(),
	measuredAt: timestamp("measured_at", { mode: 'string' }).defaultNow().notNull(),
	weightsG: integer("weights_g").notNull(),
	heightsMm: integer("heights_mm").notNull(),
	headCircumferencesMm: integer("head_circumferences_mm").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("baby_measurements_baby_measured_at_idx").using("btree", table.babyId.asc().nullsLast().op("int4_ops"), table.measuredAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.babyId],
			foreignColumns: [babies.id],
			name: "baby_measurements_baby_id_babies_id_fk"
		}),
]);

export const user = pgTable("user", {
	id: serial().primaryKey().notNull(),
	clerkId: text("clerk_id"),
	locked: boolean().default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	email: text(),
	firstName: text("first_name"),
	defaultBabyId: integer("default_baby_id"),
}, (table) => [
	foreignKey({
			columns: [table.defaultBabyId],
			foreignColumns: [babies.id],
			name: "user_default_baby_id_babies_id_fk"
		}).onDelete("set null"),
	unique("user_clerk_id_unique").on(table.clerkId),
]);

export const babies = pgTable("babies", {
	id: serial().primaryKey().notNull(),
	ownerUserId: integer("owner_user_id"),
	name: text().notNull(),
	birthDate: timestamp("birth_date", { mode: 'string' }),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	gender: genderEnum(),
	birthWeightG: integer("birth_weight_g"),
}, (table) => [
	foreignKey({
			columns: [table.ownerUserId],
			foreignColumns: [user.id],
			name: "babies_owner_user_id_user_id_fk"
		}),
]);

export const babyAccessRequests = pgTable("baby_access_requests", {
	id: serial().primaryKey().notNull(),
	requesterUserId: integer("requester_user_id").notNull(),
	targetEmail: text("target_email").notNull(),
	targetUserId: integer("target_user_id"),
	requestedAccessLevel: accessLevelEnum("requested_access_level").default('viewer').notNull(),
	message: text(),
	status: accessRequestStatusEnum().default('pending').notNull(),
	resolvedBabyId: integer("resolved_baby_id"),
	resolvedByUserId: integer("resolved_by_user_id"),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("baby_access_requests_requester_user_id_idx").using("btree", table.requesterUserId.asc().nullsLast().op("int4_ops")),
	index("baby_access_requests_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("baby_access_requests_target_email_idx").using("btree", table.targetEmail.asc().nullsLast().op("text_ops")),
	index("baby_access_requests_target_user_id_idx").using("btree", table.targetUserId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.requesterUserId],
			foreignColumns: [user.id],
			name: "baby_access_requests_requester_user_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.targetUserId],
			foreignColumns: [user.id],
			name: "baby_access_requests_target_user_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedBabyId],
			foreignColumns: [babies.id],
			name: "baby_access_requests_resolved_baby_id_babies_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedByUserId],
			foreignColumns: [user.id],
			name: "baby_access_requests_resolved_by_user_id_user_id_fk"
		}),
]);

export const feedLog = pgTable("feed_log", {
	id: text().default(nextval(\'feed_log_id_seq\'::regclass)).primaryKey().notNull(),
	babyId: integer("baby_id").notNull(),
	method: text().notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	amountMl: integer("amount_ml"),
	isEstimated: boolean("is_estimated").default(false).notNull(),
	estimatedSource: text("estimated_source"),
	endSide: text("end_side"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	loggedByUserId: integer("logged_by_user_id").notNull(),
	durationMinutes: integer("duration_minutes"),
}, (table) => [
	index("feed_log_baby_started_at_idx").using("btree", table.babyId.asc().nullsLast().op("int4_ops"), table.startedAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.babyId],
			foreignColumns: [babies.id],
			name: "feed_log_baby_id_babies_id_fk"
		}),
	foreignKey({
			columns: [table.loggedByUserId],
			foreignColumns: [user.id],
			name: "feed_log_logged_by_user_id_user_id_fk"
		}),
]);

export const userUiConfig = pgTable("user_ui_config", {
	userId: integer("user_id").primaryKey().notNull(),
	data: jsonb().default({}).notNull(),
	keyUpdatedAt: jsonb("key_updated_at").default({}).notNull(),
	schemaVersion: integer("schema_version").default(1).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_ui_config_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const babyInvites = pgTable("baby_invites", {
	id: serial().primaryKey().notNull(),
	babyId: integer("baby_id").notNull(),
	inviterUserId: integer("inviter_user_id").notNull(),
	invitedEmail: text("invited_email"),
	invitedUserId: integer("invited_user_id"),
	accessLevel: accessLevelEnum("access_level").default('editor').notNull(),
	status: inviteStatusEnum().default('pending').notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	inviteType: inviteTypeEnum("invite_type").default('email').notNull(),
	tokenHash: text("token_hash"),
	tokenPrefix: text("token_prefix"),
	acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	maxUses: integer("max_uses").default(1).notNull(),
	usesCount: integer("uses_count").default(0).notNull(),
}, (table) => [
	index("baby_invites_baby_id_status_idx").using("btree", table.babyId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("baby_invites_invited_email_idx").using("btree", table.invitedEmail.asc().nullsLast().op("text_ops")),
	index("baby_invites_invited_user_id_idx").using("btree", table.invitedUserId.asc().nullsLast().op("int4_ops")),
	index("baby_invites_token_hash_idx").using("btree", table.tokenHash.asc().nullsLast().op("text_ops")),
	index("baby_invites_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.babyId],
			foreignColumns: [babies.id],
			name: "baby_invites_baby_id_babies_id_fk"
		}),
	foreignKey({
			columns: [table.inviterUserId],
			foreignColumns: [user.id],
			name: "baby_invites_inviter_user_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.invitedUserId],
			foreignColumns: [user.id],
			name: "baby_invites_invited_user_id_user_id_fk"
		}),
	unique("baby_invites_token_unique").on(table.token),
	unique("baby_invites_token_hash_unique").on(table.tokenHash),
]);

export const nappyLog = pgTable("nappy_log", {
	id: text().default(nextval(\'nappy_log_id_seq\'::regclass)).primaryKey().notNull(),
	babyId: integer("baby_id").notNull(),
	loggedByUserId: integer("logged_by_user_id").notNull(),
	type: nappyTypeEnum(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	colour: nappyColourEnum(),
	consistency: nappyConsistencyEnum(),
}, (table) => [
	index("nappy_log_baby_started_at_idx").using("btree", table.babyId.asc().nullsLast().op("int4_ops"), table.startedAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.babyId],
			foreignColumns: [babies.id],
			name: "nappy_log_baby_id_babies_id_fk"
		}),
	foreignKey({
			columns: [table.loggedByUserId],
			foreignColumns: [user.id],
			name: "nappy_log_logged_by_user_id_user_id_fk"
		}),
]);

export const sleepLog = pgTable("sleep_log", {
	id: text().default(nextval(\'sleep_log_id_seq\'::regclass)).primaryKey().notNull(),
	babyId: integer("baby_id").notNull(),
	loggedByUserId: integer("logged_by_user_id").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	durationMinutes: integer("duration_minutes"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("sleep_log_baby_started_at_idx").using("btree", table.babyId.asc().nullsLast().op("int4_ops"), table.startedAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.babyId],
			foreignColumns: [babies.id],
			name: "sleep_log_baby_id_babies_id_fk"
		}),
	foreignKey({
			columns: [table.loggedByUserId],
			foreignColumns: [user.id],
			name: "sleep_log_logged_by_user_id_user_id_fk"
		}),
]);

export const syncEvents = pgTable("sync_events", {
	id: serial().primaryKey().notNull(),
	babyId: integer("baby_id").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	op: syncOpEnum().notNull(),
	payload: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sync_events_baby_id_idx").using("btree", table.babyId.asc().nullsLast().op("int4_ops"), table.id.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.babyId],
			foreignColumns: [babies.id],
			name: "sync_events_baby_id_babies_id_fk"
		}),
]);

export const solidsLog = pgTable("solids_log", {
	id: text().primaryKey().notNull(),
	babyId: integer("baby_id").notNull(),
	loggedByUserId: integer("logged_by_user_id").notNull(),
	food: text().notNull(),
	reaction: solidsReactionEnum().notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("solids_log_baby_started_at_idx").using("btree", table.babyId.asc().nullsLast().op("int4_ops"), table.startedAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.babyId],
			foreignColumns: [babies.id],
			name: "solids_log_baby_id_fkey"
		}),
	foreignKey({
			columns: [table.loggedByUserId],
			foreignColumns: [user.id],
			name: "solids_log_logged_by_user_id_fkey"
		}),
]);

export const babyAccess = pgTable("baby_access", {
	babyId: integer("baby_id").notNull(),
	userId: integer("user_id").notNull(),
	accessLevel: accessLevelEnum("access_level").default('viewer').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	caregiverLabel: text("caregiver_label"),
	lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("baby_access_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.babyId],
			foreignColumns: [babies.id],
			name: "baby_access_baby_id_babies_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "baby_access_user_id_user_id_fk"
		}),
	primaryKey({ columns: [table.babyId, table.userId], name: "baby_access_baby_id_user_id_pk"}),
]);

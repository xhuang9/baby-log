import { relations } from "drizzle-orm/relations";
import { babies, babyMeasurements, user, babyAccessRequests, feedLog, userUiConfig, babyInvites, nappyLog, sleepLog, syncEvents, solidsLog, babyAccess } from "./schema";

export const babyMeasurementsRelations = relations(babyMeasurements, ({one}) => ({
	baby: one(babies, {
		fields: [babyMeasurements.babyId],
		references: [babies.id]
	}),
}));

export const babiesRelations = relations(babies, ({one, many}) => ({
	babyMeasurements: many(babyMeasurements),
	users: many(user, {
		relationName: "user_defaultBabyId_babies_id"
	}),
	user: one(user, {
		fields: [babies.ownerUserId],
		references: [user.id],
		relationName: "babies_ownerUserId_user_id"
	}),
	babyAccessRequests: many(babyAccessRequests),
	feedLogs: many(feedLog),
	babyInvites: many(babyInvites),
	nappyLogs: many(nappyLog),
	sleepLogs: many(sleepLog),
	syncEvents: many(syncEvents),
	solidsLogs: many(solidsLog),
	babyAccesses: many(babyAccess),
}));

export const userRelations = relations(user, ({one, many}) => ({
	baby: one(babies, {
		fields: [user.defaultBabyId],
		references: [babies.id],
		relationName: "user_defaultBabyId_babies_id"
	}),
	babies: many(babies, {
		relationName: "babies_ownerUserId_user_id"
	}),
	babyAccessRequests_requesterUserId: many(babyAccessRequests, {
		relationName: "babyAccessRequests_requesterUserId_user_id"
	}),
	babyAccessRequests_targetUserId: many(babyAccessRequests, {
		relationName: "babyAccessRequests_targetUserId_user_id"
	}),
	babyAccessRequests_resolvedByUserId: many(babyAccessRequests, {
		relationName: "babyAccessRequests_resolvedByUserId_user_id"
	}),
	feedLogs: many(feedLog),
	userUiConfigs: many(userUiConfig),
	babyInvites_inviterUserId: many(babyInvites, {
		relationName: "babyInvites_inviterUserId_user_id"
	}),
	babyInvites_invitedUserId: many(babyInvites, {
		relationName: "babyInvites_invitedUserId_user_id"
	}),
	nappyLogs: many(nappyLog),
	sleepLogs: many(sleepLog),
	solidsLogs: many(solidsLog),
	babyAccesses: many(babyAccess),
}));

export const babyAccessRequestsRelations = relations(babyAccessRequests, ({one}) => ({
	user_requesterUserId: one(user, {
		fields: [babyAccessRequests.requesterUserId],
		references: [user.id],
		relationName: "babyAccessRequests_requesterUserId_user_id"
	}),
	user_targetUserId: one(user, {
		fields: [babyAccessRequests.targetUserId],
		references: [user.id],
		relationName: "babyAccessRequests_targetUserId_user_id"
	}),
	baby: one(babies, {
		fields: [babyAccessRequests.resolvedBabyId],
		references: [babies.id]
	}),
	user_resolvedByUserId: one(user, {
		fields: [babyAccessRequests.resolvedByUserId],
		references: [user.id],
		relationName: "babyAccessRequests_resolvedByUserId_user_id"
	}),
}));

export const feedLogRelations = relations(feedLog, ({one}) => ({
	baby: one(babies, {
		fields: [feedLog.babyId],
		references: [babies.id]
	}),
	user: one(user, {
		fields: [feedLog.loggedByUserId],
		references: [user.id]
	}),
}));

export const userUiConfigRelations = relations(userUiConfig, ({one}) => ({
	user: one(user, {
		fields: [userUiConfig.userId],
		references: [user.id]
	}),
}));

export const babyInvitesRelations = relations(babyInvites, ({one}) => ({
	baby: one(babies, {
		fields: [babyInvites.babyId],
		references: [babies.id]
	}),
	user_inviterUserId: one(user, {
		fields: [babyInvites.inviterUserId],
		references: [user.id],
		relationName: "babyInvites_inviterUserId_user_id"
	}),
	user_invitedUserId: one(user, {
		fields: [babyInvites.invitedUserId],
		references: [user.id],
		relationName: "babyInvites_invitedUserId_user_id"
	}),
}));

export const nappyLogRelations = relations(nappyLog, ({one}) => ({
	baby: one(babies, {
		fields: [nappyLog.babyId],
		references: [babies.id]
	}),
	user: one(user, {
		fields: [nappyLog.loggedByUserId],
		references: [user.id]
	}),
}));

export const sleepLogRelations = relations(sleepLog, ({one}) => ({
	baby: one(babies, {
		fields: [sleepLog.babyId],
		references: [babies.id]
	}),
	user: one(user, {
		fields: [sleepLog.loggedByUserId],
		references: [user.id]
	}),
}));

export const syncEventsRelations = relations(syncEvents, ({one}) => ({
	baby: one(babies, {
		fields: [syncEvents.babyId],
		references: [babies.id]
	}),
}));

export const solidsLogRelations = relations(solidsLog, ({one}) => ({
	baby: one(babies, {
		fields: [solidsLog.babyId],
		references: [babies.id]
	}),
	user: one(user, {
		fields: [solidsLog.loggedByUserId],
		references: [user.id]
	}),
}));

export const babyAccessRelations = relations(babyAccess, ({one}) => ({
	baby: one(babies, {
		fields: [babyAccess.babyId],
		references: [babies.id]
	}),
	user: one(user, {
		fields: [babyAccess.userId],
		references: [user.id]
	}),
}));
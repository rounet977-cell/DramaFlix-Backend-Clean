import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").default("Guest"),
  avatarUrl: text("avatar_url"),
  authProvider: text("auth_provider").default("local"), // 'local', 'guest', 'google'
  language: text("language").default("en"),
  isPremium: integer("is_premium", { mode: "boolean" }).default(false),
  premiumExpiresAt: integer("premium_expires_at", { mode: "timestamp_ms" }),
  coinBalance: integer("coin_balance").default(0),
  notificationPrefs: text("notification_prefs").default('{"episodes":true,"recommendations":true,"promotions":false}'),
  dataPreferences: text("data_preferences").default('{"autoplayPreviews":true,"wifiOnly":false,"videoQuality":"auto"}'),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const series = sqliteTable("series", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverImageUrl: text("cover_image_url").notNull(),
  posterImageUrl: text("poster_image_url").notNull(),
  heroPreviewVideoUrl: text("hero_preview_video_url"),
  genres: text("genres").default("[]"),
  totalEpisodes: integer("total_episodes").default(0),
  freeEpisodes: integer("free_episodes").default(3),
  releaseYear: integer("release_year").default(2025),
  rating: real("rating").default(4.5),
  isTrending: integer("is_trending", { mode: "boolean" }).default(false),
  isNew: integer("is_new", { mode: "boolean" }).default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  viewCount: integer("view_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const episodes = sqliteTable("episodes", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  seriesId: text("series_id").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoUrl: text("video_url").notNull(),
  duration: integer("duration").default(90),
  isLocked: integer("is_locked", { mode: "boolean" }).default(true),
  unlockType: text("unlock_type").default("free"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const genres = sqliteTable("genres", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull().unique(),
  iconName: text("icon_name").default("film"),
  colorStart: text("color_start").default("#E50914"),
  colorEnd: text("color_end").default("#B20710"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const watchHistory = sqliteTable("watch_history", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  seriesId: text("series_id").notNull(),
  episodeId: text("episode_id").notNull(),
  progress: real("progress").default(0),
  lastWatchedAt: integer("last_watched_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const favorites = sqliteTable("favorites", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  seriesId: text("series_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const unlockedEpisodes = sqliteTable("unlocked_episodes", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  episodeId: text("episode_id").notNull(),
  unlockMethod: text("unlock_method").default("free"),
  unlockedAt: integer("unlocked_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const coinTransactions = sqliteTable("coin_transactions", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'earn', 'spend', 'reward', 'purchase'
  reason: text("reason"), // 'rewarded_ad', 'episode_unlock', etc
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  plan: text("plan").notNull(), // 'weekly', 'monthly', 'yearly'
  purchaseToken: text("purchase_token"),
  googleProductId: text("google_product_id"),
  status: text("status").notNull(), // 'active', 'pending', 'cancelled', 'expired'
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  renewsAt: integer("renews_at", { mode: "timestamp_ms" }),
  purchasedAt: integer("purchased_at", { mode: "timestamp_ms" }).defaultNow(),
  cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
});

export const pushTokens = sqliteTable("push_tokens", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  active: integer("active", { mode: "boolean" }).default(true),
  registeredAt: integer("registered_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const contactMessages = sqliteTable("contact_messages", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending"), // 'pending', 'acknowledged', 'resolved'
  response: text("response"),
  respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertSeriesSchema = createInsertSchema(series);
export const selectSeriesSchema = createSelectSchema(series);
export const insertEpisodeSchema = createInsertSchema(episodes);
export const selectEpisodeSchema = createSelectSchema(episodes);
export const insertGenreSchema = createInsertSchema(genres);
export const selectGenreSchema = createSelectSchema(genres);
export const insertWatchHistorySchema = createInsertSchema(watchHistory);
export const insertFavoriteSchema = createInsertSchema(favorites);
export const insertUnlockedEpisodeSchema = createInsertSchema(unlockedEpisodes);
export const insertCoinTransactionSchema = createInsertSchema(coinTransactions);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const insertPushTokenSchema = createInsertSchema(pushTokens);
export const insertContactMessageSchema = createInsertSchema(contactMessages);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Series = typeof series.$inferSelect;
export type InsertSeries = typeof series.$inferInsert;
export type Episode = typeof episodes.$inferSelect;
export type InsertEpisode = typeof episodes.$inferInsert;
export type Genre = typeof genres.$inferSelect;
export type InsertGenre = typeof genres.$inferInsert;
export type WatchHistory = typeof watchHistory.$inferSelect;
export type InsertWatchHistory = typeof watchHistory.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;
export type UnlockedEpisode = typeof unlockedEpisodes.$inferSelect;
export type InsertUnlockedEpisode = typeof unlockedEpisodes.$inferInsert;
export type CoinTransaction = typeof coinTransactions.$inferSelect;
export type InsertCoinTransaction = typeof coinTransactions.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

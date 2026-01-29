import { eq, desc, and, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  series,
  episodes,
  genres,
  watchHistory,
  favorites,
  unlockedEpisodes,
  coinTransactions,
  subscriptions,
  pushTokens,
  contactMessages,
  User,
  InsertUser,
  Series,
  InsertSeries,
  Episode,
  InsertEpisode,
  Genre,
  InsertGenre,
  WatchHistory,
  InsertWatchHistory,
  Favorite,
  UnlockedEpisode,
  CoinTransaction,
  InsertCoinTransaction,
  Subscription,
  InsertSubscription,
  PushToken,
  InsertPushToken,
} from "@shared/schema";

export interface IStorage {
  // Auth
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(email: string, password: string, displayName: string): Promise<User>;
  createGuestUser(): Promise<User>;
  updateUserProfile(userId: string, updates: Partial<{ displayName: string; avatarUrl: string; language: string; dataPreferences: string }>): Promise<User | undefined>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  
  // User info
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Coins
  addCoinTransaction(data: InsertCoinTransaction): Promise<CoinTransaction>;
  getCoinBalance(userId: string): Promise<number>;
  getCoinHistory(userId: string, limit?: number): Promise<CoinTransaction[]>;
  
  // Subscriptions
  createOrUpdateSubscription(data: InsertSubscription): Promise<Subscription>;
  getActiveSubscription(userId: string): Promise<Subscription | undefined>;
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
  
  // Push tokens
  registerPushToken(userId: string, token: string, platform: string): Promise<PushToken>;
  getPushTokens(userId: string): Promise<PushToken[]>;
  
  // Series
  getAllSeries(): Promise<Series[]>;
  getSeriesById(id: string): Promise<Series | undefined>;
  getTrendingSeries(): Promise<Series[]>;
  getNewSeries(): Promise<Series[]>;
  getFeaturedSeries(): Promise<Series[]>;
  getSeriesByGenre(genre: string): Promise<Series[]>;
  searchSeries(query: string): Promise<Series[]>;
  
  // Episodes
  getEpisodesBySeriesId(seriesId: string): Promise<Episode[]>;
  getEpisodeById(id: string): Promise<Episode | undefined>;
  
  // Genres
  getAllGenres(): Promise<Genre[]>;
  
  // Watch history
  getWatchHistory(userId: string): Promise<(WatchHistory & { series: Series; episode: Episode })[]>;
  saveWatchProgress(data: InsertWatchHistory): Promise<WatchHistory>;
  
  // Favorites
  getFavorites(userId: string): Promise<(Favorite & { series: Series })[]>;
  toggleFavorite(userId: string, seriesId: string): Promise<boolean>;
  isFavorite(userId: string, seriesId: string): Promise<boolean>;
  
  // Unlocked episodes
  getUnlockedEpisodes(userId: string): Promise<UnlockedEpisode[]>;
  unlockEpisode(userId: string, episodeId: string, method: string): Promise<UnlockedEpisode>;
  isEpisodeUnlocked(userId: string, episodeId: string): Promise<boolean>;
  
  // View count
  incrementViewCount(seriesId: string): Promise<void>;
  
  // Contact messages
  saveContactMessage(userId: string, name: string, email: string, subject: string, message: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Helper function to parse genres JSON string to array
  private parseGenres(genresString: string | null): string[] {
    if (!genresString) return [];
    try {
      const parsed = JSON.parse(genresString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ============ AUTH METHODS ============
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUserWithPassword(email: string, password: string, displayName: string): Promise<User> {
    const { hashPassword } = await import("./auth");
    const passwordHash = await hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        displayName,
        authProvider: "local",
        emailVerified: false,
      })
      .returning();
    return newUser;
  }

  async createGuestUser(): Promise<User> {
    const guestName = `Guest_${Math.random().toString(36).substring(7)}`;
    const [newUser] = await db
      .insert(users)
      .values({
        displayName: guestName,
        authProvider: "guest",
        emailVerified: true,
      })
      .returning();
    return newUser;
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<{ displayName: string; avatarUrl: string; language: string; dataPreferences: string }>
  ): Promise<User | undefined> {
    if (Object.keys(updates).length === 0) {
      return this.getUser(userId);
    }
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  // ============ COIN METHODS ============
  
  async addCoinTransaction(data: InsertCoinTransaction): Promise<CoinTransaction> {
    const [transaction] = await db.insert(coinTransactions).values(data).returning();
    // Update user coin balance
    await db
      .update(users)
      .set({ coinBalance: data.balanceAfter })
      .where(eq(users.id, data.userId));
    return transaction;
  }

  async getCoinBalance(userId: string): Promise<number> {
    const [user] = await db.select({ coinBalance: users.coinBalance }).from(users).where(eq(users.id, userId));
    return user?.coinBalance || 0;
  }

  async getCoinHistory(userId: string, limit = 50): Promise<CoinTransaction[]> {
    return db
      .select()
      .from(coinTransactions)
      .where(eq(coinTransactions.userId, userId))
      .orderBy(desc(coinTransactions.createdAt))
      .limit(limit);
  }

  // ============ SUBSCRIPTION METHODS ============
  
  async createOrUpdateSubscription(data: InsertSubscription): Promise<Subscription> {
    const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, data.userId)).limit(1);
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(subscriptions)
        .set(data)
        .where(eq(subscriptions.id, existing[0].id))
        .returning();
      // Update user premium status
      await db.update(users).set({ isPremium: true, premiumExpiresAt: data.expiresAt }).where(eq(users.id, data.userId));
      return updated;
    }
    
    const [created] = await db.insert(subscriptions).values(data).returning();
    // Update user premium status
    await db.update(users).set({ isPremium: true, premiumExpiresAt: data.expiresAt }).where(eq(users.id, data.userId));
    return created;
  }

  async getActiveSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
      .limit(1);
    return sub;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.purchasedAt));
  }

  async cancelSubscription(userId: string): Promise<void> {
    const sub = await this.getActiveSubscription(userId);
    if (sub) {
      await db
        .update(subscriptions)
        .set({ status: "canceled" })
        .where(eq(subscriptions.id, sub.id));
    }
  }

  // ============ PUSH TOKEN METHODS ============
  
  async registerPushToken(userId: string, token: string, platform: string): Promise<PushToken> {
    // Check if token already exists
    const existing = await db
      .select()
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
      .limit(1);

    if (existing.length > 0) {
      // Update active status
      const [updated] = await db
        .update(pushTokens)
        .set({ active: true })
        .where(eq(pushTokens.id, existing[0].id))
        .returning();
      return updated;
    }

    const [newToken] = await db.insert(pushTokens).values({ userId, token, platform }).returning();
    return newToken;
  }

  async getPushTokens(userId: string): Promise<PushToken[]> {
    return db.select().from(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.active, true)));
  }

  // Helper function to normalize series objects (parse genres field)
  // Helper function to normalize series objects (parse genres field)
  private normalizeSeries(s: Series | undefined): Series | undefined {
    if (!s) return undefined;
    return s;  // Keep genres as JSON string
  }

  // Helper function to normalize array of series
  private normalizeSeriesArray(items: Series[]): Series[] {
    return items;  // Keep genres as JSON string
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllSeries(): Promise<Series[]> {
    const items = await db.select().from(series).orderBy(desc(series.createdAt));
    return this.normalizeSeriesArray(items);
  }

  async getSeriesById(id: string): Promise<Series | undefined> {
    const [result] = await db.select().from(series).where(eq(series.id, id));
    return this.normalizeSeries(result);
  }

  async getTrendingSeries(): Promise<Series[]> {
    const items = await db
      .select()
      .from(series)
      .where(eq(series.isTrending, true))
      .orderBy(desc(series.viewCount));
    return this.normalizeSeriesArray(items);
  }

  async getNewSeries(): Promise<Series[]> {
    const items = await db
      .select()
      .from(series)
      .where(eq(series.isNew, true))
      .orderBy(desc(series.createdAt));
    return this.normalizeSeriesArray(items);
  }

  async getFeaturedSeries(): Promise<Series[]> {
    const items = await db
      .select()
      .from(series)
      .where(eq(series.isFeatured, true))
      .orderBy(desc(series.viewCount))
      .limit(5);
    return this.normalizeSeriesArray(items);
  }

  async getSeriesByGenre(genre: string): Promise<Series[]> {
    // Get all series and filter in JavaScript (SQLite doesn't support JSONB operations)
    const allSeries = await db
      .select()
      .from(series)
      .orderBy(desc(series.viewCount));
    
    const filtered = allSeries.filter((s: Series) => {
      const genreList = this.parseGenres(s.genres as any);
      return genreList.includes(genre);
    });
    
    return this.normalizeSeriesArray(filtered);
  }

  async searchSeries(query: string): Promise<Series[]> {
    try {
      console.log("[Storage] Searching for query:", query);
      const items = await db
        .select()
        .from(series)
        .where(
          or(
            sql`${series.title} LIKE ${`%${query}%`}`,
            sql`${series.description} LIKE ${`%${query}%`}`
          )
        )
        .orderBy(desc(series.viewCount));
      console.log("[Storage] Found", items.length, "series for query:", query);
      return this.normalizeSeriesArray(items);
    } catch (error) {
      console.error("[Storage] searchSeries error:", error);
      throw error;
    }
  }

  async getEpisodesBySeriesId(seriesId: string): Promise<Episode[]> {
    return db
      .select()
      .from(episodes)
      .where(eq(episodes.seriesId, seriesId))
      .orderBy(episodes.episodeNumber);
  }

  async getEpisodeById(id: string): Promise<Episode | undefined> {
    const [episode] = await db.select().from(episodes).where(eq(episodes.id, id));
    return episode;
  }

  async getAllGenres(): Promise<Genre[]> {
    return db.select().from(genres).orderBy(genres.name);
  }

  async getWatchHistory(userId: string): Promise<(WatchHistory & { series: Series; episode: Episode })[]> {
    const results = await db
      .select()
      .from(watchHistory)
      .innerJoin(series, eq(watchHistory.seriesId, series.id))
      .innerJoin(episodes, eq(watchHistory.episodeId, episodes.id))
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.lastWatchedAt));

    return results.map((r: any) => ({
      ...r.watch_history,
      series: this.normalizeSeries(r.series),
      episode: r.episodes,
    }));
  }

  async saveWatchProgress(data: InsertWatchHistory): Promise<WatchHistory> {
    const existing = await db
      .select()
      .from(watchHistory)
      .where(
        and(
          eq(watchHistory.userId, data.userId),
          eq(watchHistory.episodeId, data.episodeId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(watchHistory)
        .set({
          progress: data.progress,
          lastWatchedAt: new Date(),
        })
        .where(eq(watchHistory.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(watchHistory).values(data).returning();
    return created;
  }

  async getFavorites(userId: string): Promise<(Favorite & { series: Series })[]> {
    const results = await db
      .select()
      .from(favorites)
      .innerJoin(series, eq(favorites.seriesId, series.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return results.map((r: any) => ({
      ...r.favorites,
      series: this.normalizeSeries(r.series),
    }));
  }

  async toggleFavorite(userId: string, seriesId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.seriesId, seriesId)));

    if (existing.length > 0) {
      await db.delete(favorites).where(eq(favorites.id, existing[0].id));
      return false;
    }

    await db.insert(favorites).values({ userId, seriesId });
    return true;
  }

  async isFavorite(userId: string, seriesId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.seriesId, seriesId)));
    return !!result;
  }

  async getUnlockedEpisodes(userId: string): Promise<UnlockedEpisode[]> {
    return db
      .select()
      .from(unlockedEpisodes)
      .where(eq(unlockedEpisodes.userId, userId));
  }

  async unlockEpisode(userId: string, episodeId: string, method: string): Promise<UnlockedEpisode> {
    const [unlocked] = await db
      .insert(unlockedEpisodes)
      .values({ userId, episodeId, unlockMethod: method })
      .returning();
    return unlocked;
  }

  async isEpisodeUnlocked(userId: string, episodeId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(unlockedEpisodes)
      .where(
        and(
          eq(unlockedEpisodes.userId, userId),
          eq(unlockedEpisodes.episodeId, episodeId)
        )
      );
    return !!result;
  }

  async incrementViewCount(seriesId: string): Promise<void> {
    await db
      .update(series)
      .set({ viewCount: sql`${series.viewCount} + 1` })
      .where(eq(series.id, seriesId));
  }

  async saveContactMessage(
    userId: string,
    name: string,
    email: string,
    subject: string,
    message: string
  ): Promise<void> {
    await db.insert(contactMessages).values({
      userId,
      name,
      email,
      subject,
      message,
      status: "pending",
    });
  }
}

export const storage = new DatabaseStorage();

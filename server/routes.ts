import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { createToken, verifyToken, verifyPassword, extractTokenFromHeader } from "./auth";
import { receiptVerification } from "./receipt-verification";
import { COIN_ECONOMICS, canUnlockEpisode, getUnlockCost, hasExceededDailyAdLimit, getAdReward } from "./coinEconomics";

// Middleware to extract and verify JWT token
function authMiddleware(req: any, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.userId = payload.userId;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ============ AUTH ROUTES ============
  
  // Sign up
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "Missing email, password, or displayName" });
      }
      
      // Check if user already exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "User already exists" });
      }
      
      const user = await storage.createUserWithPassword(email, password, displayName);
      const { token, expiresIn } = createToken({ userId: user.id, email: user.email || undefined });
      
      console.log("[Routes] Signup successful:", user.id);
      res.status(201).json({
        token,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isPremium: user.isPremium,
          coinBalance: user.coinBalance,
        },
      });
    } catch (error) {
      console.error("[Routes] Signup error:", error);
      res.status(500).json({ error: "Failed to sign up" });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Update last login
      await storage.updateUserProfile(user.id, {});
      
      const { token, expiresIn } = createToken({ userId: user.id, email: user.email || undefined });
      
      console.log("[Routes] Login successful:", user.id);
      res.json({
        token,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isPremium: user.isPremium,
          coinBalance: user.coinBalance,
        },
      });
    } catch (error) {
      console.error("[Routes] Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  
  // Continue as guest
  app.post("/api/auth/guest", async (req, res) => {
    try {
      const user = await storage.createGuestUser();
      const { token, expiresIn } = createToken({ userId: user.id });
      
      console.log("[Routes] Guest created:", user.id);
      res.status(201).json({
        token,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isPremium: user.isPremium,
          coinBalance: user.coinBalance,
          authProvider: user.authProvider,
        },
      });
    } catch (error) {
      console.error("[Routes] Guest creation error:", error);
      res.status(500).json({ error: "Failed to create guest user" });
    }
  });
  
  // Get current user (protected)
  app.get("/api/auth/me", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        language: user.language,
        dataPreferences: user.dataPreferences,
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        coinBalance: user.coinBalance,
        authProvider: user.authProvider,
      });
    } catch (error) {
      console.error("[Routes] Get me error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Specific user routes (must come BEFORE generic :id route)
  // Update user profile (protected)
  app.patch("/api/users/me", authMiddleware, async (req: any, res) => {
    try {
      const { displayName, language } = req.body;
      const updates: any = {};
      if (displayName) updates.displayName = displayName;
      if (language) updates.language = language;
      
      const user = await storage.updateUserProfile(req.userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        language: user.language,
        dataPreferences: user.dataPreferences,
      });
    } catch (error) {
      console.error("[Routes] Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Update data preferences (protected)
  app.post("/api/users/data-preferences", authMiddleware, async (req: any, res) => {
    try {
      const { autoplayPreviews, wifiOnly, videoQuality } = req.body;
      
      if (
        autoplayPreviews === undefined ||
        wifiOnly === undefined ||
        videoQuality === undefined
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const preferences = {
        autoplayPreviews: Boolean(autoplayPreviews),
        wifiOnly: Boolean(wifiOnly),
        videoQuality: videoQuality,
      };

      const user = await storage.updateUserProfile(req.userId, {
        dataPreferences: JSON.stringify(preferences),
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("[Routes] Updated data preferences for user:", req.userId);
      res.json({
        success: true,
        preferences,
      });
    } catch (error) {
      console.error("[Routes] Update data preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Watch history routes (protected)
  app.get("/api/users/history", authMiddleware, async (req: any, res) => {
    try {
      console.log("[Routes] Getting watch history for user:", req.userId);
      const history = await storage.getWatchHistory(req.userId);
      console.log("[Routes] Got watch history:", history.length, "items");
      res.json(history);
    } catch (error) {
      console.error("[Routes] Failed to get watch history:", error);
      res.status(500).json({ error: "Failed to get watch history" });
    }
  });

  app.post("/api/users/history", authMiddleware, async (req: any, res) => {
    try {
      console.log("[Routes] Saving watch progress for user:", req.userId);
      const progress = await storage.saveWatchProgress({
        userId: req.userId,
        ...req.body,
      });
      console.log("[Routes] Saved watch progress");
      res.json(progress);
    } catch (error) {
      console.error("[Routes] Failed to save watch progress:", error);
      res.status(500).json({ error: "Failed to save watch progress" });
    }
  });

  // Generic user routes (must come AFTER specific routes like :id)
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Series routes
  app.get("/api/series", async (req, res) => {
    try {
      const allSeries = await storage.getAllSeries();
      res.json(allSeries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get series" });
    }
  });

  app.get("/api/series/trending", async (req, res) => {
    try {
      const trending = await storage.getTrendingSeries();
      res.json(trending);
    } catch (error) {
      res.status(500).json({ error: "Failed to get trending series" });
    }
  });

  app.get("/api/series/new", async (req, res) => {
    try {
      const newSeries = await storage.getNewSeries();
      res.json(newSeries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get new series" });
    }
  });

  app.get("/api/series/featured", async (req, res) => {
    try {
      const featured = await storage.getFeaturedSeries();
      res.json(featured);
    } catch (error) {
      res.status(500).json({ error: "Failed to get featured series" });
    }
  });

  app.get("/api/series/genre/:genre", async (req, res) => {
    try {
      const seriesList = await storage.getSeriesByGenre(req.params.genre);
      res.json(seriesList);
    } catch (error) {
      res.status(500).json({ error: "Failed to get series by genre" });
    }
  });

  app.get("/api/series/:id", async (req, res) => {
    try {
      const seriesItem = await storage.getSeriesById(req.params.id);
      if (!seriesItem) {
        return res.status(404).json({ error: "Series not found" });
      }
      res.json(seriesItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to get series" });
    }
  });

  app.post("/api/series/:id/view", async (req, res) => {
    try {
      await storage.incrementViewCount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to increment view count" });
    }
  });

  // Episodes routes
  app.get("/api/series/:seriesId/episodes", async (req, res) => {
    try {
      const eps = await storage.getEpisodesBySeriesId(req.params.seriesId);
      res.json(eps);
    } catch (error) {
      res.status(500).json({ error: "Failed to get episodes" });
    }
  });

  app.get("/api/episodes/:id", async (req, res) => {
    try {
      const episode = await storage.getEpisodeById(req.params.id);
      if (!episode) {
        return res.status(404).json({ error: "Episode not found" });
      }
      res.json(episode);
    } catch (error) {
      res.status(500).json({ error: "Failed to get episode" });
    }
  });

  // Genres routes
  app.get("/api/genres", async (req, res) => {
    try {
      const allGenres = await storage.getAllGenres();
      res.json(allGenres);
    } catch (error) {
      res.status(500).json({ error: "Failed to get genres" });
    }
  });

  // Search routes
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      console.log("[Routes] Searching for:", query);
      const results = await storage.searchSeries(query);
      console.log("[Routes] Search returned", results.length, "results");
      res.json(results);
    } catch (error) {
      console.error("[Routes] Search error:", error);
      res.status(500).json({ error: "Failed to search" });
    }
  });

  // Favorites routes (protected)
  app.get("/api/favorites", authMiddleware, async (req: any, res) => {
    try {
      const favs = await storage.getFavorites(req.userId);
      res.json(favs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get favorites" });
    }
  });

  app.post("/api/favorites/:seriesId", authMiddleware, async (req: any, res) => {
    try {
      const isFav = await storage.toggleFavorite(req.userId, req.params.seriesId);
      res.json({ isFavorite: isFav });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  app.get("/api/favorites/:seriesId", authMiddleware, async (req: any, res) => {
    try {
      const isFav = await storage.isFavorite(req.userId, req.params.seriesId);
      res.json({ isFavorite: isFav });
    } catch (error) {
      res.status(500).json({ error: "Failed to check favorite status" });
    }
  });

  // Unlocked episodes routes (protected)
  app.get("/api/unlocked", authMiddleware, async (req: any, res) => {
    try {
      const unlocked = await storage.getUnlockedEpisodes(req.userId);
      res.json(unlocked);
    } catch (error) {
      res.status(500).json({ error: "Failed to get unlocked episodes" });
    }
  });

  app.post("/api/unlock/:episodeId", authMiddleware, async (req: any, res) => {
    try {
      const method = req.body.method || "ad";
      
      // Get user data
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // For premium users, unlock immediately
      if (user.isPremium) {
        const unlocked = await storage.unlockEpisode(
          req.userId,
          req.params.episodeId,
          "premium"
        );
        return res.json(unlocked);
      }

      // For free users, they need to use coins or watch ads
      // This endpoint now primarily exists for compatibility
      // New coin-based unlock should use POST /api/episodes/:episodeId/unlock-with-coins
      
      const balance = await storage.getCoinBalance(req.userId);
      const unlockCost = getUnlockCost(user.isPremium ?? false);

      if (balance < unlockCost) {
        return res.status(402).json({ 
          error: "Insufficient coins", 
          required: unlockCost, 
          current: balance 
        });
      }

      // Deduct coins
      await storage.addCoinTransaction({
        userId: req.userId,
        amount: -unlockCost,
        type: "episode_unlock",
        reason: "Episode unlock",
        balanceBefore: balance,
        balanceAfter: balance - unlockCost
      });

      // Unlock episode
      const unlocked = await storage.unlockEpisode(
        req.userId,
        req.params.episodeId,
        "coins"
      );

      const newBalance = await storage.getCoinBalance(req.userId);
      res.json({ ...unlocked, newBalance });
    } catch (error) {
      console.error("[Routes] Unlock error:", error);
      res.status(500).json({ error: "Failed to unlock episode" });
    }
  });

  app.get("/api/unlocked/:episodeId", authMiddleware, async (req: any, res) => {
    try {
      const isUnlocked = await storage.isEpisodeUnlocked(
        req.userId,
        req.params.episodeId
      );
      res.json({ isUnlocked });
    } catch (error) {
      res.status(500).json({ error: "Failed to check unlock status" });
    }
  });

  // Unlock episode with coins (explicit coin-based unlock)
  app.post("/api/episodes/:episodeId/unlock-with-coins", authMiddleware, async (req: any, res) => {
    try {
      const { episodeId } = req.params;

      // Get user data
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Premium users don't need coins to unlock
      if (user.isPremium) {
        const unlocked = await storage.unlockEpisode(
          req.userId,
          episodeId,
          "premium"
        );
        return res.json({ ...unlocked, message: "Premium user - unlocked free" });
      }

      // Check if already unlocked
      const isUnlocked = await storage.isEpisodeUnlocked(req.userId, episodeId);
      if (isUnlocked) {
        return res.status(400).json({ error: "Episode already unlocked" });
      }

      // Get user's coin balance
      const balance = await storage.getCoinBalance(req.userId);
      const unlockCost = COIN_ECONOMICS.COINS_PER_VIDEO;

      // Check if user has enough coins
      if (balance < unlockCost) {
        return res.status(402).json({ 
          error: "Insufficient coins", 
          required: unlockCost, 
          current: balance,
          needed: unlockCost - balance
        });
      }

      // Deduct coins
      await storage.addCoinTransaction({
        userId: req.userId,
        amount: -unlockCost,
        type: "episode_unlock",
        reason: `Unlocked episode for ${unlockCost} coins`,
        balanceBefore: balance,
        balanceAfter: balance - unlockCost,
      });

      // Unlock the episode
      const unlocked = await storage.unlockEpisode(
        req.userId,
        episodeId,
        "coins"
      );

      // Get updated balance
      const newBalance = await storage.getCoinBalance(req.userId);

      console.log(`[Routes] User ${req.userId} unlocked episode ${episodeId} for ${unlockCost} coins. New balance: ${newBalance}`);

      res.json({
        ...unlocked,
        coinsDeducted: unlockCost,
        newBalance: newBalance,
        message: `Episode unlocked! ${unlockCost} coins deducted.`
      });
    } catch (error) {
      console.error("[Routes] Unlock with coins error:", error);
      res.status(500).json({ error: "Failed to unlock episode with coins" });
    }
  });

  // ============ COIN ROUTES (protected) ============
  
  app.get("/api/coins/balance", authMiddleware, async (req: any, res) => {
    try {
      const balance = await storage.getCoinBalance(req.userId);
      res.json({ balance });
    } catch (error) {
      console.error("[Routes] Get coin balance error:", error);
      res.status(500).json({ error: "Failed to get coin balance" });
    }
  });
  
  app.post("/api/coins/earn", authMiddleware, async (req: any, res) => {
    try {
      const { amount, reason = "rewarded_ad" } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      const currentBalance = await storage.getCoinBalance(req.userId);
      const newBalance = currentBalance + amount;
      
      await storage.addCoinTransaction({
        userId: req.userId,
        amount,
        type: "earn",
        reason,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
      });
      
      res.json({ balance: newBalance, earned: amount });
    } catch (error) {
      console.error("[Routes] Earn coins error:", error);
      res.status(500).json({ error: "Failed to earn coins" });
    }
  });
  
  app.get("/api/coins/history", authMiddleware, async (req: any, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "50"), 100);
      const history = await storage.getCoinHistory(req.userId, limit);
      res.json(history);
    } catch (error) {
      console.error("[Routes] Get coin history error:", error);
      res.status(500).json({ error: "Failed to get coin history" });
    }
  });

  // Verify IAP purchase and add coins
  app.post("/api/coins/verify-purchase", authMiddleware, async (req: any, res) => {
    try {
      const { productId, receiptData, purchaseToken, platform } = req.body;
      
      if (!productId || !receiptData) {
        return res.status(400).json({ error: "Missing productId or receiptData" });
      }

      console.log("[Routes] Verifying purchase:", productId, "platform:", platform);

      // Define coin packages
      const coinPackages: { [key: string]: number } = {
        "com.premiumdramastream.coins.100": 100,
        "com.premiumdramastream.coins.500": 550, // 500 + 50 bonus
        "com.premiumdramastream.coins.1200": 1400, // 1200 + 200 bonus
        "com.premiumdramastream.coins.2500": 3000, // 2500 + 500 bonus
      };

      const coinsToAdd = coinPackages[productId];
      if (!coinsToAdd) {
        return res.status(400).json({ error: "Unknown product ID" });
      }

      // Verify receipt with appropriate platform
      let verificationResult: { valid: boolean; error?: string };
      
      if (platform === "android") {
        // Verify with Google Play
        const packageName = process.env.ANDROID_PACKAGE_NAME || "com.premiumdramastream";
        const verification = await receiptVerification.verifyGooglePlayReceipt(
          packageName,
          productId,
          purchaseToken || receiptData
        );
        verificationResult = verification;
      } else if (platform === "ios") {
        // Verify with Apple App Store
        const verification = await receiptVerification.verifyAppleReceipt(receiptData);
        verificationResult = verification;
      } else {
        // Unknown platform - reject
        return res.status(400).json({ error: "Unknown platform" });
      }

      if (!verificationResult.valid) {
        console.error("[Routes] Receipt verification failed:", verificationResult.error);
        return res.status(400).json({ 
          error: "Failed to verify receipt",
          details: verificationResult.error
        });
      }

      console.log("[Routes] Receipt verified successfully for product:", productId);

      // Store the purchase record
      const currentBalance = await storage.getCoinBalance(req.userId);
      const newBalance = currentBalance + coinsToAdd;

      // Add coin transaction
      await storage.addCoinTransaction({
        userId: req.userId,
        amount: coinsToAdd,
        type: "purchase",
        reason: `iap_purchase_${productId}_${platform}`,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
      });

      console.log("[Routes] Purchase verified and coins added:", coinsToAdd, "for user:", req.userId);

      res.json({
        success: true,
        coinsAdded: coinsToAdd,
        newBalance: newBalance,
        platform,
        productId,
      });
    } catch (error) {
      console.error("[Routes] Verify purchase error:", error);
      res.status(500).json({ error: "Failed to verify purchase" });
    }
  });

  // ============ AD WATCHING ROUTES (protected) ============

  app.post("/api/ads/watch", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Premium users don't need to watch ads
      if (user.isPremium) {
        return res.status(403).json({ error: "Premium users cannot earn coins from ads" });
      }

      // Track ads watched today in memory (session-based)
      // In production, this should be stored in database with daily reset
      const today = new Date().toISOString().split("T")[0];
      const sessionKey = `user_ads_${req.userId}_${today}`;
      
      // Get ads watched today from session-like storage
      // This is simplified - in production, use database with scheduled reset
      if (!req.session) {
        req.session = {};
      }
      let adsWatchedToday = req.session[sessionKey] || 0;
      
      // Check daily limit
      if (hasExceededDailyAdLimit(adsWatchedToday)) {
        return res.status(429).json({ 
          error: "Daily ad limit exceeded", 
          limit: COIN_ECONOMICS.MAX_ADS_PER_DAY,
          watched: adsWatchedToday 
        });
      }

      // Award coins for watching ad
      const rewardAmount = getAdReward();
      const currentBalance = await storage.getCoinBalance(req.userId);
      const newBalance = currentBalance + rewardAmount;
      const newAdsWatchedToday = adsWatchedToday + 1;

      // Record the transaction
      await storage.addCoinTransaction({
        userId: req.userId,
        amount: rewardAmount,
        type: "ad_reward",
        reason: `Watched advertisement (${newAdsWatchedToday}/${COIN_ECONOMICS.MAX_ADS_PER_DAY})`,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
      });

      // Update session counter
      req.session[sessionKey] = newAdsWatchedToday;

      console.log(`[Routes] User ${req.userId} earned ${rewardAmount} coins from ad. Ads today: ${newAdsWatchedToday}/${COIN_ECONOMICS.MAX_ADS_PER_DAY}`);

      res.json({
        success: true,
        coinsEarned: rewardAmount,
        newBalance: newBalance,
        adsWatchedToday: newAdsWatchedToday,
        maxAdsPerDay: COIN_ECONOMICS.MAX_ADS_PER_DAY,
      });
    } catch (error) {
      console.error("[Routes] Watch ad error:", error);
      res.status(500).json({ error: "Failed to process ad reward" });
    }
  });

  // ============ SUBSCRIPTION ROUTES (protected) ============
  
  app.get("/api/billing/plans", async (req, res) => {
    try {
      const plans = [
        {
          id: "weekly",
          name: "Weekly",
          price: 4.99,
          productId: "com.premiumdramastream.premium.weekly",
          period: "week",
          benefits: ["Unlimited episodes", "No ads", "Early access"],
        },
        {
          id: "monthly",
          name: "Monthly",
          price: 14.99,
          productId: "com.premiumdramastream.premium.monthly",
          period: "month",
          benefits: ["Unlimited episodes", "No ads", "Early access", "Download for offline"],
        },
        {
          id: "yearly",
          name: "Yearly",
          price: 99.99,
          productId: "com.premiumdramastream.premium.yearly",
          period: "year",
          benefits: ["Unlimited episodes", "No ads", "Early access", "Download for offline", "Exclusive content"],
        },
      ];
      
      console.log("[Routes] Returning subscription plans");
      res.json({ plans });
    } catch (error) {
      console.error("[Routes] Get plans error:", error);
      res.status(500).json({ error: "Failed to get subscription plans" });
    }
  });
  
  app.get("/api/billing/status", authMiddleware, async (req: any, res) => {
    try {
      const subscription = await storage.getActiveSubscription(req.userId);
      const user = await storage.getUser(req.userId);
      
      // Check if subscription is expired
      if (subscription && subscription.expiresAt) {
        const now = new Date();
        const expiryDate = new Date(subscription.expiresAt);
        if (now > expiryDate) {
          // Subscription expired, mark as inactive
          console.log("[Routes] Subscription expired for user:", req.userId);
          subscription.status = "expired" as any;
        }
      }
      
      console.log("[Routes] Billing status for user:", req.userId, "subscribed:", !!subscription?.expiresAt);
      res.json({
        subscribed: !!subscription?.expiresAt,
        isPremium: user?.isPremium || false,
        subscription: subscription || null,
      });
    } catch (error) {
      console.error("[Routes] Get billing status error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });
  
  app.post("/api/billing/verify", authMiddleware, async (req: any, res) => {
    try {
      const { platform, productId, purchaseToken, receiptData } = req.body;
      
      if (!platform || !productId || !purchaseToken) {
        return res.status(400).json({ error: "Missing verification params" });
      }

      console.log("[Routes] Billing verification:", { platform, productId, purchaseToken });

      // Verify receipt (using real verification for subscriptions)
      let verificationValid = false;
      if (platform === "android") {
        const verification = await receiptVerification.verifyGooglePlayReceipt(
          process.env.ANDROID_PACKAGE_NAME || "com.premiumdramastream",
          productId,
          purchaseToken
        );
        verificationValid = verification.valid;
        if (!verificationValid) {
          console.error("[Routes] Google Play subscription verification failed:", verification.error);
          return res.status(400).json({ 
            error: "Failed to verify subscription",
            details: verification.error 
          });
        }
      } else if (platform === "ios") {
        const verification = await receiptVerification.verifyAppleReceipt(receiptData || purchaseToken);
        verificationValid = verification.valid;
        if (!verificationValid) {
          console.error("[Routes] Apple subscription verification failed:", verification.error);
          return res.status(400).json({ 
            error: "Failed to verify subscription",
            details: verification.error 
          });
        }
      } else {
        return res.status(400).json({ error: "Unknown platform" });
      }

      // Calculate expiry based on plan
      const expiryDate = new Date();
      let plan = "monthly";
      if (productId.includes("weekly")) {
        expiryDate.setDate(expiryDate.getDate() + 7);
        plan = "weekly";
      } else if (productId.includes("monthly")) {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        plan = "monthly";
      } else if (productId.includes("yearly")) {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        plan = "yearly";
      }
      
      // Create/update subscription
      const subscription = await storage.createOrUpdateSubscription({
        userId: req.userId,
        plan,
        purchaseToken,
        googleProductId: productId,
        status: "active",
        expiresAt: expiryDate,
        renewsAt: expiryDate,
      });
      
      console.log("[Routes] Premium subscription activated for user:", req.userId, "plan:", plan);

      res.json({
        success: true,
        entitled: true,
        expiryDate: expiryDate.toISOString(),
        daysRemaining: 7 * (plan === "weekly" ? 1 : plan === "monthly" ? 4.3 : 365),
        subscription,
      });
    } catch (error) {
      console.error("[Routes] Billing verification error:", error);
      res.status(500).json({ error: "Failed to verify subscription" });
    }
  });

  app.post("/api/billing/cancel", authMiddleware, async (req: any, res) => {
    try {
      console.log("[Routes] Canceling subscription for user:", req.userId);
      
      const subscription = await storage.getActiveSubscription(req.userId);
      if (!subscription) {
        return res.status(404).json({ error: "No active subscription found" });
      }
      // Update subscription status to canceled
      await storage.cancelSubscription(req.userId);

      console.log("[Routes] Subscription canceled for user:", req.userId);
      res.json({ success: true, message: "Subscription canceled. Your premium benefits will end on expiry date." });
    } catch (error) {
      console.error("[Routes] Cancel subscription error:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });
  
  // ============ NOTIFICATION ROUTES (protected) ============
  
  app.post("/api/notifications/token", authMiddleware, async (req: any, res) => {
    try {
      const { pushToken, platform = "android" } = req.body;
      if (!pushToken) {
        return res.status(400).json({ error: "Missing push token" });
      }
      
      await storage.registerPushToken(req.userId, pushToken, platform);
      res.json({ success: true });
    } catch (error) {
      console.error("[Routes] Register push token error:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  // ============ CONTACT ROUTES (protected) ============
  
  app.post("/api/contact/send", authMiddleware, async (req: any, res) => {
    try {
      const { name, email, subject, message } = req.body;
      
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Store contact message in database
      await storage.saveContactMessage(req.userId, name, email, subject, message);
      
      // TODO: Send email notification to support team
      // TODO: Send confirmation email to user
      
      console.log("[Routes] Contact message received:", {
        userId: req.userId,
        email,
        subject,
      });
      
      res.json({
        success: true,
        message: "Your message has been received. We'll get back to you soon.",
      });
    } catch (error) {
      console.error("[Routes] Contact message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

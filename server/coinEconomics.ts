// Backend Coin Economics Constants and Helper Functions

export const COIN_ECONOMICS = {
  COINS_PER_VIDEO: 2,
  COINS_PER_AD: 3,
  MAX_ADS_PER_DAY: 10,
  DAILY_LOGIN_BONUS: 2,
  WATCH_STREAK_BONUS: 5,
  REFERRAL_BONUS: 25,
  SHARE_EPISODE_REWARD: 5,
} as const;

/**
 * Check if user has enough coins to unlock an episode
 * Premium users bypass this check (always have access)
 */
export function canUnlockEpisode(userCoins: number, isPremium: boolean): boolean {
  if (isPremium) return true;
  return userCoins >= COIN_ECONOMICS.COINS_PER_VIDEO;
}

/**
 * Calculate coins to deduct for episode unlock
 * Premium users deduct 0 coins
 */
export function getUnlockCost(isPremium: boolean): number {
  if (isPremium) return 0;
  return COIN_ECONOMICS.COINS_PER_VIDEO;
}

/**
 * Check if user has already watched max ads today
 */
export function hasExceededDailyAdLimit(adsWatchedToday: number): boolean {
  return adsWatchedToday >= COIN_ECONOMICS.MAX_ADS_PER_DAY;
}

/**
 * Get reward for watching an ad
 */
export function getAdReward(): number {
  return COIN_ECONOMICS.COINS_PER_AD;
}

/**
 * Calculate monthly free videos available
 * Based on max ads per day
 */
export function calculateMonthlyFreeVideos(): number {
  const dailyFreeCoins = COIN_ECONOMICS.MAX_ADS_PER_DAY * COIN_ECONOMICS.COINS_PER_AD;
  const dailyFreeVideos = Math.floor(dailyFreeCoins / COIN_ECONOMICS.COINS_PER_VIDEO);
  return dailyFreeVideos * 30; // Approximate monthly
}

export default COIN_ECONOMICS;

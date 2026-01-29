# Coin Economics Configuration

**Status**: Framework exists, economics values NOT YET DEFINED

---

## 📊 Current Coin Purchase Packages

```
100 Coins     $0.99   (Base: 100 coins)
500 Coins     $3.99   (Base: 500 + 50 bonus = 550 coins)
1200 Coins    $7.99   (Base: 1200 + 200 bonus = 1400 coins)
2500 Coins    $14.99  (Base: 2500 + 500 bonus = 3000 coins)
```

**Best Value**: 2500 coins package = $0.005 per coin

---

## ❓ Questions That Need Answers

### 1. How many videos can 100 coins watch?

**Currently NOT DEFINED**. You need to decide:
- **Option A**: 1 coin per video (100 coins = 100 videos)
- **Option B**: 5 coins per video (100 coins = 20 videos)
- **Option C**: 10 coins per video (100 coins = 10 videos)
- **Option D**: Variable by video length/quality

**Recommendation**: Start with **1-2 coins per video** to make free coins valuable but not too expensive.

---

### 2. How many coins does 1 ad give you?

**Currently NOT DEFINED**. You need to decide:
- **Option A**: 1 coin per ad (1 ad = 1 video)
- **Option B**: 2-3 coins per ad (more incentive to watch ads)
- **Option C**: 5 coins per ad (premium ad rewards)
- **Option D**: Random 1-5 coins per ad

**Recommendation**: Start with **2-5 coins per ad** to balance monetization with user incentives.

---

## 💡 Suggested Economics Model

### Model: Freemium with Ad Support

```
VIDEO COST:
- 2 coins per locked episode

COINS PER AD:
- 3 coins per rewarded ad

FREE COINS DAILY LIMIT:
- 10 ads per day = 30 coins per day
- 30 coins = 15 videos per day

PAID COIN VALUE:
- 100 coins ($0.99) = 50 videos
- 550 coins ($3.99) = 275 videos
- 1400 coins ($7.99) = 700 videos
- 3000 coins ($14.99) = 1500 videos

USER INCENTIVES:
- Daily login bonus: 2 coins
- Daily watch streak: 5 coins bonus
- Share episode: 5 coins reward
- Invite friend: 25 coins

MONETIZATION:
- Users can watch ~2-3 episodes per day free (via ads)
- Premium removes ads/coins requirement
- Heavy users buy coins quarterly
```

---

## 🎯 Recommendation: Simple Model (Easiest to Implement)

**Keep it simple initially**:

```
VIDEO UNLOCK COST: 2 coins per episode
└─ 100 coins = 50 videos
└─ $0.99 per 50 videos = $0.02 per video

AD REWARD: 3 coins per ad
└─ 3 ads = 1 video
└─ 10 ads per day = ~$0.10 per day

PREMIUM ALTERNATIVE: $14.99/month = Unlimited videos + No ads
```

---

## 📝 To Implement This

You need to:

1. **Define the exchange rate** in `shared/schema.ts` or `constants/`:
```typescript
export const COIN_ECONOMICS = {
  COINS_PER_VIDEO: 2,        // Cost to unlock a video
  COINS_PER_AD: 3,           // Reward per ad watched
  MAX_ADS_PER_DAY: 10,       // Free ad limit
  DAILY_LOGIN_BONUS: 2,
};
```

2. **Update VideoPlayerScreen** to check coins before allowing unlock:
```typescript
const handleUnlockEpisode = async () => {
  const cost = COIN_ECONOMICS.COINS_PER_VIDEO;
  if (userCoins < cost) {
    // Show "Buy coins" prompt
    return;
  }
  // Unlock and deduct coins
};
```

3. **Add ad reward logic** when user watches ad:
```typescript
const handleAdReward = async () => {
  const reward = COIN_ECONOMICS.COINS_PER_AD;
  // Add coins to user balance
  // Track daily ad count
};
```

---

## 🏆 Which Model Would You Prefer?

**Please choose one**:

1. **Very generous** (encourages free users):
   - 1 coin per video
   - 5 coins per ad
   - Relies mostly on Premium subscriptions for revenue

2. **Balanced** (mix of free & paid):
   - 2 coins per video
   - 3 coins per ad
   - Good for both ad revenue and coin purchases

3. **Premium-focused** (encourages premium):
   - 5 coins per video
   - 2 coins per ad
   - Incentivizes Premium subscription ($14.99/month)

4. **Custom** (you define the values):
   - Let me know what makes sense for your app

---

**Please let me know which option you prefer, and I'll implement the complete coin economics system!**

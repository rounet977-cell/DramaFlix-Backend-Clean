import { db } from "./db";
import { series, episodes, genres, users } from "@shared/schema";

const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const GENRE_DATA = [
  { name: "Romance", iconName: "heart", colorStart: "#FF6B9D", colorEnd: "#C44569", createdAt: new Date() },
  { name: "Drama", iconName: "film", colorStart: "#A55EEA", colorEnd: "#8854D0", createdAt: new Date() },
  { name: "Thriller", iconName: "zap", colorStart: "#4B7BEC", colorEnd: "#3867D6", createdAt: new Date() },
  { name: "Comedy", iconName: "smile", colorStart: "#FED330", colorEnd: "#F7B731", createdAt: new Date() },
  { name: "Action", iconName: "target", colorStart: "#FC5C65", colorEnd: "#EB3B5A", createdAt: new Date() },
  { name: "Mystery", iconName: "search", colorStart: "#26DE81", colorEnd: "#20BF6B", createdAt: new Date() },
  { name: "Fantasy", iconName: "star", colorStart: "#45AAF2", colorEnd: "#2D98DA", createdAt: new Date() },
  { name: "Horror", iconName: "moon", colorStart: "#2C3A47", colorEnd: "#1E272E", createdAt: new Date() },
];

const SERIES_DATA = [
  {
    title: "Forbidden Hearts",
    description: "Two rival families, one forbidden love. A tale of passion that defies all boundaries.",
    coverImageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Romance", "Drama"]),
    totalEpisodes: 45,
    freeEpisodes: 5,
    releaseYear: 2025,
    rating: 4.8,
    isTrending: true,
    isNew: true,
    isFeatured: true,
    viewCount: 125000,
    createdAt: new Date(),
  },
  {
    title: "The Dark Heir",
    description: "When a billionaire dies mysteriously, his hidden heir must navigate a web of lies and betrayal.",
    coverImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Thriller", "Mystery"]),
    totalEpisodes: 60,
    freeEpisodes: 3,
    releaseYear: 2025,
    rating: 4.9,
    isTrending: true,
    isNew: false,
    isFeatured: true,
    viewCount: 185000,
    createdAt: new Date(),
  },
  {
    title: "Campus Crush",
    description: "College life gets complicated when the nerdy girl catches the attention of the campus heartthrob.",
    coverImageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Romance", "Comedy"]),
    totalEpisodes: 50,
    freeEpisodes: 5,
    releaseYear: 2024,
    rating: 4.6,
    isTrending: false,
    isNew: true,
    isFeatured: false,
    viewCount: 89000,
    createdAt: new Date(),
  },
  {
    title: "Midnight Contract",
    description: "A fake marriage proposal leads to real feelings in this CEO romance drama.",
    coverImageUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Romance", "Drama"]),
    totalEpisodes: 55,
    freeEpisodes: 4,
    releaseYear: 2025,
    rating: 4.7,
    isTrending: true,
    isNew: false,
    isFeatured: true,
    viewCount: 156000,
    createdAt: new Date(),
  },
  {
    title: "Revenge of the Queen",
    description: "After being betrayed, she returns stronger to reclaim everything that was taken from her.",
    coverImageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Drama", "Thriller"]),
    totalEpisodes: 70,
    freeEpisodes: 3,
    releaseYear: 2024,
    rating: 4.9,
    isTrending: true,
    isNew: false,
    isFeatured: true,
    viewCount: 210000,
    createdAt: new Date(),
  },
  {
    title: "Wolf Pack",
    description: "In a world where werewolves exist, one human girl discovers she's the key to their survival.",
    coverImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Fantasy", "Romance"]),
    totalEpisodes: 65,
    freeEpisodes: 5,
    releaseYear: 2025,
    rating: 4.5,
    isTrending: false,
    isNew: true,
    isFeatured: false,
    viewCount: 67000,
    createdAt: new Date(),
  },
  {
    title: "Office Wars",
    description: "Two ambitious executives compete for the same promotion. Will rivalry turn into something more?",
    coverImageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Romance", "Comedy"]),
    totalEpisodes: 40,
    freeEpisodes: 5,
    releaseYear: 2024,
    rating: 4.4,
    isTrending: false,
    isNew: false,
    isFeatured: false,
    viewCount: 54000,
    createdAt: new Date(),
  },
  {
    title: "The Ghost Bride",
    description: "Forced to marry a dead man, she never expected to fall for his mysterious twin brother.",
    coverImageUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Horror", "Romance"]),
    totalEpisodes: 48,
    freeEpisodes: 4,
    releaseYear: 2025,
    rating: 4.6,
    isTrending: false,
    isNew: true,
    isFeatured: false,
    viewCount: 78000,
    createdAt: new Date(),
  },
  {
    title: "Mafia's Hidden Princess",
    description: "She thought she was an ordinary girl until the most powerful mafia boss claimed her as his.",
    coverImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Action", "Romance"]),
    totalEpisodes: 55,
    freeEpisodes: 3,
    releaseYear: 2025,
    rating: 4.7,
    isTrending: true,
    isNew: true,
    isFeatured: false,
    viewCount: 143000,
    createdAt: new Date(),
  },
  {
    title: "Time Loop Love",
    description: "Stuck in a time loop, he must relive the same day until he wins her heart.",
    coverImageUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&h=1200&fit=crop",
    posterImageUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&h=600&fit=crop",
    genres: JSON.stringify(["Fantasy", "Romance"]),
    totalEpisodes: 42,
    freeEpisodes: 5,
    releaseYear: 2024,
    rating: 4.5,
    isTrending: false,
    isNew: false,
    isFeatured: false,
    viewCount: 61000,
    createdAt: new Date(),
  },
];

function generateEpisodes(seriesId: string, totalEpisodes: number, freeEpisodes: number) {
  const eps: Array<{
    seriesId: string;
    episodeNumber: number;
    title: string;
    thumbnailUrl: string;
    videoUrl: string;
    duration: number;
    isLocked: boolean;
    unlockType: string;
    createdAt: Date;
  }> = [];
  for (let i = 1; i <= totalEpisodes; i++) {
    eps.push({
      seriesId,
      episodeNumber: i,
      title: `Episode ${i}`,
      thumbnailUrl: `https://picsum.photos/seed/${seriesId}-${i}/400/225`,
      videoUrl: SAMPLE_VIDEO,
      duration: 90 + Math.floor(Math.random() * 90),
      isLocked: i > freeEpisodes,
      unlockType: i <= freeEpisodes ? "free" : i <= freeEpisodes + 5 ? "ad" : "premium",
      createdAt: new Date(),
    });
  }
  return eps;
}

export async function seedDatabase() {
  console.log("Starting database seed...");

  try {
    // Create default guest user
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      await db.insert(users).values({
        displayName: "Guest",
        authProvider: "guest",
        isPremium: false,
        coinBalance: 0,
      });
      console.log("Created guest user");
    }

    // Seed genres
    const existingGenres = await db.select().from(genres).limit(1);
    if (existingGenres.length === 0) {
      await db.insert(genres).values(GENRE_DATA);
      console.log("Seeded genres");
    }

    // Seed series
    const existingSeries = await db.select().from(series).limit(1);
    if (existingSeries.length === 0) {
      for (const s of SERIES_DATA) {
        const result = await db.insert(series).values(s).returning();
        const newSeries = Array.isArray(result) ? result[0] : result;
        
        if (!newSeries) {
          console.error(`Failed to insert series: ${s.title}`);
          continue;
        }
        
        // Generate episodes for each series
        const eps = generateEpisodes(newSeries.id, s.totalEpisodes, s.freeEpisodes);
        if (eps.length > 0) {
          await db.insert(episodes).values(eps);
        }
        
        console.log(`Seeded series: ${s.title} with ${s.totalEpisodes} episodes`);
      }
    }

    console.log("Database seed completed!");
  } catch (error) {
    console.error("Error seeding database:", error);
    // Don't re-throw - let the app continue even if seeding fails
  }
}

/**
 * CLI entry point for manual seeding via `npm run seed`
 * Usage: npm run seed
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log("=== Manual Database Seed Started ===");
      await seedDatabase();
      console.log("=== Manual Database Seed Completed Successfully ===");
      process.exit(0);
    } catch (error) {
      console.error("=== Manual Database Seed Failed ===", error);
      process.exit(1);
    }
  })();
}

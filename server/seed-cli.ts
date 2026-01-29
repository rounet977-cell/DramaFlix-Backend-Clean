/**
 * Manual Database Seeding CLI
 * Usage: npm run seed
 * This is a separate entry point from the server to avoid accidental process.exit() during server startup
 */

import { seedDatabase } from "./seed";

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

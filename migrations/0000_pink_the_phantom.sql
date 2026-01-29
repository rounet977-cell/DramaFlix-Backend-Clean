CREATE TABLE `episodes` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`series_id` text NOT NULL,
	`episode_number` integer NOT NULL,
	`title` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`video_url` text NOT NULL,
	`duration` integer DEFAULT 90,
	`is_locked` integer DEFAULT true,
	`unlock_type` text DEFAULT 'free',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`series_id` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`name` text NOT NULL,
	`icon_name` text DEFAULT 'film',
	`color_start` text DEFAULT '#E50914',
	`color_end` text DEFAULT '#B20710',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `genres_name_unique` ON `genres` (`name`);--> statement-breakpoint
CREATE TABLE `series` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`cover_image_url` text NOT NULL,
	`poster_image_url` text NOT NULL,
	`hero_preview_video_url` text,
	`genres` text DEFAULT '[]',
	`total_episodes` integer DEFAULT 0,
	`free_episodes` integer DEFAULT 3,
	`release_year` integer DEFAULT 2025,
	`rating` real DEFAULT 4.5,
	`is_trending` integer DEFAULT false,
	`is_new` integer DEFAULT false,
	`is_featured` integer DEFAULT false,
	`view_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `unlocked_episodes` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`episode_id` text NOT NULL,
	`unlock_method` text DEFAULT 'free',
	`unlocked_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`email` text,
	`display_name` text DEFAULT 'Guest',
	`avatar_url` text,
	`auth_provider` text DEFAULT 'guest',
	`is_premium` integer DEFAULT false,
	`coin_balance` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE TABLE `watch_history` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`series_id` text NOT NULL,
	`episode_id` text NOT NULL,
	`progress` real DEFAULT 0,
	`last_watched_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);

/*
  Warnings:

  - You are about to drop the column `hero_background_image` on the `Settings` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT 'Electronic',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArtistGenre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    CONSTRAINT "ArtistGenre_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ArtistGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'site',
    "primary_color" TEXT DEFAULT '#006400',
    "secondary_color" TEXT DEFAULT '#00FFAA',
    "background_color" TEXT DEFAULT '#0b1e14',
    "gradient_start" TEXT DEFAULT 'rgba(0,100,0,0.25)',
    "gradient_end" TEXT DEFAULT '#0f271a',
    "button_style" TEXT DEFAULT 'rounded',
    "font_family" TEXT DEFAULT '''Montserrat'',sans-serif',
    "site_logo" TEXT,
    "hero_section_background_image" TEXT,
    "about_background_image" TEXT,
    "gallery_background_image" TEXT,
    "card_background" TEXT DEFAULT '#0d1b13',
    "global_text_color" TEXT DEFAULT '#ffffff',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Settings" ("background_color", "button_style", "card_background", "createdAt", "font_family", "global_text_color", "gradient_end", "gradient_start", "id", "primary_color", "secondary_color", "updatedAt") SELECT "background_color", "button_style", "card_background", "createdAt", "font_family", "global_text_color", "gradient_end", "gradient_start", "id", "primary_color", "secondary_color", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ArtistGenre_artistId_genreId_key" ON "ArtistGenre"("artistId", "genreId");

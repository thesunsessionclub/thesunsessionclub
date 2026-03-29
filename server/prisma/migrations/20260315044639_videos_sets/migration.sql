-- CreateTable
CREATE TABLE "VideoSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "date" DATETIME,
    "location" TEXT,
    "thumbnail" TEXT,
    "youtubeLink" TEXT,
    "soundcloudLink" TEXT,
    "genre" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

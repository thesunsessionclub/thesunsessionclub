-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MerchProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "sizes" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "new_drop" BOOLEAN NOT NULL DEFAULT false,
    "index_featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_MerchProduct" ("category", "createdAt", "deletedAt", "description", "featured", "id", "images", "new_drop", "price", "product_name", "sizes", "status", "stock", "updatedAt") SELECT "category", "createdAt", "deletedAt", "description", "featured", "id", "images", "new_drop", "price", "product_name", "sizes", "status", "stock", "updatedAt" FROM "MerchProduct";
DROP TABLE "MerchProduct";
ALTER TABLE "new_MerchProduct" RENAME TO "MerchProduct";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

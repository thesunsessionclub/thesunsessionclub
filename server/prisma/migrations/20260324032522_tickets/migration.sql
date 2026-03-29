-- AlterTable
ALTER TABLE "Event" ADD COLUMN "ticket_limit" INTEGER;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "bank_account_holder" TEXT;
ALTER TABLE "Settings" ADD COLUMN "bank_card" TEXT;
ALTER TABLE "Settings" ADD COLUMN "bank_clabe" TEXT;
ALTER TABLE "Settings" ADD COLUMN "bank_name" TEXT;

-- CreateTable
CREATE TABLE "TicketOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_proof" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketOrder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "ticket_image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TicketOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TicketItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TicketOrder_eventId_idx" ON "TicketOrder"("eventId");

-- CreateIndex
CREATE INDEX "TicketOrder_status_idx" ON "TicketOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TicketItem_ticket_code_key" ON "TicketItem"("ticket_code");

-- CreateIndex
CREATE INDEX "TicketItem_eventId_idx" ON "TicketItem"("eventId");

-- CreateIndex
CREATE INDEX "TicketItem_orderId_idx" ON "TicketItem"("orderId");

/*
  Warnings:

  - A unique constraint covering the columns `[userId,categoryId]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "budgets_categoryId_key";

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_categoryId_key" ON "budgets"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - Added the required column `userId` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "userId" TEXT;

UPDATE "Application" SET "userId" = 'f4fdbe4c-3ff9-42c6-97fd-a4a342e1fe3d' WHERE "userId" IS NULL;

ALTER TABLE "Application" ALTER COLUMN "userId" SET NOT NULL;

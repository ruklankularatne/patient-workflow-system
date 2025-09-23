/*
  Warnings:

  - You are about to drop the column `profilePicture` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `attachments` on the `medical_records` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "profilePicture";

-- AlterTable
ALTER TABLE "medical_records" DROP COLUMN "attachments",
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "followUpDate" DATE,
ADD COLUMN     "medications" TEXT,
ADD COLUMN     "treatment" TEXT;

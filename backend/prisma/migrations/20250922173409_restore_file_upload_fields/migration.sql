-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "profilePicture" TEXT;

-- AlterTable
ALTER TABLE "medical_records" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];

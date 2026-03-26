-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "mediaUrl" TEXT;

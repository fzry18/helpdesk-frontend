-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "file_data" BYTEA,
ALTER COLUMN "file_path" DROP NOT NULL;

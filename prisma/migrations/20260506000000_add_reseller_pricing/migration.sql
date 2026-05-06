-- AlterTable
ALTER TABLE "software_options" ADD COLUMN "price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "software_options_category_name_key" ON "software_options"("category", "name");

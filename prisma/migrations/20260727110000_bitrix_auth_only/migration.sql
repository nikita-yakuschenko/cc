-- AlterTable: Bitrix SSO — пароль больше не обязателен
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bitrixId" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_bitrixId_key" ON "User"("bitrixId");

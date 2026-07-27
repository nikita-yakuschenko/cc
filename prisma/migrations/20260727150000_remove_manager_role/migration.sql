-- Convert legacy managers to regular users
UPDATE "User" SET role = 'USER' WHERE role = 'MANAGER';

-- Rebuild Role enum without MANAGER
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN role TYPE "Role" USING (role::text::"Role");
ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'USER'::"Role";
DROP TYPE "Role_old";

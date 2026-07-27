import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { UsersManager } from "@/components/admin/users-manager";

export default async function UsersPage() {
  await requireRole(["ADMIN"]);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      bitrixId: true,
    },
  });

  return <UsersManager users={users} />;
}

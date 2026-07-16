import { auth } from "@/server/auth";
import type { AppRole } from "@/server/auth/config";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: AppRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

export function canManageAllLinks(role: AppRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canManageCatalogs(role: AppRole) {
  return role === "ADMIN";
}

export function canManageUsers(role: AppRole) {
  return role === "ADMIN";
}

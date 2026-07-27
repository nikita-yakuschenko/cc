import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { SESSION_COOKIE } from "@/server/auth/constants";
import { unsignPayload } from "@/server/auth/session";
import type { AppRole, SessionUser } from "@/server/auth/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = unsignPayload<{ userId: string; exp: number }>(token);
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function requireSession(): Promise<{ user: SessionUser }> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return { user };
}

export async function requireRole(roles: AppRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

/** USER и MANAGER видят только свои ссылки и статистику */
export function isOnlyOwnLinksRole(role: AppRole) {
  return role === "USER" || role === "MANAGER";
}

/** ADMIN и SUPER_ADMIN видят все ссылки и статистику */
export function canManageAllLinks(role: AppRole) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canDeleteLinks(role: AppRole) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageUsers(role: AppRole) {
  return role === "SUPER_ADMIN";
}

export function canManageSystem(role: AppRole) {
  return role === "SUPER_ADMIN";
}

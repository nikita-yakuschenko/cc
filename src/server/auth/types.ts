import type { Role } from "@prisma/client";

export type AppRole = Role;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

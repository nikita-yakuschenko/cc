"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db";
import { GUEST_USER_EMAIL } from "@/lib/constants";

const registerSchema = z.object({
  name: z.string().min(2, "Укажите имя"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Пароль не короче 8 символов"),
});

export async function registerAction(raw: unknown) {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message || "Проверьте форму",
    };
  }

  const email = parsed.data.email.toLowerCase();
  if (email === GUEST_USER_EMAIL) {
    return { ok: false as const, error: "Этот email недоступен" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false as const, error: "Пользователь с таким email уже есть" };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      role: "USER",
    },
  });

  return { ok: true as const };
}

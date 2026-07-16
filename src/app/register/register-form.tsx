"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RelayMark } from "@/components/brand/relay-mark";
import { registerAction } from "@/server/actions/register";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await registerAction({ name, email, password });
    if (!result.ok) {
      setLoading(false);
      toast.error(result.error);
      return;
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (login?.error) {
      toast.success("Аккаунт создан. Войдите в систему.");
      router.push("/login");
      return;
    }

    toast.success("Вход выполнен.");
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="relay-dark-surface relay-wave-pattern relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute top-8 left-8">
        <RelayMark variant="dual" className="h-12 w-12" />
      </div>

      <div className="relay-auth-card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-medium tracking-tight text-carbon">
          Relay
        </h1>
        <p className="mt-1 text-sm text-muted">
          Регистрация: UTM, статистика, безлимит
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Создание…" : "Зарегистрироваться"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-flow-green hover:underline"
          >
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}

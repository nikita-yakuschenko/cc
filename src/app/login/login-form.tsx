"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RelayMark } from "@/components/brand/relay-mark";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function onBitrixLogin() {
    setLoading(true);
    await signIn("bitrix", { callbackUrl });
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
          Вход через корпоративный Битрикс24
        </p>

        {error ? (
          <p className="mt-6 text-sm text-red-700">
            Не удалось войти. Проверьте доступ в Битрикс24 и права приложения.
          </p>
        ) : null}

        <Button
          type="button"
          className="mt-8 w-full"
          disabled={loading}
          onClick={onBitrixLogin}
        >
          {loading ? "Перенаправление…" : "Войти через Bitrix24"}
        </Button>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RelayMark } from "@/components/brand/relay-mark";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function onBitrixLogin() {
    setLoading(true);
    window.location.href = "/api/bitrix/login";
  }

  return (
    <main className="relay-dark-surface relay-wave-pattern relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute top-8 left-8">
        <RelayMark className="h-12 w-12" />
      </div>

      <div className="relay-auth-card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-medium tracking-tight text-carbon">
          {APP_NAME}
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

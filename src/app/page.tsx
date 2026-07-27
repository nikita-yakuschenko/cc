import Link from "next/link";
import { QuickShorten } from "@/components/home/quick-shorten";
import { RelayMark, RelayWordmark } from "@/components/brand/relay-mark";

export default function HomePage() {
  return (
    <main className="relay-canvas relative min-h-screen overflow-hidden">
      <div className="home-hero-glow pointer-events-none absolute inset-x-0 top-0 h-80" />
      <div className="pointer-events-none absolute -right-24 top-24 opacity-[0.07]">
        <RelayMark variant="mono-dark" className="h-105 w-105" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <div className="flex items-center justify-between gap-4">
          <RelayWordmark variant="mono-dark" showDomain />
          <Link
            href="/login"
            className="text-sm font-medium text-deep-current/70 transition-colors hover:text-flow-green"
          >
            Войти
          </Link>
        </div>

        <h1 className="mt-14 text-5xl font-medium tracking-tight text-carbon sm:text-6xl">
          Links, routed.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          Управляемые цифровые переходы. Вставьте ссылку — получите короткий
          адрес.
        </p>

        <div className="mt-10">
          <QuickShorten />
        </div>

        <p className="mt-12 max-w-md text-sm leading-relaxed text-muted">
          UTM, QR-код, статистика и безлимит — после входа через Bitrix24.
        </p>
      </div>
    </main>
  );
}

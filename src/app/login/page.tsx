import { Suspense } from "react";
import LoginPage from "./login-form";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-slate-500">Загрузка…</main>}>
      <LoginPage />
    </Suspense>
  );
}

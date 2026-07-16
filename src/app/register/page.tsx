import { Suspense } from "react";
import RegisterForm from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="p-8 text-center text-slate-500">Загрузка…</main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

import { requireRole } from "@/server/auth/guards";

export default async function SettingsPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Система</h2>
        <p className="mt-1 text-sm text-slate-500">Раздел в разработке</p>
      </div>
    </div>
  );
}

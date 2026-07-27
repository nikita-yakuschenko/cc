import { requireSession } from "@/server/auth/guards";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar user={session.user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

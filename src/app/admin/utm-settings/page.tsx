import { redirect } from "next/navigation";
import { requireSession, canManageCatalogs } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import {
  UtmSettingsClient,
  type UtmTab,
} from "@/components/admin/utm-settings-client";

const tabs: UtmTab[] = ["campaigns", "sources", "channels"];

function resolveTab(
  value: string | undefined,
  isAdmin: boolean,
): UtmTab {
  if (value === "sources" || value === "channels") {
    return isAdmin ? value : "campaigns";
  }
  return "campaigns";
}

export default async function UtmSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const isAdmin = canManageCatalogs(session.user.role);
  const activeTab = resolveTab(params.tab, isAdmin);

  if (params.tab && !tabs.includes(params.tab as UtmTab)) {
    redirect(`/admin/utm-settings?tab=${activeTab}`);
  }

  if (!isAdmin && params.tab && params.tab !== "campaigns") {
    redirect("/admin/utm-settings?tab=campaigns");
  }

  const [campaigns, sources, channels] = await Promise.all([
    prisma.campaign.findMany({
      where:
        session.user.role === "USER"
          ? { createdById: session.user.id }
          : undefined,
      orderBy: { createdAt: "desc" },
    }),
    isAdmin
      ? prisma.utmSource.findMany({ orderBy: { sortOrder: "asc" } })
      : Promise.resolve([]),
    isAdmin
      ? prisma.utmMedium.findMany({ orderBy: { sortOrder: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <UtmSettingsClient
      activeTab={activeTab}
      canManageCatalogs={isAdmin}
      campaigns={campaigns.map((item) => ({
        ...item,
        isActive: true,
        sortOrder: 0,
      }))}
      sources={sources}
      channels={channels}
    />
  );
}

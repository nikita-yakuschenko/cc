import { redirect } from "next/navigation";
import { requireSession, canManageUtmCatalog } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import {
  UtmSettingsClient,
  type UtmTab,
} from "@/components/admin/utm-settings-client";

const tabs: UtmTab[] = ["campaigns", "sources", "channels"];

function resolveTab(value: string | undefined): UtmTab {
  if (value === "sources" || value === "channels" || value === "campaigns") {
    return value;
  }
  return "campaigns";
}

export default async function UtmSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { user } = await requireSession();
  const params = await searchParams;
  const activeTab = resolveTab(params.tab);

  if (params.tab && !tabs.includes(params.tab as UtmTab)) {
    redirect(`/utm-settings?tab=${activeTab}`);
  }

  const [campaigns, sources, channels] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.utmSource.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.utmMedium.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <UtmSettingsClient
      activeTab={activeTab}
      canManageCatalog={canManageUtmCatalog(user.role)}
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

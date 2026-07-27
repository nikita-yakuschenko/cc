"use client";

import { useRouter } from "next/navigation";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  upsertCampaignAction,
  upsertUtmMediumAction,
  upsertUtmSourceAction,
} from "@/server/actions/links";

type CatalogItem = {
  id: string;
  name: string;
  slug?: string;
  value?: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type UtmTab = "campaigns" | "sources" | "channels";

export function UtmSettingsClient({
  activeTab,
  campaigns,
  sources,
  channels,
}: {
  activeTab: UtmTab;
  campaigns: CatalogItem[];
  sources: CatalogItem[];
  channels: CatalogItem[];
}) {
  const router = useRouter();

  function onTabChange(value: string) {
    router.push(`/utm-settings?tab=${value}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Настройки UTM</h2>
        <p className="mt-1 text-sm text-slate-500">
          Общие справочники utm_campaign, utm_source и utm_medium для всех
          пользователей
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="campaigns">Кампании</TabsTrigger>
          <TabsTrigger value="sources">Источники</TabsTrigger>
          <TabsTrigger value="channels">Каналы</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CatalogManager
            title="Кампании"
            description="Группировка UTM-кампаний для фильтров и отчётности"
            items={campaigns}
            mode="campaign"
            action={upsertCampaignAction}
            hideHeader
          />
        </TabsContent>

        <TabsContent value="sources">
          <CatalogManager
            title="Источники"
            description="utm_source: понятные названия и технические значения"
            items={sources}
            mode="source"
            action={upsertUtmSourceAction}
            hideHeader
          />
        </TabsContent>

        <TabsContent value="channels">
          <CatalogManager
            title="Каналы"
            description="utm_medium: понятные названия и технические значения"
            items={channels}
            mode="medium"
            action={upsertUtmMediumAction}
            hideHeader
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

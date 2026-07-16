import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { upsertUtmSourceAction } from "@/server/actions/links";

export default async function SourcesPage() {
  await requireRole(["ADMIN"]);
  const items = await prisma.utmSource.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <CatalogManager
      title="Справочник источников"
      description="utm_source: понятные названия и технические значения"
      items={items}
      mode="source"
      action={upsertUtmSourceAction}
    />
  );
}

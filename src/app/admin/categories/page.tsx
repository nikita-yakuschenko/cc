import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { upsertCategoryAction } from "@/server/actions/links";

export default async function CategoriesPage() {
  await requireRole(["ADMIN"]);
  const items = await prisma.linkCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <CatalogManager
      title="Категории"
      description="Управляемый справочник тематик коротких ссылок"
      items={items}
      mode="category"
      action={upsertCategoryAction}
    />
  );
}

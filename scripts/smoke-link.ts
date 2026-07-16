import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://go_avgst:go_avgst@localhost:55433/go_avgst?schema=public",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.user.findFirst();
  const cat = await prisma.linkCategory.findFirst({ where: { slug: "project" } });
  if (!user || !cat) throw new Error("seed missing");

  const existing = await prisma.shortLink.findUnique({
    where: { publicPath: "project/a8k3p" },
  });
  if (existing) {
    console.log("exists", existing.publicPath);
    return;
  }

  const link = await prisma.shortLink.create({
    data: {
      code: "a8K3p",
      codeNormalized: "a8k3p",
      publicPath: "project/a8k3p",
      categoryId: cat.id,
      originalUrl: "https://avgst.ru/projects/modul-120",
      targetUrl:
        "https://avgst.ru/projects/modul-120?utm_source=vk&utm_medium=cpc&utm_campaign=summer_houses_2026",
      utmSource: "vk",
      utmMedium: "cpc",
      utmCampaign: "summer_houses_2026",
      createdById: user.id,
    },
  });
  console.log("created", link.publicPath);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

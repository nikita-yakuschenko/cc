import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Проект дома", slug: "project", description: "Проект дома", sortOrder: 1 },
  { name: "Вакансия", slug: "vacancy", description: "Вакансия", sortOrder: 2 },
  { name: "Рекламная акция", slug: "promo", description: "Рекламная акция", sortOrder: 3 },
  { name: "Мероприятие", slug: "event", description: "Мероприятие", sortOrder: 4 },
  { name: "Документ", slug: "document", description: "Документ или презентация", sortOrder: 5 },
  { name: "Каталог", slug: "catalog", description: "Каталог", sortOrder: 6 },
  { name: "Коммерческое предложение", slug: "offer", description: "Коммерческое предложение", sortOrder: 7 },
];

const sources = [
  { name: "ВКонтакте", value: "vk", sortOrder: 1 },
  { name: "Яндекс", value: "yandex", sortOrder: 2 },
  { name: "Telegram", value: "telegram", sortOrder: 3 },
  { name: "Email", value: "email", sortOrder: 4 },
  { name: "Avito", value: "avito", sortOrder: 5 },
  { name: "2ГИС", value: "2gis", sortOrder: 6 },
  { name: "Партнёр", value: "partner", sortOrder: 7 },
  { name: "Офлайн", value: "offline", sortOrder: 8 },
];

const media = [
  { name: "Платная реклама", value: "cpc", sortOrder: 1 },
  { name: "Социальные сети", value: "social", sortOrder: 2 },
  { name: "Email", value: "email", sortOrder: 3 },
  { name: "Мессенджер", value: "messenger", sortOrder: 4 },
  { name: "Реферальный", value: "referral", sortOrder: 5 },
  { name: "Медийная реклама", value: "display", sortOrder: 6 },
  { name: "QR-код", value: "qr", sortOrder: 7 },
  { name: "Офлайн", value: "offline", sortOrder: 8 },
];

async function main() {
  // системный пользователь для анонимных сокращений с главной
  await prisma.user.upsert({
    where: { email: "guest@system.go.avgst.ru" },
    update: {
      name: "Гость",
      isActive: true,
      role: "USER",
      passwordHash: null,
    },
    create: {
      email: "guest@system.go.avgst.ru",
      name: "Гость",
      passwordHash: null,
      role: "USER",
      isActive: true,
    },
  });

  for (const item of categories) {
    await prisma.linkCategory.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: item,
    });
  }

  for (const item of sources) {
    await prisma.utmSource.upsert({
      where: { value: item.value },
      update: {
        name: item.name,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: item,
    });
  }

  for (const item of media) {
    await prisma.utmMedium.upsert({
      where: { value: item.value },
      update: {
        name: item.name,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: item,
    });
  }

  console.log("Seed completed:", {
    guest: "guest@system.go.avgst.ru",
    categories: categories.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

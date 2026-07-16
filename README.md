# Relay — короткие ссылки

Сервис управляемых цифровых переходов: короткие ссылки, UTM и аналитика.

Публичный домен: `https://go.avgst.ru`

## Стек

- Next.js 16 (App Router, standalone)
- React 19, TypeScript, Tailwind CSS 4
- PostgreSQL + Prisma
- Auth.js (credentials)
- Docker / Dokploy

## Локальный запуск

### 1. Переменные окружения

```powershell
Copy-Item .env.example .env
```

Заполните `DATABASE_URL`, `AUTH_SECRET`, `IP_HASH_SALT`.

### 2. PostgreSQL

На Windows часто занят порт `5432` локальным PostgreSQL, поэтому в
`docker-compose.local.yml` БД проброшена на **55433**.

```powershell
docker compose -f docker-compose.local.yml up -d db
```

`DATABASE_URL` в `.env.example` уже указывает на `localhost:55433`.
### 3. Миграции и seed

```powershell
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Dev-сервер

```powershell
npm run dev -- -p 3330
```

Откройте `http://localhost:3330/login`.

Учётная запись seed-админа (по умолчанию):

- email: `admin@avgst.ru`
- password: `ChangeMe123!`

### Полезные команды

```powershell
npm run test
npm run build
npm run db:seed
npx prisma migrate deploy
```

## Развёртывание в Dokploy

1. Создайте проект в Dokploy.
2. Разверните **отдельный** сервис PostgreSQL средствами Dokploy (не через compose приложения).
3. Создайте пользователя и базу данных приложения (например `go_avgst` / `go_avgst`).
4. Получите внутренний hostname PostgreSQL в сети Dokploy (имя сервиса БД).
5. Сформируйте `DATABASE_URL`:

```text
postgresql://USER:PASSWORD@POSTGRES_HOST:5432/DATABASE_NAME?schema=public
```

Не используйте `localhost`, `127.0.0.1`, `host.docker.internal` в production.

6. Создайте Compose-сервис приложения из репозитория (`docker-compose.yml` содержит только `app`).
7. Задайте Environment Variables в Dokploy:

| Переменная | Пример |
|---|---|
| `NODE_ENV` | `production` |
| `HOSTNAME` | `0.0.0.0` |
| `PORT` | `3330` |
| `DATABASE_URL` | строка подключения |
| `APP_URL` | `https://go.avgst.ru` |
| `NEXT_PUBLIC_APP_URL` | `https://go.avgst.ru` |
| `AUTH_SECRET` | длинный случайный секрет |
| `IP_HASH_SALT` | соль для хеша IP |
| `SEED_ADMIN_EMAIL` | email админа (для первичного seed) |
| `SEED_ADMIN_PASSWORD` | пароль админа |

8. Порт приложения внутри контейнера: **3330**.
9. Привяжите домен `go.avgst.ru` к Compose-сервису, destination port `3330`.
10. Включите HTTPS и редирект HTTP→HTTPS в Dokploy.
11. При старте контейнера `docker-entrypoint.sh` выполняет `npx prisma migrate deploy`, затем `node server.js`.
12. Первичное заполнение справочников — отдельно, один раз:

```powershell
docker compose exec app npx tsx prisma/seed.ts
```

или локально против production БД по явному запросу администратора.

13. Проверьте `https://go.avgst.ru/api/health` → `{ "status": "ok" }`.
14. Проверьте `/login` и `/admin`.
15. Создайте короткую ссылку и проверьте публичный редирект.
16. Убедитесь, что в таблице `ClickEvent` появилась запись.

### Обновление

1. Получите новую версию кода.
2. Соберите новый Docker-образ.
3. Миграции применятся при старте (один инстанс).
4. Проверьте `/api/health`, логин, создание ссылки, редирект, статистику.

Ограничение: при горизонтальном масштабировании не запускайте миграции одновременно из нескольких контейнеров — вынесите в migration-job.

### Откат

1. Откатите Compose-сервис на предыдущий Docker-образ.
2. Учтите, что откат кода не всегда совместим с уже применёнными миграциями БД.
3. Миграции проектируются с обратной совместимостью по возможности.

### Резервное копирование PostgreSQL

Бэкапы настраиваются для отдельного PostgreSQL-сервиса Dokploy:

- Persistent volume хранит данные БД независимо от контейнера приложения.
- Настройте периодический `pg_dump` / snapshot volume в Dokploy.
- Храните копии вне хоста приложения.
- Перед опасными миграциями делайте ручной экспорт.
- Проверяйте целостность и тестовое восстановление в отдельном окружении.

Ручной экспорт (пример):

```powershell
pg_dump -h POSTGRES_HOST -U USER -d DATABASE_NAME -Fc -f go_avgst.dump
```

Восстановление:

```powershell
pg_restore -h POSTGRES_HOST -U USER -d DATABASE_NAME --clean --if-exists go_avgst.dump
```

## Архитектура маршрутов

- `/admin/*` — панель управления (auth)
- `/{code}` — редирект без категории
- `/{category}/{code}` — редирект с категорией
- `/api/health` — health-check
- `/api/qr/[id]` — PNG QR-код
- `/api/auth/*` — Auth.js

Системные пути (`admin`, `api`, `login`, `auth`, `health`, `docs`, `qr`, `stats`, `settings`) зарезервированы.

## Роли

- **USER** — свои ссылки и статистика
- **MANAGER** — все ссылки, кампании, общая статистика
- **ADMIN** — справочники, пользователи, полный доступ

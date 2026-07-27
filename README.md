# Сокращатель ссылок — go.avgst.ru

Короткие ссылки, UTM и аналитика. Вход только через Bitrix24.

## Деплой (Dokploy)

1. PostgreSQL — отдельный сервис в Dokploy (не в compose приложения).
2. Compose-сервис из репозитория (`docker-compose.yml`, только `app`).
3. Домен `go.avgst.ru` → порт **3330**, HTTPS.
4. Переменные окружения:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | `postgresql://USER:PASS@POSTGRES_HOST:5432/go_avgst?schema=public` |
| `APP_URL` | `https://go.avgst.ru` |
| `NEXT_PUBLIC_APP_URL` | `https://go.avgst.ru` |
| `AUTH_SECRET` | случайная строка ≥16 символов |
| `IP_HASH_SALT` | случайная строка ≥8 символов |
| `BITRIX_PORTAL_URL` | `https://avgstroy.bitrix24.ru` |
| `BITRIX_CLIENT_ID` | код локального приложения |
| `BITRIX_CLIENT_SECRET` | ключ локального приложения |
| `BITRIX_ADMIN_EMAILS` | email админов через запятую |

`NODE_ENV`, `HOSTNAME`, `PORT` заданы в Dockerfile — дублировать не нужно.

5. После первого деплоя — seed справочников (один раз):

```bash
docker compose exec app npx tsx prisma/seed.ts
```

6. Проверка:
   - `GET /api/health` → `{ "status": "ok" }`
   - `/login` → Bitrix24 → `/admin`

Миграции применяются автоматически при старте контейнера (`docker-entrypoint.sh`).

## Bitrix24 — локальное приложение

**Приложения → Разработчикам → Локальное приложение** (тип: серверное)

| Поле | URL |
|---|---|
| Обработчик | `https://go.avgst.ru/api/bitrix/callback` |
| Установка | `https://go.avgst.ru/api/bitrix/install` |
| Права | `user`, `user_brief`, `user_basic` |

## Роли

- **USER** — свои ссылки
- **MANAGER** — все ссылки, кампании, статистика
- **ADMIN** — справочники, пользователи

Первый вход через Bitrix создаёт пользователя. Роль ADMIN — по `BITRIX_ADMIN_EMAILS` или вручную в `/admin/users`.

#!/bin/sh
set -e

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js standalone server on 0.0.0.0:3330..."
exec node server.js

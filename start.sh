#!/bin/sh
set -e

cd /app/backend
python3 manage.py collectstatic --noinput
python3 manage.py migrate

if [ -n "$PLATFORM_ADMIN_EMAIL" ] && [ -n "$PLATFORM_ADMIN_PASSWORD" ] && [ -n "$PLATFORM_ADMIN_NAME" ]; then
  python3 manage.py bootstrap_platform_admin || true
fi

cd /app/frontend
exec node railway-server.mjs

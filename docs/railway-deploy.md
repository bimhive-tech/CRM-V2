# Railway Deployment

This repo is set up to deploy as two Railway services:

- `backend/` for Django
- `frontend/` for Next.js

## Backend Service

Root directory:

```text
backend
```

The backend uses [`backend/nixpacks.toml`](D:/Youssef/Work/BIM%20Hive/CRM%20V2/backend/nixpacks.toml) to:

- install Python dependencies
- run `collectstatic`
- run `migrate`
- start Gunicorn

Required Railway variables:

```text
DATABASE_URL=postgresql://...
DJANGO_SECRET_KEY=your-secret
DJANGO_DEBUG=false
ALLOWED_HOSTS=your-backend.up.railway.app,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://your-frontend.up.railway.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.up.railway.app,https://your-backend.up.railway.app
TIME_ZONE=Africa/Cairo
PLATFORM_ADMIN_EMAIL=admin@bimhive.com
PLATFORM_ADMIN_PASSWORD=strong-password
PLATFORM_ADMIN_NAME=Platform Admin
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=bh-crm
R2_ENDPOINT_URL=https://633c2464b38a51b3a7f9141ddbc37c41.r2.cloudflarestorage.com
R2_API_TOKEN=...
R2_TOKEN_NAME=bh-crm-user-token
```

Recommended after first deploy:

```text
python manage.py bootstrap_platform_admin
```

You can run that once from the Railway backend shell if needed.

## Frontend Service

Root directory:

```text
frontend
```

The frontend uses [`frontend/nixpacks.toml`](D:/Youssef/Work/BIM%20Hive/CRM%20V2/frontend/nixpacks.toml) to:

- install Node dependencies
- build Next.js in standalone mode
- start the standalone server

Required Railway variables:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-backend.up.railway.app/api
NEXT_TELEMETRY_DISABLED=1
```

## Notes

- `frontend/next.config.mjs` is already set to `output: "standalone"` for faster, leaner production startup.
- Django static files are served by WhiteNoise in production.
- Railway should provide `PORT` automatically to both services.
- Keep all secrets in Railway variables only.

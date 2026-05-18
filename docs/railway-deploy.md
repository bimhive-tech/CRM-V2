# Railway Deployment

This repo is now prepared to run as **one Railway app service** plus **one Railway Postgres service**.

The single app service does all of this:

- runs Django internally on `127.0.0.1:8000`
- runs Next.js on Railway's public `PORT`
- proxies `/api/*`, `/admin/*`, and `/static/*` through the same public app domain

So users only visit one domain, and the frontend talks to the backend through that same app.

## Railway App Service

Root directory:

```text
/
```

The root [`nixpacks.toml`](/D:/Youssef/Work/BIM%20Hive/CRM%20V2/nixpacks.toml) will:

- install backend Python dependencies
- install frontend Node dependencies
- build Next.js
- collect Django static files
- run Django migrations
- start the unified Node server in [`frontend/railway-server.mjs`](/D:/Youssef/Work/BIM%20Hive/CRM%20V2/frontend/railway-server.mjs)

## Required Railway Variables

Put these on the **single app service**:

```text
DATABASE_URL=postgresql://...
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=false
ALLOWED_HOSTS=your-app-domain.up.railway.app,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://your-app-domain.up.railway.app
CSRF_TRUSTED_ORIGINS=https://your-app-domain.up.railway.app
TIME_ZONE=Africa/Cairo
PLATFORM_ADMIN_EMAIL=admin@bimhive.com
PLATFORM_ADMIN_PASSWORD=strong-password
PLATFORM_ADMIN_NAME=Platform Admin
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_TELEMETRY_DISABLED=1
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<your-access-key-id>
R2_SECRET_ACCESS_KEY=<your-secret-access-key>
R2_BUCKET_NAME=bh-crm
R2_ENDPOINT_URL=<your-r2-endpoint-url>
R2_API_TOKEN=<set-in-railway>
R2_TOKEN_NAME=<your-token-name>
```

## Railway Postgres Service

Use your existing Railway Postgres service and link its `DATABASE_URL` into the app service.

## First Deploy

The deploy build already runs:

- `python manage.py migrate`
- `python manage.py collectstatic --noinput`

After the first successful deploy, run this once in the app service shell if needed:

```text
python manage.py bootstrap_platform_admin
```

## Notes

- The frontend now defaults to `NEXT_PUBLIC_API_BASE_URL=/api`, which is correct for the one-service Railway setup.
- If you later move back to split frontend/backend services, you can set `NEXT_PUBLIC_API_BASE_URL` to a full backend URL again.
- Static Django files are served by WhiteNoise.
- Railway provides `PORT` automatically.

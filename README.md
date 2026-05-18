# CRM V2

CRM V2 is the clean rebuild of the current CRM platform.

## Stack

- Django
- Django REST Framework
- Next.js
- PostgreSQL
- Plain CSS modules or scoped CSS

## Goals

- Keep the architecture modular and maintainable.
- Preserve the core CRM workflows from the current app.
- Rebuild the UI with the cleaner Ember-style reference direction.
- Keep the app responsive across mobile, tablet, and desktop.
- Deploy on Railway using environment variables for all secrets.

## Repository Shape

- `docs/`
  - product, design, and architecture notes
- `backend/`
  - Django project and apps
- `frontend/`
  - Next.js app and UI system

## Environment

Use environment variables only.

Expected Railway variables later:

- `DATABASE_URL`
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `NEXT_PUBLIC_API_BASE_URL`
- `ALLOWED_HOSTS`

## Notes

- The database URL provided for Railway should be stored in Railway variables, not committed in code.
- The design reference source lives outside this repo and is being used only for UI direction, not copied as-is.
- Railway deployment steps for the single-service app setup live in [docs/railway-deploy.md](/D:/Youssef/Work/BIM%20Hive/CRM%20V2/docs/railway-deploy.md).

Rules followed.

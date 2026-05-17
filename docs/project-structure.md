# Project Structure

## Target Structure

```text
CRM V2/
  docs/
  backend/
    manage.py
    config/
    apps/
      accounts/
      companies/
      worksheets/
      reminders/
      analytics/
      permissions/
      shared/
  frontend/
    src/
      app/
      components/
        layout/
        navigation/
        forms/
        tables/
        modals/
        worksheet/
      features/
        auth/
        dashboard/
        companies/
        worksheets/
        reminders/
        analytics/
        user-management/
      lib/
      services/
      styles/
        tokens/
        globals/
      types/
  .env.example
  README.md
  rules.md
```

## Structure Principles

- `apps` in Django should be domain-based, not generic.
- `features` in Next.js should group UI and logic by business area.
- shared UI should live in `components`.
- styling tokens should be centralized and reused.
- API calls should be isolated in service modules.

## What We Avoid

- giant mixed files
- repeated business logic in multiple places
- styling spread randomly across features
- view files that also hold unrelated utilities

## Next Build Order

1. Scaffold backend
2. Scaffold frontend
3. Add shared theme tokens
4. Build auth shell
5. Build app shell
6. Rebuild dashboard
7. Rebuild worksheets and reminders

Rules followed.

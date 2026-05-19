# Tech Stack & Build System

## Runtime

- **Node.js 18** (LTS, Bullseye-slim Docker base)
- **CommonJS modules** (`require`/`module.exports` throughout)

## Backend

- **Express 4** — HTTP server, routing, sessions, middleware
- **MySQL 2** — Database via connection pool (`mysql2/promise`)
- **Nunjucks** — Server-side HTML templating (`.njk` files)
- **express-session** with in-memory store
- **bcryptjs** — Password hashing
- **i18n** — Internationalization (JSON locale files)
- **dotenv** — Environment variable loading
- **multer** — File uploads
- **nodemailer** — Email sending
- **PDFKit** — PDF generation
- **Playwright / Puppeteer** — Browser-based PDF rendering
- **ExcelJS** — Excel file generation
- **dayjs** — Date manipulation
- **lodash** — Utility functions
- **sharp** — Image processing

## Frontend

- **Vanilla JavaScript** (no framework) — served from `public/scripts/`
- **Nunjucks templates** — server-rendered HTML
- **esbuild** — JS bundling (used for specific build tasks)
- **Intro.js / Shepherd.js** — User onboarding tours

## Database

- **MySQL** — Single database `eform`
- Migrations are raw `.sql` files in project root (prefixed `migration_*.sql`) and `migrations/` folder
- No ORM — raw SQL queries via helper functions in `db/`

## Code Formatting

- **Prettier** with: `printWidth: 120`, `tabWidth: 2`, spaces (no tabs)

## Commands

```bash
# Start production server
npm start

# Start dev server (with --watch for auto-restart)
npm run dev

# Run tests (Node.js built-in test runner)
npm test

# Import orders from FTP
npm run import:orders
```

## Docker

- Single-container deployment via `Dockerfile`
- Includes Playwright/Chromium for PDF rendering
- Python tools for JSON↔Excel translation management

## Environment

- Config via `.env` file and `config.js`
- File storage mounted at `/mnt/eform` (photos, data, logs)
- Timezone: `Europe/Warsaw`

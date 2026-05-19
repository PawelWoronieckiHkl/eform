# Project Structure

```
eform/
├── server.js              # Express app entry point
├── config.js              # Centralized path/env configuration
├── nunjucks-setup.js      # Template engine configuration
│
├── routes/                # Express route handlers (controllers)
│   ├── index.js           # Main/public routes (login, home)
│   ├── orders.js          # Order CRUD and lifecycle
│   ├── positions.js       # Position (line item) management
│   ├── users.js           # User/employee routes
│   ├── admin.js           # Admin panel routes
│   ├── address.js         # Address management
│   └── group.js           # Group/shop user routes
│
├── db/                    # Database access layer (raw SQL queries)
│   ├── core.js            # MySQL pool, selectQuery/insertQuery/updateQuery/deleteQuery helpers
│   ├── db_helper.js       # Main DB functions (orders, positions, users)
│   ├── orders.js          # Order-specific queries
│   ├── positions.js       # Position-specific queries
│   ├── users.js           # User-specific queries
│   ├── statuses.js        # Order status queries
│   ├── owner.js           # Owner-specific queries
│   ├── group.js           # Group-specific queries
│   ├── address.js         # Address queries
│   ├── others.js          # Misc queries
│   └── admin/             # Admin-specific DB functions
│
├── middleware/            # Express middleware
│   ├── loginMixture.js    # Auth guards (requireLogin, requireOwner, etc.)
│   └── employeePermissions.js  # Permission-based access control
│
├── services/              # Business logic layer
│   ├── authService.js     # Authentication logic
│   ├── orderService.js    # Order business logic
│   ├── sendOrderService.js # Order sending/email workflow
│   ├── sessionService.js  # Session management
│   ├── owner.js           # Owner-related logic
│   ├── itemBuilder.js     # Order item structure building
│   ├── getDiscount.js     # Discount calculation
│   ├── prodStatus.js      # Production status sync
│   ├── productionDays.js  # Production day calculations
│   ├── mailBot/           # Email sending & PDF generation
│   ├── orderImport/       # FTP order import pipeline
│   ├── formEngine/        # Dynamic form rendering engine
│   └── translationDict/   # Translation dictionary service
│
├── utils/                 # Shared utility functions
│   ├── logging.js         # Centralized logging
│   ├── fileManager.js     # File system operations
│   ├── formatClient.js    # Client label formatting
│   ├── hashUser.js        # Password hashing
│   └── humanize_date.js   # Date formatting
│
├── templates/             # Nunjucks server-rendered templates
│   ├── base.njk           # Base layout
│   ├── admin/             # Admin views
│   ├── owner/             # Owner views
│   ├── user/              # User/employee views
│   └── group/             # Group/shop views
│
├── public/                # Static frontend assets
│   ├── scripts/           # Client-side JavaScript (vanilla)
│   │   ├── components/    # Reusable UI components
│   │   ├── formTools/     # Form-related utilities
│   │   ├── orderTools/    # Order-related utilities
│   │   ├── tools/         # General utilities
│   │   ├── admin/         # Admin-specific scripts
│   │   ├── owner/         # Owner-specific scripts
│   │   └── group/         # Group-specific scripts
│   ├── styles/            # CSS stylesheets
│   ├── vendor/            # Third-party libraries
│   ├── config/            # Client-side configuration
│   └── img/               # Static images
│
├── locales/               # i18n translation files (pl, en, de, fr, nl)
├── migrations/            # SQL migration files
├── scripts/               # CLI/automation scripts
├── files/                 # Document templates (RODO/privacy per brand)
├── data/                  # Local data & import staging
├── logs/                  # Application logs
└── import/                # Import-related resources
```

## Architecture Pattern

The app follows a traditional **MVC-like** layered architecture:

1. **Routes** (controllers) — handle HTTP, call services/db, render templates
2. **Services** — encapsulate business logic, orchestrate DB calls
3. **DB layer** — thin query wrappers around raw SQL (no ORM)
4. **Middleware** — cross-cutting concerns (auth, permissions, i18n)
5. **Templates** — Nunjucks views rendered server-side
6. **Public scripts** — vanilla JS for client-side interactivity

## Conventions

- Route files map 1:1 with URL prefixes (`/orders` → `routes/orders.js`)
- DB files mirror route/domain boundaries (`db/orders.js`, `db/users.js`)
- Admin has its own parallel DB layer under `db/admin/`
- Templates are organized by user role (`templates/admin/`, `templates/owner/`, etc.)
- Frontend scripts mirror the role/feature structure (`public/scripts/admin/`, etc.)
- Tests use Node.js built-in test runner and live in `__tests__/` folders within services

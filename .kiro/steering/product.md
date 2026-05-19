# Product Overview

eform is an internal order management system for manufacturing/logistics companies (brands: HKL, COZY, Luxan, Remasun, TCN). It allows clients, employees, owners, and group users to create, manage, and track production orders through their lifecycle.

## Core Capabilities

- **Order Management**: Create, edit, send, and track orders with positions/line items
- **Multi-role Access**: Clients, employees, owners, admins, and group (shop) users each have distinct views and permissions
- **PDF Generation**: Orders are rendered as PDFs for email delivery and printing
- **Production Status Tracking**: Integration with production systems, spedition/shipping numbers
- **Email Notifications**: Automated mail bot sends order confirmations and updates
- **Order Import**: FTP-based import of orders from external systems (CSV parsing)
- **Internationalization**: Full i18n support for pl, en, de, fr, nl
- **Form Engine**: Dynamic form rendering for order configuration
- **Pricing & Discounts**: Per-client discount logic, price visibility controls
- **GDPR/RODO Compliance**: Privacy policy and terms documents per brand/language

## Domain Language

- **Order (Zamówienie)**: A customer order containing one or more positions
- **Position (Pozycja)**: A line item within an order (a specific product configuration)
- **Owner (Właściciel)**: The business owner/brand administrator
- **Group**: A shop/retail group that places orders on behalf of end customers
- **Pin**: User identifier used for authentication
- **Spedition Numbers**: Shipping/tracking numbers for dispatched orders

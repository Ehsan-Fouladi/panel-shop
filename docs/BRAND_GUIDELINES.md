# BRAND_GUIDELINES.md
# Retail Management Dashboard — Brand, Architecture & Engineering Standards

## 1. Project Overview

Build a professional, modern, maintainable retail management application for a physical store.

The application manages:
- Dashboard and business overview
- Products and inventory
- Sales and purchases
- Suppliers and customers
- Operating expenses
- Financial reports and profit calculations
- Customer receivables and supplier payables
- Cash register and cash movements
- Stock movements and returns
- Customer management and SMS campaign preparation
- Reports and application settings

This is an internal business application, not a public e-commerce website and not a multi-tenant SaaS platform.

### Core Requirements

- No registration, login, or onboarding screens.
- The application opens directly to the dashboard.
- No public-facing marketing pages are required.
- SEO and GEO are not project priorities.
- The interface must feel like a professional financial and inventory management tool.
- The project must be understandable and maintainable by one developer.
- The architecture must allow future features without requiring a complete rewrite.
- The application must support Persian, RTL layout, and IRANSans.
- Both dark and light themes are required.
- The application should be suitable for web use and have a practical path toward desktop packaging.

The initial implementation can use realistic, centralized mock data and local persistence where appropriate. Do not pretend that an actual backend, SMS gateway, or external integration exists when it has not been implemented.

---

## 2. Technology Stack

Use the following technologies as the preferred stack:

### Core
- React: latest stable version compatible with the complete stack.
- TypeScript 7: use when the required release is available and compatible with the selected ecosystem.
- Vite: application development server and build tool.
- Tailwind CSS 4.
- PostCSS, configured according to Tailwind CSS 4 requirements.
- Autoprefixer only if required by the selected PostCSS configuration and target browsers.

### UI and Design
- shadcn/ui: https://ui.shadcn.com/
- Lucide React: icon library.
- Sonner: toast notifications.
- IRANSans: primary application font.
- CSS variables for design tokens and theme management.

Use shadcn/ui as the shared component foundation. Reuse and customize its components rather than creating multiple unrelated implementations of buttons, inputs, dialogs, dropdowns, tables, and other common controls.

Official references:
- shadcn/ui: https://ui.shadcn.com/
- Lucide: https://lucide.dev/
- Tailwind CSS: https://tailwindcss.com/
- React: https://react.dev/

### State Management
- Zustand for shared client-side state where global state is actually necessary.
- React local state for isolated component interactions.
- Derived values should be calculated from source data rather than stored redundantly.

### Charts
- Recharts for financial charts, sales trends, expense breakdowns, and other dashboard visualizations.

Charts must support responsive sizing, meaningful tooltips, readable labels, dark and light themes, and Persian currency/date formatting where applicable.

### Date and Calendar
- Doran date picker: https://github.com/amiralibg/Doran

Inspect the current API, compatibility, license, maintenance status, and actual capabilities of Doran before integration.

Required date functionality:
- Persian/Jalali date selection and display.
- Gregorian date selection and display.
- Conversion between Jalali and Gregorian dates.
- Clear and predictable handling of date ranges.
- Consistent date formatting across forms, tables, filters, and reports.

If Doran does not cover every requirement, add a compatible date utility or adapter. Keep date conversion logic centralized instead of implementing conversion separately in multiple components.

Store and compare dates using a consistent internal representation. Convert to Jalali or Gregorian only at the input and presentation boundaries as appropriate.

### Validation
- Zod for form and data validation when appropriate.
- Prefer schema-based validation for important records such as products, sales, purchases, expenses, and payments.

### Desktop
- Keep Tauri as a possible future packaging target.
- Do not introduce Tauri dependencies or desktop-specific complexity until the web application is stable and desktop packaging is explicitly started.
- Avoid unnecessary dependencies on browser-only APIs inside domain logic.

### Dependency Rules

Before installing or updating dependencies:
1. Inspect the existing package.json and lockfile.
2. Verify compatible versions and peer dependencies.
3. Use stable releases rather than experimental versions unless explicitly approved.
4. Avoid duplicate libraries that solve the same problem.
5. Do not upgrade unrelated dependencies during a focused feature implementation.
6. Record any necessary compatibility decisions.

Do not claim that every requested version is available or mutually compatible without verification.

---

## 3. Application Architecture

Use a feature-oriented architecture that remains simple enough for a single developer.

Do not introduce an unnecessarily deep folder hierarchy, micro-frontends, dependency injection frameworks, or a generic enterprise architecture without a concrete requirement.

Recommended structure:

src/
  app/
    App.tsx
    router.tsx
    providers/
      ThemeProvider.tsx
      ToastProvider.tsx
    layouts/
      DashboardLayout.tsx

  pages/
    dashboard/
      DashboardPage.tsx
    products/
      ProductsPage.tsx
      ProductCreatePage.tsx
      ProductDetailPage.tsx
    sales/
    purchases/
    suppliers/
    expenses/
    financials/
    credit-book/
    crm/
    stock-movements/
    cash-register/
    returns/
    reports/
    settings/

  components/
    ui/
    layout/
      AppSidebar.tsx
      AppHeader.tsx
      PageHeader.tsx
      Breadcrumbs.tsx
    dashboard/
    charts/
    data-display/
    forms/
    feedback/

  store/
    app-store.ts
    product-store.ts
    sales-store.ts
    inventory-store.ts
    financial-store.ts

  hooks/
    useTheme.ts
    useDebounce.ts

  lib/
    utils.ts
    formatters.ts
    currency.ts
    date/
      index.ts
      jalali.ts
      gregorian.ts
      conversion.ts
    validation/

  data/
    mock-products.ts
    mock-sales.ts
    mock-purchases.ts
    mock-expenses.ts
    mock-customers.ts
    mock-suppliers.ts

  services/
    storage/
      storage-adapter.ts
      local-storage-adapter.ts
    products/
    sales/
    purchases/
    reports/

  types/
    product.ts
    sale.ts
    purchase.ts
    expense.ts
    customer.ts
    supplier.ts
    payment.ts
    inventory.ts
    financial.ts

  config/
    navigation.ts
    app-config.ts

  styles/
    globals.css
    tokens.css

The structure is a guideline, not a requirement to create every directory immediately.

Create files and folders when they are needed by implemented functionality. Avoid empty folders and placeholder abstractions.

### Architecture Principles

- `app/` owns application setup, routing, providers, and layouts.
- `pages/` contains route-level composition and page orchestration.
- `components/ui/` contains shared primitives and customized shadcn/ui components.
- `components/` contains reusable visual components.
- `store/` contains genuinely shared client state and state actions.
- `services/` separates persistence and business operations from UI components.
- `data/` contains realistic mock records during the initial mock-data phase.
- `types/` defines shared domain types.
- `lib/` contains small, reusable utilities and formatting functions.
- `config/` contains stable application configuration such as navigation.

Do not put business rules directly inside large page components.

Do not make components read and write localStorage independently. Use a centralized persistence adapter or service.

Do not create an additional `features/` directory that duplicates the responsibilities of `pages/` and `components/`.

---

## 4. Routing and Application Shell

Use a lightweight client-side router compatible with React and Vite, such as React Router.

The application must open directly to `/` and render the dashboard.

There must be no login, registration, password recovery, or public onboarding flows.

### Main Layout

The shared layout consists of:

- A persistent sidebar.
- A top header.
- A page title and optional breadcrumb area.
- A main content region.
- Contextual actions where needed.
- Toast notifications and accessible dialogs.

The sidebar should support a compact icon-only state on larger screens and a suitable drawer on smaller screens.

The top header may contain:
- Global search.
- Current date or date selection where useful.
- Theme switcher.
- Notifications.
- Optional store or application identity.

Do not add an unnecessary user profile, account menu, avatar, or authentication-related UI. The application is intended for direct use without user registration.

The shell must remain consistent across all routes.

---

## 5. Visual Direction

Use the supplied dashboard reference image as the primary visual direction.

The interface should feel:
- Professional.
- Precise.
- Calm.
- Modern.
- Data-oriented.
- Consistent.
- Suitable for frequent daily use.

Avoid excessive gradients, decorative illustrations, oversized empty hero sections, unnecessary animation, and excessive card nesting.

### Layout

- Persistent navigation sidebar.
- Compact header.
- Clear page headings.
- Card-based information hierarchy.
- Charts and tables with meaningful spacing.
- Consistent alignment and spacing.
- Clearly distinguishable primary actions.
- Responsive page composition.

The dashboard can use a dense, desktop-oriented layout similar to the reference image while remaining usable on tablets and mobile screens.

Do not copy irrelevant elements from the reference image, such as invoice management or financial indicators that do not match the application's actual domain. Adapt the visual language to inventory, sales, cash flow, expenses, and profit.

---

## 6. Design Tokens and Theming

All custom colors must be defined centrally using CSS custom properties.

Do not scatter hardcoded HEX colors throughout components.

Define semantic tokens for:
- Application background.
- Sidebar background.
- Card and panel backgrounds.
- Primary and secondary text.
- Muted text.
- Borders.
- Inputs and controls.
- Primary actions.
- Focus indicators.
- Success.
- Warning.
- Destructive actions.
- Information.
- Chart series.

Use HEX color values for the project's custom color palette. Expose semantic CSS variables to Tailwind CSS 4 and the shared UI components.

Use semantic tokens in component classes instead of direct color values.

Example token categories:

--background
--foreground
--card
--card-foreground
--popover
--popover-foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--border
--input
--ring
--success
--warning
--destructive
--sidebar-background
--sidebar-foreground
--chart-1
--chart-2
--chart-3
--chart-4
--chart-5

Define a complete light palette and dark palette. Both themes must maintain appropriate contrast and visual hierarchy.

Use the theme system provided by the shared UI foundation where possible. Theme preference should persist locally and apply consistently across the application.

Do not duplicate theme-specific styles unnecessarily across individual components.

---

## 7. Typography and RTL

- Primary font: IRANSans.
- Default language: Persian.
- Default document direction: RTL.
- Set the document language and direction at the application root.
- Use consistent typography scales for page titles, section titles, body text, labels, captions, and numeric indicators.

Use logical CSS properties where appropriate, such as inline-start and inline-end, instead of assuming left-to-right layout.

Verify icon direction, arrows, breadcrumbs, menus, form alignment, charts, tables, and keyboard navigation in RTL.

Numbers, product codes, phone numbers, and currency values must remain readable. Use deliberate formatting rather than relying on the browser's default bidirectional behavior.

---

## 8. Shared Component Standards

Use shadcn/ui as the consistent foundation for:

- Buttons.
- Inputs.
- Selects.
- Checkboxes and radio groups.
- Switches.
- Dialogs and confirmation dialogs.
- Dropdown menus.
- Popovers.
- Tooltips.
- Tabs.
- Cards.
- Tables.
- Badges.
- Skeletons.
- Form feedback.
- Date pickers where compatible.
- Command/search interfaces where useful.

Customize these components through shared variants, semantic tokens, and reusable wrappers.

Avoid building separate button, input, dialog, or dropdown systems for individual pages.

### Tables

Business tables must support the relevant combination of:
- Sorting.
- Search.
- Filtering.
- Pagination.
- Empty states.
- Loading states.
- Row actions.
- Responsive behavior.

Do not force every table to support every feature when it is not useful.

### Forms

- Use consistent labels, descriptions, validation messages, and spacing.
- Clearly mark required fields.
- Prevent duplicate submissions where appropriate.
- Preserve user-entered data when validation fails.
- Confirm destructive or financially significant operations.
- Use the appropriate input type for dates, amounts, quantities, and phone numbers.

### Notifications

Use Sonner for concise feedback about completed actions, failures, and important state changes.

Do not use toast notifications as a substitute for field-level validation or required confirmation dialogs.

### Icons

Use Lucide React consistently.

Use icons with predictable sizes and stroke weights. Provide accessible labels for icon-only interactive controls.

Avoid mixing multiple unrelated icon libraries.

---

## 9. Business Logic and Data Integrity

The UI must not calculate financial results from arbitrary display values or hardcoded summary cards.

Define clear domain types and business operations.

### Inventory

- Product stock must be calculated from consistent stock records or a reliable stock balance updated by validated operations.
- Stock changes must have a reason and a movement record.
- A sale decreases stock.
- A received purchase increases stock.
- A return increases stock only when the returned item is approved for restocking.
- Manual adjustments must be distinguishable from sales and purchases.

### Sales and Payments

- A sale and the payment received for that sale are separate concepts.
- A partial payment creates an outstanding receivable.
- Collecting an existing receivable is not a new sale.
- Sales must reference their items, quantities, prices, discounts, and payment records where applicable.

### Purchases and Expenses

- Inventory purchases must not automatically be treated as operating expenses.
- The cost of goods sold must be calculated using a consistent costing method.
- Operating expenses must remain separate from inventory acquisition costs.
- Supplier payments reduce outstanding payables; they do not create a second purchase record.

### Financial Calculations

Centralize calculations for:
- Gross sales.
- Discounts and net sales.
- Cost of goods sold.
- Gross profit.
- Operating expenses.
- Net profit.
- Cash received.
- Accounts receivable.
- Accounts payable.
- Inventory value.
- Estimated tax.

Document the chosen accounting assumptions and costing method. Do not present an approximate tax figure as a legally authoritative tax calculation.

### Operation Boundaries

Business operations should be implemented in service functions or domain-specific actions rather than being duplicated across components.

For example, confirming a sale should coordinate the relevant sale record, stock movement, stock balance, payment, and receivable updates.

For multi-record changes, avoid leaving the application's data in a partially updated state when an operation fails.

---

## 10. State Management and Persistence

Use Zustand only for state that genuinely needs to be shared across multiple parts of the application.

Examples include:
- Shared application preferences.
- Cross-page business records.
- Inventory and sales state.
- Theme preference, if not fully managed by the theme provider.

Use local component state for temporary UI details such as open dialogs, local filters, and form field interactions unless they must be shared.

### Data Flow

- UI components display data and dispatch clear actions.
- Services perform domain operations and persistence.
- Stores expose shared state and actions where appropriate.
- Derived financial values are calculated from source records.
- Mock data is initialized centrally.
- Formatting and validation rules are reused.

Do not duplicate the same business record in multiple unrelated stores.

### Storage

For the initial frontend-only implementation, localStorage may be used for small, non-sensitive records and preferences when appropriate.

- Use a centralized storage adapter.
- Validate persisted data before using it.
- Handle missing, invalid, or outdated stored data safely.
- Provide a predictable initialization and reset strategy.
- Avoid reading localStorage during server-only or build-time execution.
- Do not store secrets or sensitive payment credentials.

Local browser storage is not a substitute for a reliable database or multi-device synchronization.

If the application later needs multiple devices, shared staff access, reliable backups, or concurrent updates, introduce a backend and database behind the existing service boundaries.

Do not add a backend or authentication system before the product requirements justify it.

---

## 11. Clean Code Standards

Write code that a single developer can understand, debug, test, and extend.

- Enable strict TypeScript checking.
- Avoid `any`; use explicit domain types and safe narrowing.
- Avoid unnecessary type assertions and non-null assertions.
- Keep components focused on one clear responsibility.
- Extract repeated logic only when the abstraction is genuinely useful.
- Prefer descriptive names over cryptic abbreviations.
- Avoid giant components, giant hooks, and giant utility files.
- Avoid duplicating business rules.
- Avoid deeply nested conditional rendering.
- Avoid unnecessary `useEffect` calls for derived state.
- Avoid premature abstraction and overengineering.
- Keep imports organized.
- Remove dead code and unused dependencies.
- Avoid suppressing TypeScript or lint errors without a documented reason.

Use shared utilities for:
- Currency formatting.
- Number formatting.
- Date formatting and conversion.
- Validation.
- Reusable business calculations.
- Common table and form behavior.

Do not mix presentation formatting with the underlying numeric values used for calculations.

---

## 12. Performance Standards

Performance must be considered during implementation, without sacrificing maintainability.

- Keep component re-renders under control.
- Avoid expensive calculations during every render when the cost is meaningful.
- Use memoization only when it provides a measurable or clear benefit.
- Avoid unnecessarily large dependencies.
- Load only the components and data required by the current application.
- Use pagination or virtualization for genuinely large tables when appropriate.
- Avoid rendering every historical record in a large chart or table by default.
- Use responsive chart containers and avoid unnecessary chart reinitialization.
- Keep state updates focused and predictable.
- Avoid premature code splitting for a small application; introduce it when bundle size or route complexity justifies it.

The application should remain responsive with realistic business data volumes.

---

## 13. Responsive and Desktop Readiness

The interface must work at:
- 320px.
- 360px.
- 390px.
- 430px.
- 768px.
- 1024px.
- 1280px.
- 1440px.
- 1920px.

Desktop is the primary workspace, but smaller screens must remain usable.

### Desktop

- Persistent sidebar.
- Efficient use of available screen width.
- Readable tables and charts.
- Clear page hierarchy.
- Appropriate spacing for frequent operational tasks.

### Tablet and Mobile

- Collapsible navigation or drawer.
- Responsive card grids.
- Tables contained within their own scroll regions where necessary.
- Forms that remain usable without horizontal page overflow.
- Touch targets appropriate for mobile interaction.
- Charts that adapt to available width.

Do not shrink the desktop dashboard indiscriminately. Recompose the layout for smaller screens.

### Desktop Packaging Readiness

Keep the application independent of unnecessary browser-specific assumptions where practical.

Do not couple core business logic to window controls or desktop-specific APIs.

If desktop packaging is approved later, evaluate Tauri and test file access, persistence, printing, updates, and operating-system requirements separately.

A web build working successfully does not automatically mean a desktop build is ready.

---

## 14. Accessibility and Interaction Quality

- Use semantic HTML.
- Ensure keyboard access to interactive controls.
- Provide visible focus indicators.
- Associate labels with form fields.
- Provide accessible names for icon-only buttons.
- Maintain sufficient contrast in both themes.
- Do not communicate status using color alone.
- Respect reduced-motion preferences.
- Ensure dialogs and menus can be operated using the keyboard.
- Use clear, actionable error messages.

Use animations sparingly. Interactions should feel immediate and predictable rather than decorative.

---

## 15. Testing and Quality Assurance

Use a proportionate testing strategy.

### Recommended Tools

- Vitest for unit tests.
- React Testing Library for important component behavior.
- Playwright for critical end-to-end workflows when the application is ready for that level of testing.

### Priority Test Areas

- Date conversion and date-range handling.
- Currency and number formatting.
- Inventory adjustments.
- Sale confirmation and stock reduction.
- Purchase receipt and stock increase.
- Partial payments and outstanding balances.
- Customer and supplier settlements.
- Returns and restocking decisions.
- Profit calculations.
- Persistence and application initialization.
- Theme switching.
- Form validation.

Before declaring a phase complete:
1. Run TypeScript checks.
2. Run linting if configured.
3. Run relevant tests.
4. Run the production build.
5. Check browser console errors.
6. Inspect the relevant routes at desktop and mobile widths.
7. Report completed work, changed files, test results, known limitations, and unresolved issues.

Never report a test or build as successful unless it was actually run and passed.

---

## 16. Development Workflow

Implement the application incrementally.

1. Inspect the current project and its existing files.
2. Review `BRAND_GUIDELINES.md` and `UI_SPEC.md`.
3. Confirm the required routes, shared layout, design tokens, and dependencies.
4. Build the application shell and theme system.
5. Implement the dashboard using consistent mock data.
6. Implement core inventory and sales workflows.
7. Add purchasing, suppliers, and expenses.
8. Add financial calculations and reporting.
9. Add credit book, cash register, and returns.
10. Add customer management, campaign preparation, and settings.
11. Perform a cross-page consistency audit.
12. Run the final responsive, type-check, test, and build verification.

Do not implement every route superficially in a single step.

Do not redesign completed pages without an identified requirement or verified issue.

Do not replace working architecture merely to match a preferred pattern.

When a feature is not implemented, mark it clearly rather than simulating a successful external integration.

---

## 17. Boundaries Between Project Documents

### BRAND_GUIDELINES.md

Defines:
- Technology stack.
- Architecture.
- Design system.
- Typography and RTL.
- Theme rules.
- Shared component standards.
- Clean code.
- State management.
- Persistence principles.
- Performance.
- Accessibility.
- Testing.
- Development workflow.

### UI_SPEC.md

Defines:
- Required routes and pages.
- Page-specific content.
- Tables, forms, cards, and charts.
- User interactions.
- Validation behavior.
- Loading, empty, error, and success states.
- Cross-page workflows.
- Functional acceptance criteria.

If a detail belongs to one document, do not duplicate a competing version in the other. Keep both documents consistent.

---

## 18. Definition of Done

A feature is complete only when:
- Its specified UI is implemented.
- Its interactions work as described.
- Its validation is appropriate.
- Related business records remain consistent.
- It follows the shared design system.
- It works in dark and light themes.
- It works in RTL.
- It is responsive at the relevant viewport sizes.
- It does not introduce avoidable TypeScript or console errors.
- Relevant tests and production build checks pass.
- Any external integration not yet implemented is clearly identified.

## Final Principle

Prioritize correctness, maintainability, performance, operational clarity, and consistency over unnecessary complexity or visual decoration.

Build a professional application that can be understood and extended by one developer, with clear boundaries between the UI, business logic, state management, and persistence.

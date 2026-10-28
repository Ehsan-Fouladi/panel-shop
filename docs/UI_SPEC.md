# UI_SPEC.md
# Retail Management Dashboard
## UI Specification — Reference-Matched Design

## 1. Purpose

Build a polished, professional dashboard for managing a physical retail store's inventory, sales, purchasing, expenses, and financial activity.

The primary visual reference is the dashboard screenshot supplied with this project.

The goal is to reproduce its visual composition as closely as reasonably possible while adapting its contents to the actual retail-management domain.

This is not a generic admin template. It must look like a deliberately designed financial and inventory application.

### Required Project Documents

Before implementation, read:

- `BRAND_GUIDELINES.md`
- `UI_SPEC.md`

`BRAND_GUIDELINES.md` is the authority for technology, architecture, design tokens, coding standards, state management, and performance.

This document defines page structure, visual composition, business workflows, interactions, and acceptance criteria.

Do not introduce a competing architecture or design system.

### Product Constraints

- React + Vite.
- TypeScript 7, subject to actual ecosystem compatibility.
- Tailwind CSS 4.
- shadcn/ui.
- Lucide React.
- Zustand.
- Sonner.
- Recharts.
- IRANSans.
- Doran date picker, after verifying its API and capabilities.
- Persian/Jalali and Gregorian date support.
- Dark mode and light mode.
- No registration or login.
- No fake user accounts or authentication screens.
- No public e-commerce storefront.
- No SEO-focused pages.
- No real backend or external integration unless explicitly implemented.

Use centralized, realistic mock data for the initial frontend implementation.

---

## 2. Visual Reference: Mandatory Design Direction

Treat the supplied screenshot as the main visual reference, not merely a loose inspiration.

Reproduce the following characteristics:

1. Large application shell with a rounded outer frame.
2. Compact, narrow vertical sidebar on the left in the reference layout.
3. Header with page title, search field, theme control, and notification action.
4. A dominant top dashboard panel.
5. A large chart occupying most of that panel.
6. A compact calendar and selected-date summary on the right.
7. Three visually balanced cards in the lower dashboard row.
8. Dark surfaces with subtle separation through borders, elevation, and tonal differences.
9. Large financial values and smaller supporting labels.
10. Rounded controls, restrained iconography, and subtle transitions.
11. Dense but readable data presentation.
12. Carefully aligned spacing and consistent corner radii.

Do not replace the reference composition with a generic layout consisting of a welcome banner, a row of four ordinary KPI cards, and a large table.

Do not redesign the reference into a different visual style.

### Reference Fidelity

Aim for high visual similarity in:

- Overall proportions.
- Relative panel sizes.
- Sidebar width.
- Header height.
- Chart-to-calendar ratio.
- Lower card proportions.
- Border treatment.
- Corner radii.
- Typography hierarchy.
- Spacing.
- Dark surface hierarchy.
- Accent usage.

Adapt labels, metrics, and interactions to the retail-management domain rather than copying irrelevant content from the reference.

Use the screenshot as the source of visual direction. Do not claim pixel-perfect reproduction unless the rendered result has actually been compared against the reference.

---

## 3. Application Routes

Implement the following route structure:

| Route | Purpose |
|---|---|
| `/` | Dashboard overview |
| `/products` | Product inventory |
| `/products/new` | Create a product |
| `/products/:id` | Product details |
| `/products/:id/edit` | Edit a product |
| `/sales` | Sales history |
| `/sales/new` | Create a sale |
| `/sales/:id` | Sale details and receipt |
| `/purchases` | Purchase history |
| `/purchases/new` | Record a purchase |
| `/purchases/:id` | Purchase details |
| `/suppliers` | Supplier directory |
| `/suppliers/new` | Create a supplier |
| `/suppliers/:id` | Supplier details |
| `/expenses` | Operating expenses |
| `/expenses/new` | Record an expense |
| `/financials` | Financial analysis |
| `/credit-book` | Receivables and payables |
| `/crm` | Customer directory |
| `/crm/campaigns` | SMS campaign management |
| `/stock-movements` | Inventory movement history |
| `/cash-register` | Cash opening, closing, and reconciliation |
| `/returns` | Sales returns and refunds |
| `/reports` | Detailed reports and exports |
| `/settings` | Application settings |

Implement routes progressively. Do not create empty, decorative pages just to make every route appear complete.

The dashboard must be the default entry point.

---

## 4. Global Application Shell

### 4.1 Desktop Composition

Build the main application shell to resemble the reference screenshot.

The main application should occupy the available viewport with a refined, dark outer frame or background treatment.

Recommended layout:

- Application shell: full available viewport.
- Sidebar: approximately 72–84px in its compact state.
- Header: approximately 72–88px high.
- Main content: flexible width.
- Main dashboard spacing: approximately 8–16px between major panels, adjusted to viewport size.
- Panel corners: approximately 18–26px.
- Controls and smaller elements: approximately 10–18px corner radius.

These are starting targets, not arbitrary values to enforce when the screenshot or actual viewport calls for a better proportion.

At 1440px and larger, preserve the spacious, framed composition of the reference.

At smaller desktop widths, prioritize the content area and adjust the panel proportions instead of allowing the entire page to overflow horizontally.

### 4.2 Sidebar

Create a narrow vertical navigation bar inspired by the reference.

Include:

- Application mark at the top.
- Dashboard.
- Products and inventory.
- Sales.
- Purchases.
- Expenses.
- Financials.
- Credit book.
- Customers.
- Reports.
- Settings.
- Optional secondary navigation entries in a grouped menu.

Do not place every route as an equally prominent icon if doing so makes the sidebar overcrowded. Use a considered grouping strategy, with tooltips for icon-only navigation.

Requirements:

- Active route has a clearly visible background and icon treatment.
- Use Lucide React icons consistently.
- Tooltips reveal each icon's meaning.
- Provide an accessible navigation label.
- Keep navigation keyboard-accessible.
- Add a collapsible drawer for mobile.
- Do not add a fabricated logout button or account-management workflow.

The sidebar should feel close to the reference: narrow, minimal, vertically aligned, and visually separated from the content.

### 4.3 Header

The header contains:

- Current page title.
- Global search.
- Current date or selected date context where relevant.
- Theme switcher.
- Notification icon with an optional unread indicator.

Do not reproduce the reference's fake profile avatar, name, email address, or account dropdown.

The application does not have user registration or accounts. Replace that area with relevant application controls.

Global search should search meaningful local records where supported, including products, customers, sales, and suppliers.

Search results must be clickable and navigate to the appropriate record or page.

### 4.4 Shared Page Header

Secondary pages should use a consistent header containing:

- Page title.
- Optional breadcrumb.
- Short contextual description where useful.
- Primary action.
- Relevant filters or date controls.

Keep secondary pages visually consistent with the dashboard.

---

## 5. Design System

Use the tokens and theme conventions defined in `BRAND_GUIDELINES.md`.

Do not hardcode unrelated colors inside individual pages.

### 5.1 Dark Theme

The initial dashboard should closely match the supplied dark reference.

Visual characteristics:

- Near-black application background.
- Slightly lighter panels.
- Subtle gray borders.
- High-contrast primary text.
- Muted secondary text.
- Restrained blue accent for selected data and primary actions.
- Green for positive financial movement.
- Amber for warnings.
- Red for destructive actions and negative financial states.

Suggested visual starting points:

- Main background: `#191919`.
- Primary panel: `#101010`.
- Secondary surface: `#181818`.
- Border: `#303030`.
- Primary text: `#F5F5F5`.
- Secondary text: `#A3A3A3`.
- Blue accent: `#78A7F8`.
- Positive: `#43C990`.
- Warning: `#F4B74B`.
- Destructive: `#F06464`.

These values are initial visual references. Centralize the final palette in CSS variables and refine it during visual comparison.

### 5.2 Light Theme

Provide a complete light theme using the same semantic design tokens.

Use:

- Light neutral background.
- White or near-white panels.
- Subtle gray borders.
- Dark primary text.
- Muted secondary text.
- The same semantic accent colors, adjusted where necessary for contrast.

Do not simply invert the dark theme.

Every page, chart, dialog, dropdown, tooltip, date picker, and table must remain usable in both themes.

### 5.3 Typography

- Use IRANSans as the primary font.
- Establish a consistent type scale.
- Large financial metrics must be visually prominent.
- Page titles must be clear but not oversized.
- Labels and helper text must remain readable.
- Use tabular numerals for aligned financial values where appropriate.
- Support Persian and Latin content without broken spacing.

### 5.4 Component Consistency

Use shadcn/ui for shared primitives and customize them through centralized variants and tokens.

Use Lucide React for icons.

Use Sonner for toast notifications.

Use Recharts for charts.

Do not implement separate, visually inconsistent versions of buttons, inputs, dropdowns, dialogs, badges, or date pickers on different pages.

---

## 6. Dashboard Page `/`

This is the most important page in the application.

The first implementation must focus on reproducing the supplied screenshot's composition.

### 6.1 Desktop Layout

The main dashboard has two major horizontal regions:

**Upper region**

- Main revenue/sales chart on the left.
- Calendar and selected-period summary on the right.

**Lower region**

Three cards in one row:

1. Business summary and recent activity.
2. Expense distribution.
3. Recent transactions and payment status.

Use a flexible grid. At wide desktop sizes, the main chart should occupy approximately 68–72% of the upper panel, with the calendar occupying the remaining 28–32%.

The lower cards should have balanced proportions similar to the reference. The middle and right cards may be slightly wider than the left card when the content requires it.

Do not force fixed pixel widths that break at other screen sizes.

### 6.2 Upper-Left Card: Sales Overview

Replace the reference's generic Revenue chart with a retail-focused **Sales Overview** panel.

The panel contains:

- Heading: Sales Overview.
- Period selector: Weekly, Monthly, Yearly, Custom Range.
- Filter button.
- Prominent total sales amount.
- Percentage change versus the previous equivalent period.
- Chart.
- Axis labels and values.
- Tooltips.
- Selected data-point emphasis.

Use the same visual hierarchy as the reference.

#### Chart Behavior

- Weekly: daily sales values.
- Monthly: daily sales values or weekly aggregates, depending on the selected date range.
- Yearly: monthly sales values.
- Custom Range: values for the selected date range, with an appropriate aggregation interval.

The selected period must change the displayed data.

The chart should use Recharts with responsive sizing.

Use vertical bars for the primary dashboard chart to resemble the reference.

Inactive bars should use subtle neutral tones with a restrained texture or tonal variation where feasible. The selected bar may use the primary blue accent.

Show the selected bar's value and percentage change in a readable tooltip or floating annotation.

Do not use decorative values that contradict the displayed total.

#### Financial Semantics

The panel represents recorded sales, not cash balance or net profit.

The comparison must use the previous equivalent period.

For example, a monthly comparison compares the selected month with the previous month, while a yearly comparison compares the selected year with the previous year.

If there is no valid comparison period, show an appropriate empty or unavailable state instead of a fabricated percentage.

### 6.3 Upper-Right Card: Calendar

Reproduce the reference's compact calendar card.

Include:

- Previous and next period controls.
- Current month and year.
- Weekday labels.
- Calendar grid.
- Highlighted selected date.
- Subtle distinction for dates outside the current month.
- A compact financial summary at the bottom.

Use the Doran date picker after verifying its actual API.

Support both Jalali and Gregorian calendar modes. The initial Persian-language experience should use Jalali dates by default, while the user can switch calendar modes where date selection is relevant.

The selected date must remain consistent across date controls and data filters.

#### Calendar Summary

Display a contextual summary for the selected date, such as:

- Total sales.
- Number of sales.
- Cash received.

The summary must update when the selected date changes.

Do not display a static amount unrelated to the selected date.

The calendar card should remain visually compact. Do not turn it into a large full-page calendar.

### 6.4 Lower-Left Card: Business Insights

Reproduce the reference's insight-card layout without introducing a fake AI assistant.

Card contents:

- Heading: Business Insights.
- Optional expand action.
- A concise summary generated from available local data.
- Two compact statistic tiles.
- Recent activity or an insight input only if a real local behavior is implemented.

Suggested insight examples:

- Products below their minimum stock level.
- Sales change versus the previous period.
- Number of transactions today.
- Highest-selling product.
- Unusual expense increase, when the data supports the comparison.

The card must not claim to use AI unless an actual AI integration exists.

Do not create an artificial chat interface with a nonfunctional “Ask anything” field.

Use rule-based insights derived from the application's records. If there is insufficient data, show a useful empty state.

#### Compact Statistic Tiles

Examples:

- Low-stock products.
- Sales transactions today.
- Pending customer payments.
- Items requiring review.

Clicking a statistic should navigate to the relevant page with a suitable filter when possible.

### 6.5 Lower-Middle Card: Expense Distribution

Reproduce the reference's donut-chart card.

Include:

- Heading: Expense Distribution.
- Period selector, such as Last 30 Days.
- Donut chart.
- Total expense amount in the center.
- Category legend.
- Selected-category tooltip.
- A short data-derived observation below the chart.

Suggested categories:

- Rent.
- Utilities.
- Salaries.
- Transportation.
- Maintenance.
- Marketing.
- Other operating expenses.

The chart must derive its data from expense records.

Exclude inventory acquisition costs from the operating-expense breakdown unless a separate, clearly labeled inventory-purchase chart is being displayed.

If no expenses exist, show an empty state rather than an arbitrary chart.

Category selection should highlight the selected segment and display its amount and percentage.

### 6.6 Lower-Right Card: Recent Transactions

Replace the reference's Invoices card with **Recent Transactions**.

Display a compact list or table of recent business transactions.

Possible transaction types:

- Sale.
- Purchase.
- Customer payment.
- Supplier payment.
- Operating expense.
- Refund.

Each row should show the relevant subset of:

- Date.
- Transaction type or reference.
- Customer or supplier when applicable.
- Amount.
- Payment or transaction status.

Use subtle status badges for:

- Completed.
- Pending.
- Partially paid.
- Overdue.
- Cancelled, when relevant.

Avoid showing unrelated payment-score metrics.

Provide a “View all” action leading to the relevant transaction page or a filtered transaction list.

Do not invent customer names or account information disconnected from the mock dataset.

---

## 7. Dashboard Interactions

The dashboard must be functional, not a static screenshot.

### Required Interactions

- Change chart period.
- Change custom date range.
- Navigate calendar months.
- Select a calendar date.
- Switch theme.
- Open sidebar navigation.
- Search supported records.
- Open recent transaction details.
- Open filtered lists from summary tiles.
- Open notifications and mark a notification as read when supported.
- Show appropriate loading, empty, error, and success states.

Controls must produce visible, meaningful outcomes.

Do not create buttons that look interactive but do nothing.

If a feature is not implemented, do not present a misleading control for it.

---

## 8. Products and Inventory `/products`

### Product List

Display:

- Product name.
- SKU or internal code.
- Category.
- Purchase cost.
- Selling price.
- Current stock.
- Minimum stock.
- Stock status.
- Actions.

Provide search, filters, sorting, pagination, and an empty state.

### Create and Edit Product

Required fields:

- Product name.
- SKU, if used.
- Category.
- Purchase cost.
- Selling price.
- Initial stock.
- Minimum stock threshold.
- Optional description.

Validate required fields and numeric values.

### Quick Stock Operations

Provide explicit stock-increase and stock-decrease actions.

A stock increase records the quantity and reason.

A stock decrease must require a reason.

If the decrease represents a sale, use the sales workflow or a clearly defined quick-sale operation that creates all required sale and payment records.

A non-sale adjustment must not create revenue.

Prevent accidental negative inventory unless a deliberate, documented policy allows it.

### Product Details

Display:

- Product information.
- Current stock.
- Price and cost.
- Stock status.
- Stock movement history.
- Related sales and purchases.

---

## 9. Sales `/sales`

### Sales List

Display:

- Sale reference.
- Date.
- Customer or walk-in customer.
- Item count.
- Total amount.
- Amount paid.
- Outstanding amount.
- Status.

### New Sale

Support:

- Product search and selection.
- Multiple sale items.
- Quantity.
- Unit price.
- Discount.
- Customer selection or walk-in sale.
- Payment method.
- Full or partial payment.
- Optional due date for credit sales.

### Sale Confirmation

A successful sale must consistently:

1. Validate available stock.
2. Create a sale record.
3. Create sale items.
4. Reduce inventory.
5. Record stock movements.
6. Record the payment received.
7. Create or update the customer receivable when applicable.
8. Update dashboard-derived metrics.

Provide a receipt preview and a sale detail page.

Do not create separate inconsistent versions of a sale across different screens.

---

## 10. Purchases `/purchases`

Support purchase records containing:

- Supplier.
- Purchase date.
- Multiple items.
- Quantity.
- Unit purchase cost.
- Additional purchase costs where relevant.
- Total.
- Amount paid.
- Outstanding payable.
- Status.

A purchase must increase stock when it is received, not merely when a draft is created.

Prevent double-counting when a purchase is edited or marked as received.

Supplier balances and stock movements must remain consistent with purchase records.

---

## 11. Suppliers `/suppliers`

Display supplier directory, contact information, purchase history, outstanding payable, and payment history.

Support:

- Create and edit supplier.
- Supplier details.
- Record supplier payment.
- View related purchases.
- View payable history.

Supplier payments reduce outstanding balances and cash where appropriate. They do not create duplicate purchase expenses.

---

## 12. Expenses `/expenses`

Support operating expenses such as:

- Rent.
- Utilities.
- Salaries.
- Transportation.
- Maintenance.
- Supplies.
- Marketing.
- Other operating expenses.

Each expense includes:

- Description.
- Category.
- Amount.
- Date.
- Payment method.
- Optional notes.

Expenses must update the appropriate expense totals and cash movements.

Do not classify all inventory purchases as operating expenses.

---

## 13. Financials `/financials`

Provide dedicated financial analysis.

### Daily and Hourly View

- Sales over the last 24 hours.
- Hourly sales chart.
- Number of sales.
- Cash received.
- Outstanding customer balances created by sales.

Clearly distinguish sales revenue from payment collections.

### Monthly Profit and Loss

Display:

- Gross sales.
- Discounts and returns.
- Net sales.
- Cost of goods sold.
- Gross profit.
- Operating expenses.
- Net profit.

### Annual View

Display a 12-month chart and summary.

### Estimated Tax

Allow configuration of the assumed tax rate and calculation basis.

Clearly label the result as an estimate. Do not imply legal or accounting certification.

Use a consistent costing method for calculating the cost of goods sold.

---

## 14. Credit Book `/credit-book`

Provide separate views for:

- Customer receivables.
- Supplier payables.
- All credit transactions.

Display:

- Person or supplier.
- Original transaction.
- Original amount.
- Amount settled.
- Outstanding balance.
- Due date.
- Status.
- Payment history.

Support partial payments and settlement history.

Collecting an existing customer debt is a cash inflow, not a new sale.

Paying an existing supplier debt reduces the payable and cash balance without creating another purchase.

---

## 15. CRM and SMS Campaigns `/crm`

### Customer Directory

Display:

- Name.
- Phone number.
- Purchase history.
- Total recorded purchases.
- Outstanding balance when applicable.
- Optional customer group.

### Campaign Management

Support:

- Campaign title.
- Message composition.
- Customer or group selection.
- Message preview.
- Character count.
- Estimated recipient count.
- Draft and simulated status.

No real SMS gateway is included in the initial implementation.

Clearly identify campaign sending as simulated until an actual provider is connected.

Do not display fake delivery confirmations.

---

## 16. Stock Movements `/stock-movements`

Provide an auditable inventory history.

Movement types include:

- Initial stock.
- Purchase receipt.
- Sale.
- Customer return.
- Manual increase.
- Manual decrease.
- Stock correction.

Display:

- Date.
- Product.
- Movement type.
- Quantity change.
- Previous stock.
- Resulting stock.
- Reason.
- Related transaction.
- Recorded source where available.

Historical movements should not be silently overwritten. Corrections must create appropriate new records.

---

## 17. Cash Register `/cash-register`

Display:

- Opening cash balance.
- Cash sales.
- Other cash inflows.
- Customer debt collections.
- Operating expenses paid in cash.
- Supplier payments in cash.
- Refunds.
- Expected closing balance.
- Actual closing balance.
- Difference.

Clearly distinguish revenue from cash movements.

Cash reconciliation must use the recorded transaction data and must not double-count payments.

---

## 18. Returns `/returns`

Support:

- Original sale lookup.
- Item selection.
- Return quantity.
- Refund amount.
- Return reason.
- Item condition.
- Restocking decision.

Prevent returning more units than were sold and not previously returned.

Only approved, resalable items should increase available stock.

Returns must correctly update net sales, payment/refund records, and inventory where applicable.

---

## 19. Reports `/reports`

Provide reports for:

- Sales.
- Product performance.
- Inventory balances.
- Stock movements.
- Purchases.
- Supplier balances.
- Expenses.
- Profit and loss.
- Customer receivables.
- Customer activity.
- Returns.
- Cash movements.

Support relevant date ranges, filters, sorting, and export actions.

Excel export must produce an actual file when implemented. Do not claim that a report was downloaded if no file was generated.

---

## 20. Settings `/settings`

Provide settings for:

- Store name and basic details.
- Currency and formatting.
- Default inventory thresholds.
- Tax-estimate assumptions.
- Expense categories.
- Receipt presentation.
- Calendar display preference.
- Theme preference.
- Data export and reset where implemented.

Do not introduce account registration or multi-tenant organization management.

---

## 21. Global Search and Notifications

### Global Search

Search the available local dataset across supported entity types.

Results should identify the record type and provide navigation to its detail page.

Provide a clear empty state and keyboard-accessible interactions.

### Notifications

Display relevant application events, such as:

- Low-stock products.
- Overdue receivables.
- Overdue supplier balances.
- Failed or invalid operations when relevant.

Notifications must be derived from available records.

Do not fabricate external events.

---

## 22. Responsive Design

The reference is desktop-first, but the application must remain usable at:

- 320px.
- 360px.
- 390px.
- 430px.
- 768px.
- 1024px.
- 1280px.
- 1440px.
- 1920px.

### Desktop

Preserve the reference's composition, proportions, and information density.

### Tablet

- Keep the chart and calendar side by side when there is sufficient space.
- Allow the sidebar to collapse.
- Reduce card padding and adjust chart dimensions.

### Mobile

- Use a drawer or compact navigation.
- Stack the main chart and calendar vertically.
- Stack the lower cards vertically.
- Keep controls usable and readable.
- Keep tables within their own scrollable containers when necessary.
- Avoid page-level horizontal overflow.
- Do not shrink desktop content until it becomes unreadable.

The mobile layout should preserve the visual language without forcing the desktop arrangement onto a narrow viewport.

---

## 23. Data and State Consistency

Use centralized, realistic mock records for:

- Products.
- Sales and sale items.
- Purchases and purchase items.
- Suppliers.
- Customers.
- Payments.
- Expenses.
- Returns.
- Stock movements.
- Cash movements.
- Notifications.
- Campaigns.

Dashboard metrics, chart series, tables, and financial reports must derive from the same underlying dataset.

Do not maintain separate hardcoded totals for the dashboard and financial reports.

The initial mock dataset should be large and varied enough to demonstrate useful charts, tables, filters, and status states.

Persist data locally only where appropriate, using the persistence strategy specified in `BRAND_GUIDELINES.md`.

If data is reset, dependent summaries must recalculate consistently.

---

## 24. Financial Definitions

Use consistent definitions throughout the application:

- **Gross sales:** sales before discounts and returns, according to the documented policy.
- **Net sales:** gross sales minus applicable discounts and sales returns.
- **Cost of goods sold:** the cost assigned to inventory units sold under the selected costing method.
- **Gross profit:** net sales minus cost of goods sold.
- **Operating expenses:** recorded operating costs, excluding inventory purchases treated as inventory acquisition.
- **Net profit:** gross profit minus operating expenses, adjusted for any explicitly modeled additional items.
- **Cash received:** actual recorded cash inflows from the relevant transactions.
- **Receivables:** outstanding amounts owed by customers.
- **Payables:** outstanding amounts owed to suppliers.
- **Inventory value:** stock valuation calculated using the chosen costing method.

Document the treatment of refunds, taxes, discounts, and additional purchase costs.

Do not mix revenue, cash balance, stock purchases, and profit in the same metric without explicit labeling.

---

## 25. Required UI States

All major pages and forms must handle:

- Loading.
- Empty results.
- Search with no matches.
- Validation errors.
- Operation failure.
- Successful completion.
- Confirmation before destructive actions.
- Disabled actions when requirements are not met.
- Responsive overflow and long content.

Use skeletons only where a real loading state exists. Avoid decorative loading states for instantly available local data.

Use Sonner for concise operation feedback and inline validation for form errors.

---

## 26. Implementation Plan

Implement the project in phases.

### Phase 1 — Foundation and Reference-Matched Dashboard

- Inspect the repository and both project documents.
- Configure React + Vite and the compatible dependency stack.
- Implement global design tokens.
- Load and configure IRANSans.
- Implement dark and light themes.
- Build the shared application shell.
- Build the sidebar and header.
- Implement the dashboard's upper chart/calendar composition.
- Implement the three lower dashboard cards.
- Add responsive behavior.
- Populate the dashboard from consistent mock data.
- Implement functional date and period selection.

**Visual acceptance:** compare the actual rendered dashboard with the supplied screenshot and correct meaningful differences in layout, proportions, spacing, typography, surfaces, and card placement.

Do not proceed to large amounts of secondary-page implementation before the dashboard's visual direction is approved.

### Phase 2 — Products, Sales, and Stock Movements

Implement product management, sales, and auditable stock changes together.

### Phase 3 — Purchases and Suppliers

Implement purchase receipt, stock updates, supplier balances, and supplier payments.

### Phase 4 — Expenses and Financials

Implement operating expenses, cost of goods sold, profit calculations, and financial charts.

### Phase 5 — Credit Book, Cash Register, and Returns

Implement outstanding balances, cash reconciliation, and returns.

### Phase 6 — CRM and Reports

Implement customer management, simulated SMS campaigns, report filters, and export functionality.

### Phase 7 — Settings and Final QA

Implement settings and perform a complete consistency and responsive audit.

---

## 27. Acceptance Criteria

The dashboard is accepted only when:

1. It visibly follows the supplied reference image.
2. The main chart and calendar occupy the correct relative positions.
3. The three lower cards match the reference's composition.
4. Dark and light modes work consistently.
5. Persian RTL and IRANSans render correctly.
6. Jalali and Gregorian date functionality is verified.
7. Chart period selection changes the displayed data.
8. Calendar selection updates the relevant summary.
9. Search and navigation work.
10. Cards, tables, and actions are consistent with the retail-management domain.
11. Financial values derive from coherent records.
12. The layout works at the specified viewport sizes.
13. No unnecessary registration, login, or fake profile interface exists.
14. No nonfunctional controls are presented as completed features.
15. Type checks, relevant tests, and the production build pass.
16. The implementation report identifies completed work, test results, and remaining limitations.

## Final Design Principle

Reproduce the visual language and composition of the supplied reference as closely as reasonably possible, while building a real, coherent retail-management dashboard.

Visual fidelity, consistent data, usability, maintainability, and performance are all required. A screenshot-like result with nonfunctional controls is not sufficient, and a functional application with a generic, unrelated design is not sufficient either.

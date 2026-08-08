# Orderly Hub

MASTER BUILD PROMPT — HORECA QR ORDERING + RESTAURANT/HOTEL MANAGEMENT SAAS

FOR: ANTIGRAVITY (DEVELOPMENT PARTNER)

FROM: HARSHITH (PRODUCT OWNER)

===================================================================

0. WHO YOU ARE

===================================================================

You are acting as lead product architect, senior full-stack engineer, UI/UX designer, database architect, security engineer, and QA engineer for this project. You are building a production-grade, multi-tenant SaaS platform for HORECA businesses — restaurants, cafes, hotels, resorts, bars, pubs, cloud kitchens.

The core product starts as QR-based ordering but is architected as a broader HORECA operations platform. Do not treat this as a simple QR menu project, and do not treat it as a demo. A real restaurant will depend on this during its busiest dinner service. Every order must be reliable. Every payment must be accurate. Every permission must be enforced. Every tenant must be isolated. Every important action must be auditable. Every failure must have a recovery path.

===================================================================

1. FIRST INSTRUCTION — DO NOT START CODING YET

===================================================================

Before writing or modifying any significant code, inspect the entire existing repository if one exists. Identify: current framework, existing pages/routes/components, existing database schema, existing authentication, existing API architecture, existing UI component library, existing styling system, deployment configuration, environment variables, existing integrations, and anything already implemented that can be reused or that conflicts with this specification.

Do not blindly replace the database, authentication, routing, UI framework, payment provider, or rewrite the application because you prefer a different technology. The goal is to build the product, not rewrite the project. If a critical architectural decision is genuinely missing, say so explicitly before implementing your own guess.

Before touching code, produce and share with me:

A. CURRENT SYSTEM AUDIT — existing stack, pages, database, auth, components, APIs, integrations, known problems, reusable pieces.

B. REQUIREMENTS MATRIX — a table of Feature | Role | Permission | Database | API | UI | Status | Phase | Acceptance Criteria | Tests | Evidence.

C. GAP ANALYSIS — for every item in this spec, classify as COMPLETE / PARTIALLY COMPLETE / MISSING / NEEDS REFACTOR / FUTURE PHASE.

D. IMPLEMENTATION PLAN — the exact sequence of work you intend to follow.

E. DATABASE PLAN — proposed schema before you touch it.

F. PERMISSION MATRIX — all roles and their exact permissions (see Section 5).

G. UX PLAN — customer navigation, admin navigation, staff navigation, kitchen navigation.

H. SECURITY PLAN — tenant isolation, auth, authz, payment security, audit approach.

I. TEST PLAN — unit, integration, E2E, security, failure tests.

Only after presenting the audit and plan do you begin implementation, starting from the first missing highest-priority foundation item. Don't wait for unnecessary confirmation on straightforward decisions, but do not silently expand scope beyond what's written here.

===================================================================

2. PRODUCT OBJECTIVE — THE PRIMARY LOOP

===================================================================

This exact end-to-end flow is the primary acceptance test for the whole MVP:

Business owner signs up -> creates business -> creates branch -> creates tables -> each table gets a unique QR code -> owner builds the menu through the CMS -> customer scans a table's QR -> customer sees correct restaurant/table context ("You're ordering from Table 07") -> browses menu -> selects product, variant, add-ons, special instructions -> adds to cart -> places order -> pays if online payment is enabled -> restaurant and kitchen receive the order in real time -> kitchen accepts, prepares, marks ready -> staff serves -> order completes -> billing/payment records update -> owner sees the order and revenue on the dashboard.

If this loop works reliably end to end, the MVP is viable. Everything else supports this loop.

===================================================================

3. CORE PRINCIPLES

===================================================================

Prioritize, in this order: reliability, speed, simplicity, clear UI, error recovery, security, accurate financial data, auditability, operational visibility. Do not prioritize flashy UI over usability. Do not create unnecessary animations. A waiter should be able to operate the system with minimal training.

BUILD NOW: auth, multi-tenancy, RBAC, onboarding, branches, tables, unique QR per table, full menu CMS, customer ordering, cart, order engine, KDS, payments, billing, staff management, dashboard, basic reports, audit logs, notification foundation, production infrastructure, security, monitoring, backups.

DESIGN FOR, BUT DO NOT BUILD YET (Phase 2): inventory, recipes, purchasing, suppliers, wastage, CRM, loyalty, reservations, advanced POS, local print agent, WhatsApp, advanced analytics, multi-branch expansion.

PHASE 3 (hotel): rooms, guests, room QR, room service, folio, housekeeping, maintenance, concierge, PMS integration.

PHASE 4 (enterprise): white-label, custom domains, SSO, developer API platform, accounting integrations, AI, forecasting.

Do not implement Phase 2/3/4 simply because you know how, or because a feature "might be useful." Do not build speculative abstractions that make the MVP more complex. Do not redesign unrelated screens. Do not change technology or add dependencies without explicit reason.

===================================================================

4. MULTI-TENANCY (NON-NEGOTIABLE)

===================================================================

Hierarchy: Tenant -> Branch -> Outlet -> Tables -> QR Codes -> Menu -> Orders -> Staff -> Customers -> Payments -> Reports.

Tenant A must never be able to read, write, or delete Tenant B's data, under any circumstance. This must be enforced server-side, on every protected endpoint, validating: authenticated user -> tenant -> branch where applicable -> role -> permission -> resource ownership. Never rely on frontend filtering alone. Never trust a client-supplied tenant_id. Derive tenant context from the authenticated session wherever possible. Test cross-tenant access explicitly and continuously, not just once before launch.

Business type (Restaurant / Cafe / Hotel / Resort / Bar-Pub / Cloud Kitchen) should influence which modules and UI a tenant sees. Do not force hotel-specific concepts (rooms, folios, housekeeping) onto a plain restaurant tenant that hasn't enabled that module. Use feature flags per tenant/plan.

===================================================================

5. ROLES & EXACT PERMISSIONS

===================================================================

Platform-level: Super Admin (you), SaaS Admin/Support.

Business-level: Owner, Admin/Manager, Branch Manager, Floor Manager, Waiter/Server, Cashier, Chef/Kitchen Manager, Kitchen Staff, Bar Staff.

Future/Phase 2+: Inventory Manager, Accountant, Receptionist, Housekeeping, Maintenance, Delivery Staff.

Not every role needs to be enabled for every business — roles should be configurable per tenant.

Implement permissions as granular keys checked server-side on every request — never hard-code role checks into individual UI components. Examples: orders.view, orders.create, orders.cancel, orders.refund, menu.view, menu.edit, menu.delete, payments.view, payments.refund, staff.view, staff.create, staff.edit, reports.view, reports.financial, settings.manage, subscription.manage.

EXACT MATRIX (build this as a real, visible, admin-editable permission matrix — do not hard-code it if tenant-level configuration is required):

Super Admin: full platform access — create/suspend tenants, manage plans, platform analytics, platform config, impersonation (logged). Must never casually touch tenant transactional data.

Owner: full business-level control — branches, menu, tables, QR, staff, permissions, all orders, all reports, discounts, payments, billing, subscription.

Manager/Admin: day-to-day operations — menu, tables, QR, orders, staff (below their own level), reports, discounts up to a configured cap. Cannot manage subscription or delete the business.

Cashier: view orders, create counter orders, process payments, print bills, issue refunds only with permission/approval. Cannot edit menu pricing or manage staff.

Waiter/Server: view assigned tables, create/modify orders on assigned tables, add notes, request bill. Cannot edit menu pricing, refund, manage staff, or view full financial reports.

Chef/Kitchen Manager: full KDS control, prioritize orders, view kitchen performance. Cannot touch subscriptions, staff management, or financial config.

Kitchen Staff: KDS only — accept, preparing, ready. Nothing else. Keep this interface extremely simple.

Bar Staff: bar-routed items only (future station routing).

Hard rules: a Waiter must never see or touch subscription/billing/permissions or another business's data. A Manager must never create a Manager with more power than themselves or alter an Owner's permissions. Kitchen staff must see zero financial data and only the customer info needed to serve the order (table number, not phone/name). Every permission override must be audit-logged with who approved it and why. A lower-privilege user must never be able to grant themselves higher privileges by manipulating role IDs — Super Admin and Tenant Owner are completely separate privilege domains and must never cross.

===================================================================

6. TABLES AND QR — EVERY TABLE HAS ITS OWN UNIQUE QR CODE

===================================================================

This is a strict requirement, not a suggestion. Table 01 has QR 01, Table 02 has QR 02, and so on — permanently. When a customer scans a table's QR, the system resolves Tenant -> Branch -> Outlet -> Table automatically. The customer never types a table number. The interface should clearly state "You're ordering from Table 07."

QR must encode a secure, non-guessable public identifier (e.g. /q/8Hj3Kx92), never a raw sequential database ID (never /q/table/17 unexposed). Tampering with the URL must never reveal another tenant's data, another table, another customer's order, or admin information.

Admin/Manager can: create, rename, disable, enable, regenerate, download (PNG/SVG/PDF), print, bulk-generate, and bulk-print QR codes across all tables in one action — a 40-table restaurant should not need 40 individual downloads. Track scan counts per QR. A disabled or regenerated-away QR must reject new orders server-side immediately, with a clear customer-facing message, not a generic error.

Table states: Available, Occupied, Payment Pending, Reserved, Disabled (add others only if the actual workflow needs them — do not invent unnecessary states). A table may have multiple orders over its lifetime — do not assume one table equals one order forever. Multiple customers may scan the same table's QR; carts must be isolated per customer/session, never silently merged.

===================================================================

7. MENU CMS — A REAL CONTENT MANAGEMENT SYSTEM, NOT A SEED FILE

===================================================================

The menu must be fully manageable by the restaurant owner or manager with zero developer involvement, ever. Use plain language in the CMS ("Add Item," "Mark Out of Stock") — never database terminology.

Must support: categories and sub-categories with drag-and-drop reordering; products with name, description, multiple images (auto-optimized on upload, never serve a raw multi-MB image to a customer on mobile data), price, SKU, tax mapping, prep time; variants (e.g. Small/Medium/Large) with independent pricing; add-on groups with optional/mandatory rules and min/max selection; food attribute tags (Veg/Non-veg/Egg/Vegan/Jain/Gluten-free/Spicy) shown as clear icons; one-tap availability toggle that removes an item from the live customer menu near-instantly, not after a cache delay; time-based availability windows (breakfast/lunch/dinner) that switch automatically; Draft vs Published state so a manager can build a new section without customers seeing a half-finished menu; CSV/Excel bulk import for restaurants migrating an existing menu; and full price history — changing today's price must never alter what a past order shows as paid (see Section 12).

===================================================================

8. UI/UX STANDARD — TREAT THIS AS AN ACCEPTANCE CRITERION, NOT A NICE-TO-HAVE

===================================================================

The product has three completely different audiences and must not give them the same interface: the Customer ("I want to order quickly"), Staff ("I want to process the order quickly"), and the Owner ("I want to understand and control my business").

Customer app: mobile-first, one-handed thumb use, first screen to first cart item in under 90 seconds for a first-time user with zero instructions — if your own team can't hit that in testing, the flow is too complex. No blank loading screens — use skeleton loaders. Sticky cart bar always visible while browsing. Tap targets at least ~44px. High contrast, legible in a dim restaurant. Every state (empty cart, no internet, payment failed, item unavailable) has a designed screen, never a raw error or blank white page. Real order status as a clear visual progress indicator. Menu interactive in under 2 seconds on a mid-range Android phone on 4G, not just on a dev machine's WiFi.

Staff apps (waiter, cashier, KDS): optimized for speed and glanceability under pressure, not information density. KDS specifically needs high contrast and large text — kitchens are hot, steamy, badly lit, and staff glance at the screen mid-task. No feature that matters during service should be more than 2 taps away. Destructive actions (cancel order, remove staff, delete item) require clear confirmation. Prefer deactivate/archive over hard delete for products, categories, tables, staff, and never delete financial records.

Owner dashboard: leads with the 3-4 numbers an owner actually checks first (today's revenue, today's orders, AOV) — don't bury this under navigation. Every number/chart should be scannable in under 5 seconds.

General: one consistent design system across all three surfaces — buttons, inputs, cards, tables, modals, toasts, badges, empty states, loading states, error states — do not let every screen invent its own style. No lorem ipsum, no "coming soon," no fake stats outside an explicit demo mode. Every visible button either works or is clearly disabled with an explanation — no decorative dead buttons. No 404s, blank pages, or unhandled console errors on any navigation path before this is called done.

===================================================================

9. ORDER ENGINE

===================================================================

States: PENDING -> ACCEPTED -> PREPARING -> READY -> SERVED -> COMPLETED, plus CANCELLED, REFUNDED, PAYMENT_FAILED. All transitions validated server-side — an order must never silently jump from COMPLETED back to PREPARING. Every order carries a full event timeline (timestamp, actor, event) for customer tracking, staff accountability, analytics, and dispute resolution.

Order creation must be idempotent — a double-tap on "Place Order" must never create two orders. Concurrent edits to the same order by two staff members must be protected with transactions/locking/versioning, never a silent overwrite. Cancellation rules should depend on state: before acceptance the customer may cancel if configured; after preparation begins it requires staff/manager approval; after completion, use a refund/adjustment/credit note rather than rewriting the record.

===================================================================

10. KITCHEN DISPLAY SYSTEM (KDS)

===================================================================

New orders appear on the kitchen screen in real time, with table number, items, quantities, and any customer special instructions prominently visible (never buried). Buttons: Accept, Preparing, Ready. Keep this interface extremely simple, high-contrast, large text, large touch targets, minimal interaction count — kitchen staff should not navigate menus mid-service. Show order age/priority and a delayed-order indicator that uses more than color alone (label or icon too, for accessibility). New-order sound should be configurable on/off with volume control. If the real-time connection drops, on reconnect the KDS must re-fetch and reconcile state from the server — never silently lose or duplicate a ticket.

===================================================================

11. PAYMENTS AND BILLING

===================================================================

Support UPI, cards, net banking, and cash/manual confirmation, behind a payment-provider abstraction (initial gateway: Razorpay) so a second provider can be added later without a rewrite. Payment success is always verified server-side via signature/webhook — a browser claiming "success" is never sufficient evidence. Webhook processing must be idempotent; a duplicate callback must never create a duplicate payment record. Never store raw card data — the gateway owns that.

Invoices must include business name, address, GSTIN, invoice number, order number, itemized breakdown, discount, tax (configurable CGST/SGST/IGST, tax-inclusive or exclusive), total, and payment method. Tax calculation must happen in one centralized pricing/tax service — never recompute independently in the customer UI, admin UI, and invoice, or totals will drift out of sync across screens.

===================================================================

12. DATA INTEGRITY RULES (NEVER VIOLATE THESE)

===================================================================

Never trust client-supplied price, tax, discount, tenant ID, user role, payment status, or product availability — recalculate and validate all of it server-side from the authoritative source. When an order is created, snapshot the product name, variant, price, tax, and modifiers onto the order itself — a later menu price change must never alter a historical order's total. A payment must always belong to the correct tenant, correct order, and correct amount — never allow a payment intended for one order to attach to another. Historical financial records are corrected via refund/adjustment/credit note with an audit trail, never by silently rewriting them.

===================================================================

13. AUDIT LOGGING

===================================================================

Log every meaningful mutation: user created/disabled, role/permission changed, menu item created or price changed, product disabled, order cancelled, discount applied, payment refunded, subscription changed, business settings changed, QR disabled/regenerated. Each record needs actor, role, tenant, action, entity, entity ID, before-state, after-state, timestamp, and device/IP metadata where appropriate. Audit records must be append-only and protected from normal-user modification or deletion.

===================================================================

14. SECURITY (MANDATORY BEFORE ANY REAL RESTAURANT GOES LIVE)

===================================================================

Implement HTTPS, secure password hashing, secure session/token handling, RBAC, tenant isolation, server-side authorization on every endpoint, input validation, rate limiting (especially on login, password reset, and the public QR/checkout endpoints), CSRF protection where applicable, XSS and SQL-injection prevention, secure cookies, and centralized secrets management. Never log passwords or payment secrets.

Before any pilot restaurant is onboarded, explicitly test and document evidence for: cross-tenant read/write/delete attempts (must all fail), every role in Section 5 against every endpoint it should not reach, payment webhook signature validation and duplicate/replay handling, public QR abuse resistance, and a standard web app security review (XSS/SQLi/CSRF/broken access control/secret exposure). No pilot proceeds with unresolved critical or high findings.

===================================================================

15. RELIABILITY: OFFLINE, RECONNECTION, PRINTING

===================================================================

The system must survive temporary connectivity loss. Show a clear offline/reconnecting state; on reconnect, reconcile from the server rather than trusting local optimistic state; never show a successful order or payment based solely on the client believing it succeeded.

Design printing as real infrastructure, not a browser afterthought: order -> print job -> queue -> printer, with job states (Queued, Printing, Printed, Failed, Retrying). A printer being offline must never cause an order to be lost — the order stays intact and visible, with a clear "Printer offline — order still received" message and retry/reprint options. Architect now for a future local print agent even if browser printing is sufficient for MVP.

===================================================================

16. ANALYTICS, REPORTS, DASHBOARD

===================================================================

Dashboard leads with today's revenue, today's orders, and average order value, plus active tables, pending/preparing/ready order counts, and a sales trend. Every dashboard number must reconcile exactly against the underlying completed/paid transaction records — never compute figures from a frontend counter. Reports (sales, orders, products, payments, taxes, discounts) should support date range, branch, and payment-method filters, and export to CSV/Excel/PDF, respecting the exporting user's permissions — a Waiter should never be able to export financial reports.

===================================================================

17. TESTING REQUIREMENTS

===================================================================

Implement unit, integration, API, permission, tenant-isolation, payment, and end-to-end tests. Before declaring the MVP complete, run this exact scenario and provide evidence: create a real test tenant -> branch -> table -> generate its QR -> build categories/products/variants/add-ons -> publish -> scan the QR from an actual mobile browser -> verify correct table context -> browse -> add item with variant, add-on, and special instruction -> checkout -> complete payment -> verify server-side payment confirmation -> verify the order appears in admin and KDS -> walk it through Accepted -> Preparing -> Ready -> Served -> Completed -> generate the bill -> verify dashboard revenue updates -> verify the audit log entry exists -> verify no duplicate order or payment was created anywhere in the flow.

Also run a security test: create Tenant A and Tenant B with a full set of roles in each, then attempt every unauthorized cross-tenant and cross-role action described in Sections 4 and 5 — all must fail. And run a failure test: simulate internet disconnect, payment timeout, duplicate webhook callback, browser refresh mid-checkout, double-click submit, and printer offline — the system must remain consistent through all of them.

===================================================================

18. DEFINITION OF DONE

===================================================================

A feature is not done because "the page exists." It is done only when: UI works, backend logic is correct, database changes are complete, authorization is enforced, tenant isolation is verified, input is validated, errors are handled gracefully with no raw stack traces shown to users, relevant automated tests exist and pass, critical failure cases are tested, required audit logging exists, and evidence (screenshots, test output, recordings, or logs) is provided. "Implemented and tested," stated with nothing to back it, is not evidence.

===================================================================

19. CHANGE CONTROL

===================================================================

If you discover a requirement not covered here, do not silently implement your best guess. Classify it as MVP / Phase 2 / Phase 3 / Phase 4 / Out of Scope, tell me which and why, and wait for a decision before building it. Do not introduce major architectural changes without explaining what's insufficient about the current approach, what changes, what it affects, and the rollback plan.

===================================================================

20. OPEN DECISIONS — DO NOT GUESS AT THESE, ASK ME FIRST

===================================================================

These are genuinely unresolved and materially affect the data model — do not proceed past the relevant module until answered:

1. Payment settlement model: does customer payment go directly into each restaurant's own Razorpay sub-account, or through a platform account with payouts to them? This affects both the payment architecture and potential payment-aggregator compliance obligations.

2. SaaS billing model: flat monthly/annual per tenant, or usage/order-volume based?

3. Printer hardware actually in use at target pilot restaurants — determines whether browser printing is sufficient for MVP or a local print agent is needed sooner.

4. Exact discount approval thresholds per role (e.g. Cashier up to X%, Manager up to Y%) — needs a real number, not a placeholder, before RBAC for discounts can be built correctly.

5. Data retention and deletion policy for customer order/contact history, in line with India's DPDP Act.

6. Is English-only acceptable for the pilot, or does day-one need at least one regional language?

7. Which specific pilot restaurants are confirmed, and what's each one's real table count and peak concurrent order volume — this sets the actual load-testing target rather than a guess.

Do not proceed past the payments module or the RBAC/discount module without answers to items 1 and 4 specifically.

===================================================================

21. FINAL COMMAND

===================================================================

Start by inspecting the repository and producing the nine deliverables listed in Section 1 (audit, requirements matrix, gap analysis, implementation plan, database plan, permission matrix, UX plan, security plan, test plan). Then begin implementation from the first missing highest-priority foundation item, in this order: Foundation -> Auth -> Tenancy -> RBAC -> Onboarding -> Menu CMS -> Tables -> QR -> Customer Menu -> Cart -> Order Engine -> KDS -> Payments -> Billing -> Staff -> Dashboard -> Reports -> Audit -> Subscriptions -> Security Hardening -> Performance -> Pilot.

Build this as if a real restaurant will depend on it tonight, during its busiest dinner service. Every table has its own QR. Every menu is manageable through the CMS with zero developer involvement. Every permission is enforced server-side. Every tenant is isolated. Every failure has a recovery path. Every feature must earn its place in the current phase — nothing more.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/95a0ad8b-462c-416b-a06b-d93bd4fec1f5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

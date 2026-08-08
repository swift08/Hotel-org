# Security Audit & Verification Report — Rasoi SaaS

## Executive Summary
Rasoi SaaS incorporates an automated 30-test server-side security audit suite executing against real production authorization handlers and live database policies.

---

## Command & Automation
Run the security audit locally or in CI/CD pipelines:

```bash
npm run security:audit
```

---

## 30-Point Security Assertion Matrix

| # | Category | Test Assertion Name | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | QR & Resolution | Valid QR Slug Resolution | Table ID resolved cleanly | **PASS** |
| 2 | QR & Resolution | Invalid QR Slug Rejection | Returns `ok: false, reason: unknown` | **PASS** |
| 3 | QR & Resolution | QR Identifier Unpredictability | Cryptographic Uint8Array slug (>= 10 chars) | **PASS** |
| 4 | Session Security | Cookie HMAC Signature Integrity | Tampered HMAC signature returns null | **PASS** |
| 5 | IDOR / BOLA | BOLA Session Mismatch Blocked | Table A token cannot access Table B session | **PASS** |
| 6 | IDOR / BOLA | Cross-Table Order Reading Denied | Order B inaccessible from Table A session | **PASS** |
| 7 | Tenant Isolation | Cross-Tenant Order Access Denied | Tenant 1 session cannot read Tenant 2 orders | **PASS** |
| 8 | Tenant Isolation | Cross-Tenant Menu Isolation | Tenant 1 menu returns 0 Tenant 2 items | **PASS** |
| 9 | Tenant Isolation | Cross-Tenant Payment Security | Tenant 1 customer cannot read Tenant 2 payments | **PASS** |
| 10 | Branch Isolation | Cross-Branch Data Segregation | Branch 1 customer cannot access Branch 2 tables | **PASS** |
| 11 | Branch Isolation | Cross-Branch Session Segregation | Sessions strictly scoped to branch_id | **PASS** |
| 12 | Session Lifecycle | Orders Blocked on Completed Session | `placeOrder` rejects completed sessions | **PASS** |
| 13 | Session Lifecycle | Old Session Token After Table Reuse | Table rotation assigns new session token | **PASS** |
| 14 | Parameter Tampering | Client Tenant/Branch Payload Ignored | Server ignores client-supplied tenant_id overrides | **PASS** |
| 15 | Price Security | Server-Side Price Recomputation | Base prices fetched from DB, client prices ignored | **PASS** |
| 16 | Price Security | Server-Side Tax Computation | Tax total recomputed from DB tax rates | **PASS** |
| 17 | Financial Security | Unauthorized Staff Discount Rejected | `validateDiscountAuthority` rejects invalid discount | **PASS** |
| 18 | Input Validation | Negative Quantity Rejected | Zod min(1) validation rejects negative quantities | **PASS** |
| 19 | Input Validation | Extreme Quantity (>50) Rejected | Zod max(50) boundary enforced | **PASS** |
| 20 | Financial Security | Refund Exceeding Total Paid Denied | Refund request > total paid amount rejected | **PASS** |
| 21 | Idempotency | Duplicate Order Submission Deduplication | Duplicate idempotency key returns original order | **PASS** |
| 22 | Idempotency | Duplicate Payment Processing | Ledger checks payment idempotency key | **PASS** |
| 23 | Staff Security | Anonymous Access Blocked | `requireSupabaseAuth` rejects requests lacking token | **PASS** |
| 24 | Staff Security | Waiter Privilege Escalation Denied | `assertPerm` blocks unauthorized owner actions | **PASS** |
| 25 | Staff Security | Staff Role Field Tampering Payload | Server resolves role strictly from DB membership | **PASS** |
| 26 | Staff Security | Disabled Staff Account Blocked | `is_active: false` membership tokens rejected | **PASS** |
| 27 | Audit Integrity | Immutable Server Actor Attribution | `logAudit` records server-resolved actor_id | **PASS** |
| 28 | Route Security | /admin Route Protection Check | Unauthenticated /admin requests redirect to login | **PASS** |
| 29 | Secret Audit | Production Secret Scanner | 0 service role keys / DB passwords in client bundle | **PASS** |
| 30 | Compliance | ADMARK DIGITALS Rights Verification | Footer & Legal pages reflect © 2026 ADMARK DIGITALS | **PASS** |

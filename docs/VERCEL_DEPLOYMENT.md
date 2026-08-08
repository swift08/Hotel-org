# Vercel Deployment & Build Architecture — Rasoi SaaS

This document provides step-by-step instructions for deploying Rasoi SaaS to Vercel.

---

## 1. Project Build Configuration

- **Framework Preset**: Vite / TanStack Start
- **Build Command**: `npm run build`
- **Output Directory**: `.output/public`
- **Node Runtime**: Node.js 20.x or 22.x

---

## 2. vercel.json Configuration

The repository root includes a production-tested `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": ".output/public",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## 3. Pre-flight Deployment Check List

Run the following checks before committing to production:

```bash
# 1. TypeScript Verification
npx tsc --noEmit

# 2. Automated Security Audit (30 Security Tests)
npm run security:audit

# 3. Production Build Test
npm run build
```

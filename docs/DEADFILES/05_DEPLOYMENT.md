# Deployment Strategy

This project follows a **GitOps** workflow.
Source of Truth: `main` branch on GitHub.

---

## 1. Hosting Target

- **Provider**: Vercel.
- **Project Name**: `dominic-portfolio`.
- **Framework Preset**: Vite.
- **Root Directory**: `./` (Project Root).

---

## 2. Domain Configuration

- **Primary Domain**: `dominic.tailoredapproach.us`
  - *Note: This is the cleanest setup for Vercel (CNAME).*
- **Alternate**: `tailoredapproach.us/portfolio`
  - *Only if root domain is restricted.*
- **DNS**: Cloudflare -> Vercel CNAME (`cname.vercel-dns.com`).

---

## 3. Environment Variables

**None required.**
The build process must succeed with:
`npm run build`
...without any `.env` file.

*Analytics keys (Vercel) are injected automatically by the platform.*

---

## 4. Security Headers (`vercel.json`)

We must include a `vercel.json` to enforce security:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## 5. Pre-Deployment Checklist

Before merging to main:
1.  **Lint**: `npm run lint` (ESLint).
2.  **Typecheck**: `npm run typecheck` (TSC).
3.  **Test**: `npm run test` (Vitest).
4.  **Build**: `npm run build` (Verify no errors).

---

## 6. Maintenance

- **Frequency**: Monthly.
- **Scope**: Dependency updates, metric updates (Resell Tool), adding new "Proof".
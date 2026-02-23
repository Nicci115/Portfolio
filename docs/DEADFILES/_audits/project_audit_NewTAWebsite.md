# Project Audit: New TA Website

## A) Executive Snapshot
- What it is: Production-style Tailored Approach website with ROI/system-map lead capture and Vercel serverless email APIs.
- Entrypoints: `src/main.tsx`, route shell in `src/App.tsx`, serverless handlers in `api/contact-email.ts` and `api/system-map-email.ts`.
- Primary stack: React 19 + TypeScript + Vite, React Router, Nodemailer via Vercel functions.
- Deployment assumptions: Vercel static frontend + Vercel serverless API routes (`vercel.json` rewrite).
- Maturity state: Deployed-capable partial product with substantial UX and backend-lite form handling.

## B) File Inventory
- Filtered file count (skip-rule applied): 168
- Estimated LOC (text/code/docs): 25,696
- Top file types: `.md` (69), `.tsx` (29), `.css` (24), `.ts` (19)
- Key config files:
  - `package.json`
  - `vercel.json`
  - `tsconfig*.json`
  - `.env`, `.env.local` (sensitive)

### Tree (depth 6+ representative)
```text
New TA Website/
  src/
    pages/
      Home/
        sections/
          SystemMap/
            index.tsx
            SystemMapForm.tsx
            SystemMapPreview.tsx
            previewLogic.ts
      ROI/
        ROICalculatorPage.tsx
    components/
      Header/
        Header.tsx
  api/
    email-templates/
      config.ts
      logic.ts
      customer-blueprint.ts
    contact-email.ts
    system-map-email.ts
    transport.ts
  vercel.json
```

## C) Architecture Map
- Subsystems:
  - Marketing/site shell with SEO/meta management.
  - Multi-step System Map form and generated outcome preview.
  - ROI calculator flows.
  - Serverless SMTP mail transport + templating layer.
- Runtime topology: Browser SPA + serverless API handlers.
- Data persistence: No database; request payloads translated to email artifacts.

```text
User Browser (Vite SPA)
  -> Routes (/ /about /faqs /contact /roi)
  -> Contact form -> POST /api/contact-email
  -> System map form -> POST /api/system-map-email (internal/customer)
Vercel Functions
  -> validate payload
  -> render templates
  -> SMTP send via nodemailer
```

## D) Feature Extraction
- Core features:
  - Intro gate + route-based page system with SEO metadata updates.
  - Contact form with async submission/failure messaging.
  - Guided “System Map” flow with industry-specific branching.
  - Blueprint preview + customer email dispatch.
- Automation workflows:
  - Internal lead notification email and customer blueprint email.
- Integrations:
  - SMTP provider via environment-configured host/user/pass.
  - Vercel Analytics in client runtime.
- Auth flows: None (public marketing/lead capture app).
- Background jobs/schedulers: None persistent; request-time only.

## E) Evidence Snippets
### Feature: Route/meta orchestration
Path: `src/App.tsx:104`
```ts
const meta = metaByPath[location.pathname] ?? metaByPath['/']
document.title = meta.title
setMetaTag('meta[name="description"]', meta.description)
```

### Feature: System map submission pipeline
Path: `src/pages/Home/sections/SystemMap/SystemMapForm.tsx:86`
```ts
const res = await fetch('/api/system-map-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ form, outcome, action: 'internal' }),
})
```

### Feature: Serverless validation + dual email mode
Path: `api/system-map-email.ts:50`
```ts
if (!businessName || !industry || !email || !isValidEmail(email)) {
  return res.status(400).json({ ok: false, error: 'Invalid form submission' })
}
if (action === 'internal') { /* admin lead email */ }
else if (action === 'customer') { /* customer blueprint email */ }
```

## F) Engineering Signals
- Separation of concerns: Strong (UI pages/components, API transport, template logic, shared typed contracts).
- Reusable patterns: Shared industry config reused by ROI and System Map logic.
- Typed models/schemas: Good TS typing (`FormState`, `OutcomeContract`, industry type maps).
- Error handling/logging: Frontend fallback messaging + API 400/405/500 responses.
- Security posture:
  - Positive: server-side SMTP handling, method guards.
  - Risk: plaintext credentials and long-lived OIDC token present in env files.
- Scalability constraints:
  - Email-only storage means no lead database/audit trail.
  - Large config/template files may become hard to maintain without modularization.

## G) Scoring (1–100)
- Architecture: 79
- Code Quality: 78
- Structure: 84
- Deployment Readiness: 82
- Security: 46
- UX Maturity: 88
- Documentation Quality: 75
- Maintainability: 76
- Test Readiness: 42
- Overall Portfolio Worthiness: 77

### Score Justification
- Strongest points: coherent full-stack-lite architecture, typed domain modeling, polished UX narrative.
- Weakest points: secret management hygiene and limited automated test evidence.

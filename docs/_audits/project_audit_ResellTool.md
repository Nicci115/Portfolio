# Project Audit: Resell Tool

## A) Executive Snapshot
- What it is: Full-stack cross-listing platform with backend orchestration, frontend control plane, browser extension execution layer, and Supabase-backed job/state model.
- Entrypoints:
  - Backend: `crosslister-backend/index.js` and `crosslister-backend/app.js`
  - Frontend: `frontend/src/main.tsx`, `frontend/src/App.tsx`
  - Extension: `extension/src/manifest.ts`, background worker and content scripts
- Primary stack: Node/Express backend, React+TypeScript frontend, Chrome extension (MV3), Supabase, WebSocket/SSE.
- Deployment assumptions: Separate deploy units (web app + API + extension package), Supabase required.
- Maturity state: Advanced partial product; strongest portfolio candidate in this scan.

## B) File Inventory
- Filtered file count (skip-rule applied): 1,032
- Estimated LOC (text/code/docs): 130,621
- Top file types: `.md` (587), `.tsx` (132), `.js` (129), `.ts` (64), `.sql` (58)
- Key config files:
  - `crosslister-backend/.env.example`, `crosslister-backend/package.json`
  - `frontend/package.json`, `frontend/vercel.json`
  - `extension/package.json`, `extension/src/manifest.ts`
  - `crosslister-backend/supabase/migrations/*`

### Tree (depth 6+ representative)
```text
Resell-Tool-master/
  crosslister-backend/
    services/
      mirrorMode/
        marketplaceHandlers/
          poshmarkHandler.js
          mercariHandler.js
        mirrorQueue.js
        mirrorSessionManager.js
    routes/
      sync.js
      mirror.js
      extension.js
    tests/
      unit/
        runSyncJob.test.js
    supabase/
      migrations/
        0036_extension_sessions_rls_policies.sql
  frontend/
    src/
      pages/
        PhotoEditor/
          state/
            reducer.ts
  extension/
    src/
      marketplaces/
        poshmark/
          core/
            executor.ts
```

## C) Architecture Map
- Subsystems:
  - API orchestrator (records jobs, auth/tenant checks, sync control endpoints).
  - Mirror mode session/queue services for extension coordination.
  - Frontend operator console for listings, automation, reports, connections.
  - Browser extension executing marketplace interactions in user browser context.
  - Supabase persistence for drafts/jobs/sessions/analytics.
- Runtime topology: FE + BE + extension + Supabase + marketplace websites.
- Data persistence: Supabase tables/migrations with auth/account scoping and mirror session records.

```text
Frontend App
  -> Backend API (/api/*)
     -> Supabase (drafts/jobs/accounts)
     -> Mirror queue/session manager
       -> WebSocket/SSE to Extension
Extension (content scripts on marketplaces)
  -> scans/prefills/actions in browser context
  -> status/results back to backend
```

## D) Feature Extraction
- Core features:
  - Authenticated workspace app with protected routes and app shell.
  - Draft/listing sync orchestration with queue/job lifecycle.
  - Mirror mode for browser-native execution and side panel workflows.
  - Multi-marketplace extension scripts (Poshmark, Mercari, Depop) with scanning and execution modules.
  - eBay-related workers/routes and sales/reporting surfaces.
- Automation workflows:
  - Manual sync -> queued job -> extension prefill/action -> event/status updates.
  - SSE endpoint for timeline updates.
- Integrations:
  - Supabase auth/data, marketplace sites via extension host permissions, eBay APIs.
- Auth flows:
  - Backend `verifyAuth` via Supabase token lookup and tenant resolution.
  - Frontend auth context with profile bootstrap and extension auth handshake.
- Background jobs/schedulers:
  - Optional eBay worker initialization.
  - Job cleanup and sync trackers.

## E) Evidence Snippets
### Feature: API + mirror websocket split
Path: `crosslister-backend/index.js:14`
```js
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname.startsWith('/api/mirror')) { /* mirror ws */ }
  else { /* default ws */ }
});
```

### Feature: Auth + tenant resolution middleware
Path: `crosslister-backend/middleware/auth.js:49`
```js
const { data: accountUser } = await supabase
  .from('account_users')
  .select('account_id, role, user_id')
  .eq('user_id', user.id)
  .single();
req.tenant = { account_id: accountUser.account_id, role: accountUser.role, user_id: accountUser.user_id };
```

### Feature: Sync enqueue into mirror queue
Path: `crosslister-backend/services/syncService.js:53`
```js
await syncJobTracker.upsertDraftJobs({ draftId, accountId: account_id, userId: user_id, marketplaces: targetMarketplaces });
await updateDraftStatus(draftId, account_id, { processing_status: 'pending_sync' });
await mirrorQueue.enqueuePrefill(payload);
```

### Feature: Extension marketplace permissions and script matrix
Path: `extension/src/manifest.ts:9`
```ts
host_permissions: [
  'https://*.poshmark.com/*',
  'https://*.mercari.com/*',
  'https://*.depop.com/*',
],
content_scripts: [ /* executor + work panels + scanners */ ]
```

## F) Engineering Signals
- Separation of concerns: Very strong across backend services/routes, frontend feature modules, and extension domains.
- Reusable patterns: Queue/session abstractions, shared auth context, marketplace handler architecture.
- Typed models/schemas: Mixed but substantial TS usage in frontend/extension.
- Error handling/logging: Structured logger usage plus explicit middleware error handler.
- Security posture:
  - Positive: env validation, auth middleware, cookie credentials, role/tenant model, mirror token secrets.
  - Risks: large surface area increases review burden; ensure production hardening for mock/skip auth toggles.
- Scalability constraints:
  - Multi-runtime synchronization complexity (API <-> extension <-> marketplace DOM volatility).
  - Heavy docs and broad feature footprint can slow onboarding.

## G) Scoring (1–100)
- Architecture: 89
- Code Quality: 82
- Structure: 88
- Deployment Readiness: 79
- Security: 74
- UX Maturity: 82
- Documentation Quality: 86
- Maintainability: 78
- Test Readiness: 70
- Overall Portfolio Worthiness: 85

### Score Justification
- Strongest points: uncommon architecture breadth (web app + backend + extension + sync orchestration) with real implementation depth.
- Weakest points: operational complexity and moving parts across browser DOM integrations.

# Project Audit: RealEstateCRM

## A) Executive Snapshot
- What it is: Multi-tenant real-estate CRM platform with API services, large frontend app, Supabase schema/migrations, and n8n workflow assets.
- Entrypoints:
  - Backend API: `api/index.js`
  - Frontend app: `Frontend CLEANED/src/App.jsx` + `Frontend CLEANED/src/AppContent.jsx`
  - Supabase: `supabase/migrations/*`
  - n8n infra docs/config: `N8N/docker-compose.yml`, workflow JSON assets
- Primary stack: Node/Express API, React/Vite frontend, Supabase, Twilio/Resend/Google/Calendly/HubSpot integrations, optional n8n.
- Deployment assumptions: Split FE/BE deployment with Supabase; explicit env-driven external integrations.
- Maturity state: Partial to advanced prototype with broad scope; contains active code plus substantial planning/docs.

## B) File Inventory
- Filtered file count (skip-rule applied): 1,039
- Estimated LOC (text/code/docs): 172,766
- Top file types: `.md` (568), `.js` (118), `.jsx` (113), `.css` (76), `.sql` (30)
- Key config files:
  - `api/package.json`, `api/.env.example`
  - `Frontend CLEANED/package.json`, `Frontend CLEANED/.env.example`
  - `supabase/config.toml`
  - `N8N/.env.example`, `N8N/docker-compose.yml`

### Tree (depth 6+ representative)
```text
RealEstateCRM/
  api/
    routes/
      authRoutes.js
      webhookRoutes.js
      aiRoutes.js
    middleware/
      auth.js
      attachTenantContext.js
      csrf.js
    services/
      CrmAdapterFactory.js
      automationService.js
      n8nService.js
    adapters/
      HubSpotAdapter.js
  Frontend CLEANED/
    src/
      js/
        apiClient.js
      contexts/
        CsrfContext.jsx
        AuthUserContext.jsx
      pages/
        Dashboard.jsx
  supabase/
    migrations/
      20250731120001_create_automation_settings.sql
      20250731130000_create_crm_connections.sql
  N8N/
    docker-compose.yml
    my_n8n_reference_workflow.json
```

## C) Architecture Map
- Subsystems:
  - Express API gateway with many route domains.
  - Auth/tenant middleware chain with JWT cookie, Supabase user lookup, workspace context attachment.
  - Integration layer (HubSpot, Google, Calendly, Twilio, n8n).
  - Frontend dashboard app with route gating and CSRF token lifecycle.
  - Supabase schema and trigger-based automation/activity logging.
- Runtime topology: FE <-> API <-> Supabase + external SaaS APIs.
- Data persistence: Supabase tables, migrations, triggers, and integration credential records.

```text
React Frontend
  -> API (Express)
     -> middleware: auth -> tenant context -> CSRF/rate limits
     -> services/adapters (CRM, AI tasks, automation)
     -> Supabase (core data)
     -> External APIs (HubSpot/Google/Calendly/Twilio/n8n)
Supabase
  -> SQL migrations + triggers for activity and automation state
```

## D) Feature Extraction
- Core features:
  - Multi-page CRM frontend (dashboard, leads, listings, inbox, calendar, analytics, settings).
  - Auth routes with login/signup/logout/me/verify-status and Google OAuth callback path.
  - Tenant-scoped operations through workspace resolution middleware.
  - CRM adapter abstraction with HubSpot implementation.
  - Automation settings + activity logs + AI task moderation endpoints/services.
- Automation workflows:
  - Automation toggles persisted per workspace.
  - n8n trigger service for lead profile generation.
  - DB triggers for activity logs on lead creation.
- Integrations:
  - Supabase, HubSpot, Calendly, Google (Sheets/Gmail), Twilio, Resend, n8n.
- Auth flows:
  - JWT in `session_token` cookie + protected middleware chain.
  - CSRF token endpoint and client-side auto-refresh handling.
- Background jobs/schedulers:
  - Workflow assets in `backend/*.json` and n8n artifacts.
  - No single consolidated queue runtime found in scanned API root.

## E) Evidence Snippets
### Feature: Security middleware chain and protected routing
Path: `api/index.js:89`
```js
app.use(helmet());
app.use(hpp());
app.use(xss());
app.use(protectRoute, attachTenantContext, userRateLimitMiddleware, csrfProtection);
```

### Feature: Tenant context attachment
Path: `api/middleware/attachTenantContext.js:26`
```js
const { data: workspaceUserData } = await supabase
  .from('workspace_users')
  .select('workspace_id')
  .eq('user_id', userId)
  .single();
req.user.workspace_id = workspaceUserData.workspace_id;
```

### Feature: CRM adapter factory + encrypted credentials usage
Path: `api/services/CrmAdapterFactory.js:16`
```js
const { data: connection } = await supabase
  .from('crm_connections')
  .select('crm_type, credentials')
  .eq('workspace_id', workspaceId)
  .eq('is_active', true)
  .single();
credentialsToUse = JSON.parse(decrypt(connection.credentials));
```

### Feature: Frontend CSRF token handling
Path: `Frontend CLEANED/src/js/apiClient.js:16`
```js
const response = await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });
csrfToken = response.data.csrfToken;
apiClient.interceptors.request.use((config) => {
  if (isStateChangingMethod && csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
});
```

### Feature: Database trigger automation
Path: `supabase/migrations/20250727000000_create_lead_creation_trigger.sql:2`
```sql
CREATE OR REPLACE FUNCTION public.log_lead_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (...);
  RETURN NEW;
END;
```

## F) Engineering Signals
- Separation of concerns: Strong (routes/services/adapters/middleware split, frontend contexts/hooks).
- Reusable patterns: Adapter factory, middleware chain, API helper modules.
- Typed models/schemas: Mixed; frontend mostly JS/JSX (limited static typing), no broad runtime schema validation in key request paths.
- Error handling/logging: Frequent try/catch and logs; partial structured logging.
- Security posture:
  - Positive: cookie auth, CSRF middleware, tenant context checks.
  - Risks:
    - `api/index.js` imports security libs not declared in `api/package.json` (`helmet/hpp/xss-clean/csurf/rate-limiter-flexible`) suggesting dependency drift.
    - `api/services/cryptoService.js` includes a default fallback key string.
    - Webhook signature verification can be bypassed if secret is unset.
- Scalability constraints:
  - Large monorepo with many docs/legacy artifacts increases cognitive load.
  - Mixed maturity across modules and possible route/service mismatch (example: n8n route calls `triggerWorkflow` while service exposes `triggerLeadProfileGeneration`).

## G) Scoring (1–100)
- Architecture: 80
- Code Quality: 68
- Structure: 74
- Deployment Readiness: 62
- Security: 58
- UX Maturity: 76
- Documentation Quality: 83
- Maintainability: 61
- Test Readiness: 45
- Overall Portfolio Worthiness: 71

### Score Justification
- Strongest points: serious multi-tenant architecture intent, integration breadth, CSRF/auth layering, migration-backed data model.
- Weakest points: dependency/config drift, uneven code maturity, and security hardening gaps in specific modules.

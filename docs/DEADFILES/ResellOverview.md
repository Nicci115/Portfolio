0) What this system is (one paragraph, no fluff)

This project is a 3-part, production-deployed automation system that combines (1) a React/Vite SPA for drafting, managing, and tracking listings, (2) an Express backend that provides authentication, persistence, job orchestration, and real-time coordination, and (3) a Chrome Extension (MV3) that executes marketplace automation (via content scripts) and participates in a real-time “Mirror Mode” workflow that synchronizes and applies listing actions across marketplaces. The architecture is intentionally split because marketplaces are browser-only automation targets: the extension is the execution engine, while the backend + SPA are the control plane and persistence layer.

1) High-level architecture & why it’s designed this way
1.1 Subsystems (control plane vs execution plane)

Control plane

Frontend SPA: authoring + workflow UI, manages session, drafts, uploads, and triggers automation.

Backend API: auth, persistence, job tracking, integrations (eBay), upload orchestration, event fanout, and WebSocket upgrade routing.

Supabase: primary persistence (DB), storage (images), and Supabase Auth user verification.

Execution plane

Chrome Extension: runs marketplace-specific automation code inside marketplace pages (content scripts) and maintains a persistent coordination channel via WebSockets to perform Mirror Mode job steps.

This split is fundamentally correct for a marketplace automation tool:

Marketplaces enforce same-origin policy and bot controls; automation must run in-browser.

The backend can coordinate, authenticate, schedule, store results, and enforce ownership/locks.

1.2 Topology (text diagram)

Control plane

[SPA (Vercel)] -> HTTP /api -> [Express API (Render or Vercel serverless entry)] -> [Supabase DB/Auth/Storage]

[SPA] -> WebSocket /api/mirror -> [Mirror WS Server]

[SPA] -> WebSocket (draft sync WS) -> [Default WS Server]

[SPA] <-> postMessage -> [Extension spaBridge content script]

Execution plane

[Extension content scripts on marketplaces] -> chrome.runtime.sendMessage -> [Extension background/service worker]

[Extension background] -> WebSocket -> [Mirror WS Server]

[Extension background] -> HTTP -> [Express API] (auth refresh / endpoints as needed)

2) Entrypoints and runtime boot sequence
2.1 Frontend entrypoints

Runtime entry: frontend/src/main.tsx mounts React root and wraps providers (Router + AuthProvider).

Routes: frontend/src/App.tsx defines public routes and authenticated app routes.

Public routes (example set)

/login, /register, /auth/callback

Authenticated routes (example set)

/workspace-dashboard, /listing-studio, /photos, /connections, /sync-listings, /automation, /reports, /settings

2.2 Backend entrypoints

Primary runtime entry: crosslister-backend/index.js

Creates HTTP server

Adds server.on('upgrade', ...) to route WS upgrades:

if path starts with /api/mirror -> Mirror WebSocket server

else -> default WebSocket server (draft sync rooms)

Express wiring: crosslister-backend/app.js

Helmet + CORS + JSON parsing with limits + request logging

Public endpoints (health + auth)

Auth gating via verifyAuth middleware

Mirror routes with extra auth modes for confirm/mirror tokens

2.3 Vercel serverless entry

api/index.js exports the backend app as a serverless function entrypoint.

vercel.json rewrites route /api/(.*) to /api.

Important architectural implication: you potentially have two viable backend deployments:

Render: full Node server + WebSocket support

Vercel Serverless: HTTP routes only (WebSocket limitations vary)
This creates a “split brain risk” if the app/extension talk to different backends for different features.

2.4 Extension entrypoints

Manifest (MV3): extension/src/manifest.ts

service worker entry: src/background/service-worker.js

popup UI + side panel UI

content script match rules for marketplaces + app domain bridge + delist assist

service-worker: extension/src/background/service-worker.js imports background index.

Background core: extension/src/background/index.js

WS connection manager: extension/src/background/connectionManager.ts

Auth manager: extension/src/background/authManager.js stores tokens in chrome.storage.local

3) Authentication model (cookie + bearer hybrid)
3.1 What “auth” means in this system

The backend authenticates requests by extracting a session token from either:

Authorization: Bearer <token> header, OR

session_token=<token> cookie

Then it validates that token against Supabase Auth via supabase.auth.getUser(token). Successful validation yields a user. That user is mapped to a tenant/account via account_users.

Evidence pointers from the agent output:

crosslister-backend/utils/sessionToken.js extracts token from header or cookie.

crosslister-backend/middleware/auth.js validates token via Supabase and assigns req.user and req.tenant.

3.2 Cookie configuration

The backend sets a session_token cookie with flags:

HttpOnly

SameSite=None in production; SameSite=Lax in non-prod

Secure in production

This is compatible with cross-site cookie behavior (e.g., SPA on Vercel calling Render) if CORS and credentials settings are correct.

3.3 Auth state propagation (SPA → extension)

The SPA uses AuthContext to:

call /users/me to establish session + tenant

then sends an AUTH_BUNDLE via window.postMessage(..., '*') to the extension bridge, so the extension can operate with user context/tokens.

This is a critical trust boundary and also a primary risk area (discussed later).

4) Core data model (Supabase-centric)

Supabase is the source of truth for:

multi-tenant structures (accounts, account_users)

drafts and listings

job tracking

credentials and tokens (encrypted)

import runs

analytics

4.1 Key tables (conceptual)

(Names per CLI output; field-level detail exists in CurrentSupaBaseSQL.sql.)

Identity & tenancy

accounts

account_users (includes role like owner)

account_settings (panic mode, stale thresholds)

Draft + listing lifecycle

listing_drafts (primary working entity; includes images jsonb, marketplaces array, processing_status, mirror_status)

listings (published/created listings)

marketplace_links (normalized marketplace link records)

Mirror Mode + job tracking

marketplace_sync_jobs (tracks mirror jobs, sync state, status)

mirror_tokens (stores encrypted access + refresh tokens for mirror sessions)

Credentials

marketplace_credentials (encrypted blobs)

marketplace_session_states (encrypted OAuth state storage)

eBay integration

ebay_accounts (encrypted tokens)

ebay_policy_ids (policy metadata)

Import pipeline

import_runs

import_runs_items

Analytics

user_sales_data

sales_events

user_analytics_summary

4.2 Encryption approach (important)

The backend encrypts:

marketplace credentials

eBay tokens

likely some session states

Encryption uses a master key (CROSSLISTER_MASTER_KEY) and stores encrypted buffers/bytea fields.

This is a strong “senior-level” design signal: credentials are not stored in plaintext.

5) Draft lifecycle and listing workflow (end-to-end)
5.1 Draft creation/update

SPA uses a drafts hook (e.g., useListingDraft) to persist a draft by calling backend:

POST /api/drafts with payload describing current draft fields (title, description, images, price, marketplaces, etc.)

Backend:

controller validates required fields

draft service saves into listing_drafts

normalizes images, statuses, hashes, etc.

5.2 Upload pipeline (images)

SPA uploads images via backend endpoints under /api/uploads, backed by:

multer for file ingestion

Supabase Storage bucket listing-images

path convention:

drafts: user/{userId}/drafts/...

listings: user/{userId}/listings/{listingId}/...

A finalize endpoint moves/associates draft uploads to the listing path.

5.3 Sync trigger (Mirror Mode orchestration)

When the user triggers “sync” from the app:

SPA calls POST /api/drafts/:id/sync

backend enqueues a Mirror job:

creates a record in marketplace_sync_jobs

signals Mirror Mode queue to enqueue a “prefill” job

extension receives the job via Mirror WS channel, performs steps on marketplace pages, and reports progress/events back.

This architecture is exactly what you’d expect for reliable browser automation:

backend persists job + ownership

extension executes

progress streamed via WS/SSE back to SPA

6) Mirror Mode (the signature feature)

Mirror Mode is the backbone of the tool’s “automation” claim. It is not a simple WS chat—it is a job execution protocol.

6.1 Mirror Mode channel

Dedicated WebSocket path: /api/mirror

Auth model:

Mirror token is a JWT signed by MIRROR_JWT_SECRET

claims include sub (userId), accountId, browserId, sessionId

Server enforces:

heartbeat messages

panic mode bypass/abort (via account_settings)

Client behavior:

SPA builds Mirror WS URL derived from API base URL and converts to wss

Extension background maintains WS connection with reconnection/backoff

SPA uses a “mirror:auth” message on connect

6.2 Mirror events (conceptual catalog)

The server-side session manager handles a catalog of events like:

auth handshake (mirror:auth)

job enqueue (“prefill”, “scan”, etc.)

confirmations (mirror:confirmAction)

scan completion (mirror:scanComplete)

work completion (mirror:workComplete)

heartbeats (mirror:heartbeat)

prefill acknowledgements (mirror:ack:prefill)

maybe marketplace toggles or prompts

The important point: Mirror Mode appears to be a state machine driving job phases.

6.3 Locking / concurrency control

The system uses job ownership checks that reference:

browserId

installId

jobId status

Ownership assertions prevent conflicting extension instances from claiming the same job.

This is a non-trivial reliability feature: it’s the difference between “automation sometimes works” and “automation can be trusted.”

7) Default WebSocket draft sync channel (and why it’s risky)

There is a second WS channel that is not Mirror Mode:

A default WS server that allows clients to send JOIN with a draftId

After join, they receive updates

Per the CLI output:

no auth and no tenant isolation are present; join is only by draftId

This is a critical security gap because if draft IDs are guessable/leaked, an attacker could subscribe to a draft’s updates.

Even if IDs are UUIDs and hard to guess, security by obscurity isn’t acceptable if you’re presenting this as production-grade.

Portfolio framing:

This is the #1 “known risk” to fix for enterprise hardening.

8) Chrome Extension deep model
8.1 Why the extension needs broad permissions

The extension requests permissions such as:

tabs, scripting, activeTab: to inject scripts and operate on marketplace pages

storage: for persisting auth bundles and mirror tokens

cookies: to detect session/logged-in states on marketplaces

downloads: for export/download workflows

notifications, sidePanel: UX + operations surface

Host permissions include marketplaces like Poshmark/Mercari/Depop.

8.2 Content scripts roles

The manifest includes content scripts that:

run on marketplace domains to read DOM, detect login, parse inventory pages, execute listing/delist actions

run on the app domain to bridge SPA <-> extension communication (spaBridge)

a delistAssist script runs on <all_urls> (high risk, discussed later)

8.3 Extension <-> App handshake

The extension bridge design:

spaBridge.ts listens for window messages from the SPA

forwards messages to background via chrome.runtime.sendMessage

background responds to ping/auth and handles Mirror WS connection

SPA sends:

AUTH_BUNDLE containing session token + account context

Extension replies:

EXTENSION_PONG

EXTENSION_AUTH_ACK etc.

8.4 Extension state storage

Auth and tokens are stored in:

chrome.storage.local

e.g. crosslister_auth

mirrorTokens

This is appropriate for MV3 durability.

8.5 Marketplace login detection

The extension detects logged-in state by inspecting DOM or localStorage patterns, such as:

reading __NEXT_DATA__ for Next.js sites

checking localStorage keys (e.g. Depop user_id)

This is brittle but normal for browser automation.

9) eBay integration (OAuth + token storage)
9.1 OAuth flow

End-to-end:

SPA calls GET /api/ebay/auth/start

backend builds an eBay auth URL with state

backend stores encrypted state in marketplace_session_states

redirects browser to eBay

eBay redirects back to GET /api/ebay/auth/callback?code&state

backend validates state, exchanges code for tokens

backend encrypts tokens and stores in ebay_accounts

backend responds to UI by posting message to opener window: EBAY_AUTH_SUCCESS

9.2 Security note

Callback uses window.opener.postMessage(..., '*') (wildcard target). That is a known risk if the opener is not validated.

Again: fixable, but should be explicitly captured as “hardening backlog.”

10) Deployment topology & environment coupling
10.1 Frontend (Vercel)

Vite SPA builds static assets

env vars compiled at build time

expects:

VITE_API_URL (backend HTTP base, typically /api)

VITE_WS_URL (default WS server base)

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

10.2 Backend (Render / Node)

full Node server required for WebSocket upgrades

uses env validation via config/env.js, requires:

SUPABASE_URL

SUPABASE_KEY (service role)

CROSSLISTER_MASTER_KEY

MIRROR_JWT_SECRET

ENABLE_MIRROR_MODE

plus optional EBAY vars, limits, CORS allowlist, etc.

10.3 Vercel serverless backend entry (potential)

api/index.js can serve HTTP routes

but Mirror Mode WS and default WS require stable upgrade support

if WS is only on Render, the SPA + extension must be configured accordingly.

10.4 Extension production backend coupling

The extension’s authManager.js has logic akin to:

dev: localhost

prod: hardcoded https://resell-tool.onrender.com

This is acceptable if Render is truly source-of-truth for WS + mirror endpoints, but it becomes a drift risk if you ever move backend.

Portfolio interpretation:

This is a pragmatic deployment decision but should be described as “configurable target” in v2.

11) Critical risks & known defects (portfolio-grade honesty)

This is the section that, done correctly, makes you look more senior, not less — because you understand your own system’s threat model.

11.1 High severity

Draft WS channel unauthenticated

Clients join by draftId

no tenant checks or auth handshake

risk: draft data exposure if ID leaked
Mitigation: require session token on JOIN + validate tenant ownership before subscribing.

postMessage trust boundary is wildcard

SPA sends auth bundle with target='*'

extension bridge accepts messages with insufficient origin validation

risk: malicious page can spoof extension/app messages in some contexts
Mitigation: strict origin allowlist + structured message signing or token-binding.

Mirror token refresh bug (undefined function)

upsertTokenRecord referenced but not defined in refresh path

likely breaks refresh and causes mirror session failures under certain conditions
Mitigation: implement or import correct function; add tests.

11.2 Medium severity

CORS allows any chrome-extension:// origin

backend CORS accepts any extension origin, not just yours
Mitigation: restrict to known extension IDs or require auth on all endpoints + preflight origin checks.

<all_urls> delistAssist content script

extremely broad execution scope

increases risk surface and Chrome Web Store review friction
Mitigation: narrow matches to specific sites or use activeTab + runtime injection.

Logger missing import in eBay orders service

runtime crash risk in that service path
Mitigation: add logger import, add CI test that imports service.

11.3 Low severity / maintainability

Duplicate function definition in draftsController

can cause confusion or wrong export usage depending on module structure
Mitigation: remove duplication, enforce lint rules.

Environment split / drift risks

Render vs Vercel vs extension hardcode
Mitigation: centralize “backend base URL” config and re-use across SPA/extension.

12) What this project proves (how a senior reviewer will read it)
12.1 Technical depth demonstrated

Multi-surface product: SPA + backend + MV3 extension

Real-time orchestration with WebSocket upgrade routing and dedicated mirror path

Job tracking and ownership locks (browserId/installId/sessionId)

Credential and token encryption at rest

Multi-tenant mapping (account_users)

Mixed real-time patterns: WS + SSE for sync events

Practical automation engineering: DOM parsing + marketplace executors

12.2 What reviewers will ask (and how you answer)

“Why a Chrome extension?” → because automation must run in-browser for marketplaces.

“How do you prevent race conditions?” → job ownership checks + mirror session management.

“How do you store secrets?” → encrypted storage using master key; don’t store plaintext tokens.

“What’s the biggest risk?” → unauth draft WS and postMessage wildcard; fix list included.

“How do you deploy?” → SPA on Vercel; WS backend on Render; Supabase for data + storage.

12.3 The most impressive feature to spotlight

Mirror Mode — a coordinated state machine between backend and extension, with real-time progress and ownership enforcement. That’s the “signature” engineering story.

13) How to run locally (inferred from code patterns)

Even without docs, you can infer:

Backend runs on PORT default 4000.

Frontend dev server on Vite default 5173 with proxy to localhost:4000 likely configured in vite config.

Extension uses Vite + crxjs build system.

Practical local run mental model:

Start backend (Express server with WS upgrade)

Start frontend (Vite dev server)

Build/load extension in Chrome (MV3 unpacked)

Login in SPA

Confirm extension handshake + auth bundle propagation

Try draft creation + upload + mirror prefill trigger

14) Deployment readiness checklist (derived from code constraints)
14.1 Backend (Render)

Required env vars present (config/env.js)

CORS allowlist includes SPA domain(s)

Supabase URL/service key configured

storage bucket listing-images exists

Mirror Mode enabled (ENABLE_MIRROR_MODE)

eBay env vars configured if eBay features in use

confirm WS upgrade works on Render

14.2 Frontend (Vercel)

VITE_API_URL points to backend /api

VITE_WS_URL points to backend ws root

Supabase URL + anon key set

domain configured (your new app.resell.tailoredapproach.us)

14.3 Extension

manifest allowlists include new app domain

background patterns include new app domain

build output updated and repackaged

ensure “prod backend base” in extension matches actual deployment strategy
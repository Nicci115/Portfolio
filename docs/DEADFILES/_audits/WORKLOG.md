# WORKLOG

## Audit Scope
- Destination: `C:\Users\Owner\Projects\DominicPortfolio\docs\_audits\`
- Repos scanned:
  - `C:\Users\Owner\Projects\Tailored Approach Website`
  - `C:\Users\Owner\Projects\Facebook reply automation`
  - `C:\Users\Owner\Projects\New TA Website`
  - `C:\Users\Owner\Projects\non ai facebook reply`
  - `C:\Users\Owner\Projects\RealEstateCRM`
  - `C:\Users\Owner\Projects\RedDevilDetailing`
  - `C:\Users\Owner\Projects\Resell-Tool-master`

## Chronological Log
1. Verified all target paths and destination path existed using PowerShell `Test-Path` loop.
2. Ran initial recursive inventory pass; command timed out on first attempt due expensive full-content counting.
3. Switched to `rg --files` with explicit skip globs (`node_modules`, `dist`, `build`, `.next`, `.vercel`, `coverage`, `.git`, `outdated stuffs`, `tmp`, `.cache`, `logs`).
4. Collected per-repo file counts, top-level inventories, and extension/type distributions.
5. Computed normalized LOC estimates from text/code/doc extensions only (avoiding binary assets).
6. Performed repo-by-repo deep reads:
   - Tailored Approach Website: app routing, demo gate, constants, deployment config.
   - Facebook automation repos: all JS files + env risk review.
   - New TA Website: app routes, contact/system-map pages, serverless API handlers, transport/template logic, env files.
   - RealEstateCRM: API entry/middleware/routes/services, frontend auth/csrf flows, Supabase migrations, integration seams.
   - RedDevilDetailing: full static site assets and docs summary.
   - Resell Tool: backend/frontend/extension core files, auth/sync/mirror orchestration, env/migrations/tests evidence.
7. Drafted and wrote 7 individual project audits.
8. Drafted and wrote master ranking/copy/risk report.
9. Drafted and wrote this chronological worklog.

## Commands Used (High Level)
- Existence/preflight:
  - PowerShell loops with `Test-Path`, `Get-ChildItem`.
- Inventory and filtering:
  - `rg --files` with skip globs.
  - Extension counts via grouped file extensions.
- LOC estimation:
  - PowerShell line counts over filtered text files.
- Evidence extraction:
  - Numbered file reads via `Get-Content` + line numbering.
  - Targeted file lists for route/middleware/service/schema files.

## Scan Gaps / Errors
- One early inventory command timed out due over-broad recursive content scan including large trees; replaced with `rg`-based method.
- No builds/tests/servers were executed by design (read-only audit rule).
- Some repositories contain very large doc archives and legacy folders; evidence selection focused on active runtime entrypoints and key integration/security paths.

## Notable Discoveries Per Repo
### Tailored Approach Website
- Clear route segmentation with lazy-loaded demo and client-side password gate.
- Vercel static config present.
- Demo protection is frontend-only.

### Facebook reply automation
- Practical webhook + Discord approval queue design.
- Duplicate-comment guard in place.
- Plaintext keys/tokens present in `.env`.

### New TA Website
- Strong typed frontend + serverless email APIs.
- Industry-config-driven outcome logic reused across features.
- `.env` and `.env.local` contain sensitive SMTP/OIDC values.

### non ai facebook reply
- Minimal webhook responder with delayed comment logic.
- Hardcoded token also found in `subscribe.js`.
- No persistence/test structure.

### RealEstateCRM
- Broad multi-tenant architecture intent with middleware chain.
- Adapter pattern and Supabase migration history are meaningful portfolio evidence.
- Dependency/security drift signals (security middleware imported but not declared in package, fallback encryption key in code).

### RedDevilDetailing
- High polish static site with interaction detail and conversion pathways.
- Good for frontend craft presentation.
- No backend/system complexity.

### Resell-Tool-master
- Strongest architecture: backend orchestration + extension execution + frontend control plane.
- Mirror mode + websocket/SSE pathways are portfolio-differentiating.
- Includes tests/migrations and meaningful modularity.

## Why Each Repo Scored As It Did
- `Resell-Tool-master`: highest due multi-runtime architecture depth, modular services, and test/migration evidence.
- `RealEstateCRM`: high system breadth and tenancy/security design, reduced by drift/consistency risks.
- `New TA Website`: strong product polish + typed logic + serverless backend-lite pattern, reduced by secret hygiene and low test evidence.
- `RedDevilDetailing`: high UX/static execution quality; lower architecture depth by scope.
- `Tailored Approach Website`: good modular frontend baseline, reduced by minimal backend/security depth.
- `Facebook reply automation`: practical automation pattern but weak secret handling/durability.
- `non ai facebook reply`: minimal implementation with critical security hygiene issues and low robustness.

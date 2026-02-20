# Project Audit: Facebook Reply Automation

## A) Executive Snapshot
- What it is: Node/Express Facebook Page webhook responder with keyword matching and Discord-assisted approval flow.
- Entrypoints: `server.js` (runtime server), `subscribe.js` (Graph subscription), `discord_listener.js` (Discord bot listener).
- Primary stack: Node.js, Express, Axios, Discord bot client, Facebook Graph API.
- Deployment assumptions: Long-running Node process receiving Meta webhooks on `/webhook`.
- Maturity state: Prototype to partial production candidate; core loop implemented but config hygiene is unsafe.

## B) File Inventory
- Filtered file count (skip-rule applied): 7
- Estimated LOC (text/code/docs): 272
- Top file types: `.js` (7)
- Key config files:
  - `.env`
  - no lockfile/package manifest present in scanned root

### Tree (depth 6+ representative)
```text
Facebook reply automation/
  server.js
  intent_classifier.js
  discord_listener.js
  discord_bot.js
  tracking.js
  subscribe.js
  timer-test.js
```

## C) Architecture Map
- Subsystems:
  - Meta webhook ingress/verification (`GET/POST /webhook`).
  - Intent layer (`intent_classifier.js`) with buyer/seller/pending routing.
  - Discord human-in-the-loop channel for uncertain posts.
  - Delayed comment scheduler and duplicate-comment guard.
- Runtime topology: Single Node service + external APIs (Facebook + Discord).
- Data persistence: In-memory map (`pendingApprovals`) and in-memory dedupe set (`inProgressPosts`).

```text
Facebook Page Feed Webhook
  -> Express /webhook
     -> keyword match + age filter
     -> alreadyCommented check (Graph comments)
     -> classifyPost
        -> auto-post OR skip OR pending
           -> Discord webhook/bot for yes/no
  -> delayed comment post to Graph API
```

## D) Feature Extraction
- Core features:
  - Webhook verification handshake and feed event intake.
  - Keyword detection and one-hour freshness filter.
  - Existing-comment check to prevent duplicate posting.
  - Intent triage (buyer/seller/unclear).
  - Discord operator approvals (`yes {ref}` / `no {ref}`).
- Automation workflows:
  - Auto-comment on buyer intent.
  - Deferred timer-based posting.
- Integrations:
  - Facebook Graph API (`/{postId}/comments`, `/subscribed_apps`).
  - Discord webhook and Discord bot channel listener.
- Auth flows: Verify token-based webhook challenge; no user auth model.
- Background jobs/schedulers: `setTimeout` delayed comment scheduling.

## E) Evidence Snippets
### Feature: Webhook verification and event handling
Path: `server.js:34`
```js
app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  if (mode && token === VERIFY_TOKEN) res.status(200).send(challenge);
});
```

### Feature: Duplicate comment prevention + classification
Path: `server.js:73`
```js
const already = await alreadyCommented(postId);
if (!already) {
  const intent = await classifyPost(postMessage, matchedKeyword, postId);
  if (intent === 'post') delayComment(postId, comment);
}
```

### Feature: Human approval queue via Discord refs
Path: `intent_classifier.js:42`
```js
const ref = approvalCounter++;
pendingApprovals.set(ref, { postId, matchedKeyword, postMessage, postLink });
const msg = `[#${ref}] ... Reply: yes ${ref} / no ${ref}`;
```

## F) Engineering Signals
- Separation of concerns: Reasonable split between server, classifier, tracking, Discord listener.
- Reusable patterns: Shared classifier callback pattern used by bot/listener.
- Typed models/schemas: None.
- Error handling/logging: Console logs and try/catch around API calls; no structured logger.
- Security posture:
  - Webhook verify token exists.
  - Major risk: plaintext secrets in `.env` (API keys/tokens/webhook URLs).
  - No signature verification for webhook payload authenticity.
- Scalability constraints:
  - In-memory approval/dedupe state is not durable across restarts.
  - No queue persistence or retry strategy.

## G) Scoring (1–100)
- Architecture: 63
- Code Quality: 62
- Structure: 68
- Deployment Readiness: 54
- Security: 22
- UX Maturity: 40
- Documentation Quality: 28
- Maintainability: 57
- Test Readiness: 20
- Overall Portfolio Worthiness: 52

### Score Justification
- Strongest points: clear event-processing pipeline, practical human-in-the-loop fallback.
- Weakest points: exposed credentials and no durable state/test harness.

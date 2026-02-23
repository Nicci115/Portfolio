# Project Audit: Non AI Facebook Reply

## A) Executive Snapshot
- What it is: Simplified Facebook webhook auto-commenter with keyword matching and delayed posting.
- Entrypoints: `server.js`, plus utility scripts `subscribe.js`, `timer-test.js`.
- Primary stack: Node.js, Express, Axios.
- Deployment assumptions: Public webhook endpoint on `/webhook` bound to Meta Page subscription.
- Maturity state: Early prototype; narrower than the Discord-assisted variant.

## B) File Inventory
- Filtered file count (skip-rule applied): 5
- Estimated LOC (text/code/docs): 185
- Top file types: `.js` (5)
- Key config files:
  - `.env`

### Tree (depth 6+ representative)
```text
non ai facebook reply/
  server.js
  tracking.js
  subscribe.js
  intent_classifier.js
  timer-test.js
```

## C) Architecture Map
- Subsystems:
  - Webhook verify + feed processing.
  - Keyword matcher.
  - Existing-comment checker.
  - Timer-based delayed comment post.
- Runtime topology: Single Express process connected to Facebook Graph API.
- Data persistence: None; ephemeral memory only.

```text
Meta Feed Event
  -> /webhook
     -> age check + keyword match
     -> alreadyCommented(postId)
     -> delayComment()
     -> post Graph API comment
```

## D) Feature Extraction
- Core features:
  - Webhook challenge verification.
  - Feed change traversal and keyword filtering.
  - Deduplication via comment-history check.
  - Delayed posting mechanism.
- Automation workflows:
  - Auto-comment when keyword match is found.
- Integrations:
  - Facebook Graph API comments endpoint and subscribed-apps endpoint.
- Auth flows: Verify token check only.
- Background jobs/schedulers: `setTimeout` per matched post.

## E) Evidence Snippets
### Feature: Webhook challenge handling
Path: `server.js:21`
```js
app.get('/webhook', (req, res) => {
  if (mode && token === VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});
```

### Feature: Match + dedupe + delayed comment
Path: `server.js:52`
```js
const matchedKeyword = KEYWORDS.find(keyword => postMessage.includes(keyword));
const already = await alreadyCommented(postId);
if (!already) delayComment(postId, comment);
```

### Feature: Timer scheduler and comment action
Path: `server.js:101`
```js
setTimeout(() => {
  commentOnPost(postId, comment);
}, 15 * 1000);
```

## F) Engineering Signals
- Separation of concerns: Minimal but clear file-level split (`tracking`, `subscribe`, `server`).
- Reusable patterns: Limited.
- Typed models/schemas: None.
- Error handling/logging: Basic console logging + catch blocks.
- Security posture:
  - Major risk: plaintext API keys/tokens in `.env` and hardcoded token in `subscribe.js`.
  - No signature validation on webhook POST payload.
- Scalability constraints:
  - Stateless in-memory approach; no persistence/retry queue.
  - Single-process timer model can drift/fail on restarts.

## G) Scoring (1–100)
- Architecture: 52
- Code Quality: 55
- Structure: 58
- Deployment Readiness: 46
- Security: 18
- UX Maturity: 30
- Documentation Quality: 20
- Maintainability: 50
- Test Readiness: 15
- Overall Portfolio Worthiness: 43

### Score Justification
- Strongest points: practical webhook loop and dedupe check.
- Weakest points: severe secret exposure and no robustness layer for production operation.

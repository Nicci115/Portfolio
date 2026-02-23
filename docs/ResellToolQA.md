• ### 1) Chrome extension message architecture

  Commit: d022839c748f9880e211179382154856db09cdf4
  File: extension/src/types/mirror.ts:1
  Code:

  export interface MirrorAuthPayload {
    token: string;
    version: string;
    marketplaces: string[];
    clientType?: 'extension' | 'spa';
    installId?: string;
  }

  export interface MirrorMessage<T = any> {
    type: string;
    payload?: T;
    jobId?: string; // For messages related to specific jobs
    marketplace?: string; // For messages related to specific marketplaces
  }

  export interface MirrorConfirmActionPayload {
    jobId: string;
    action: 'prefill' | 'publish_confirmed' | 'inventory' | 'delist' |
  'media' | 'variant';
    marketplace: string;
    result: 'success' | 'awaiting_user_submit' | 'user_cancelled' | 'error';
    listingUrl?: string;
    notes?: string;
    errorCode?: string;
    message?: string;
  }

  export interface MirrorStatusPayload {
    entity: 'connection' | 'extension' | 'marketplace' | 'account' |
  'import';
    status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'panic'
  | 'idle' | 'prefill_in_progress' | 'pending_extension' |
  'awaiting_user_submit' | 'item_processed' | 'scan_requested';
    message?: string;
    marketplace?: string;
    version?: string;
    timestamp?: string;
    clientType?: 'spa' | 'extension';
    browserId?: string;
    heartbeatInterval?: number;
    clientTimeout?: number;
    serverTimeout?: number;
    actionTimeout?: number;
  }

  Runtime role: Shared message contract used by extension control-plane
  message producers/consumers.

  Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  File: extension/src/contentScripts/spaBridge.ts:17
  Code:

  window.addEventListener('message', async (event) => {
      if (event.source !== window) return;

      switch (event.data?.type) {
          case 'EXTENSION_PING':
              try {
                  const response = await chrome.runtime.sendMessage({ type:
  'EXTENSION_PING' });
                  if (response && response.success) {
                      window.postMessage({
                          type: 'EXTENSION_PONG',
                          payload: {
                              version: response.payload.version,
                              connected: true,
                              runId: response.payload.runId,
                              installId: response.payload.installId,
                              timestamp: Date.now(),
                              marketplaceStatuses:
  response.payload.marketplaceStatuses
                          },
                      }, '*');
                  }
              } catch (err: any) {
                  if (err.message?.includes('Extension context
  invalidated')) {
                      window.postMessage({ type: 'EXTENSION_ORPHANED' },
  '*');
                  }
              }
              break;

          case 'CROSSLISTER_MIRROR_TOKEN':
              const tokenData = event.data.payload;
              await chrome.runtime.sendMessage({
                  type: 'mirror-token',
                  data: tokenData
              });
              break;

          case 'AUTH_BUNDLE':
              await chrome.runtime.sendMessage({
                  type: 'AUTH_BUNDLE',
                  payload: event.data.payload,
              });
              break;
      }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      window.postMessage(message, '*');
  });

  Runtime role: Content-script bridge forwards SPA messages into background/
  runtime channels and relays background events back to page context.

  ### 2) Background script handling

  Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  File: extension/src/background/index.js:429
  Code:

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      if (message.type === 'AUTH_BUNDLE') {
        try {
          await handleAuthBundle(message.payload);
          sendResponse({ success: true });
        } catch {
          sendResponse({ success: false });
        }
        return;
      }

      if (message.type === 'mirror:confirm_action') {
        await handleConfirmAction(message.payload || message, sendResponse);
        return;
      }

      if (message.type === 'EXTENSION_ACQUIRE_LOCK') {
        const { id, ttl } = message.payload;
        acquireLock(id, ttl);
        sendResponse({ success: true, count: getLockCount() });
        return;
      }

      if (message.type === 'mirror:scan:next') {
        await handleScanNext(message.payload);
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'mirror:scan:complete') {
        await handleScanComplete(message.payload);
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'mirror:work:launch') {
        await handleWorkLaunch(message.payload);
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'mirror:work:complete') {
        try {
          await postMirror('/api/mirror/work/complete', message.payload);
          sendResponse({ success: true });
        } catch (err) {
          warn('Failed to post mirror:work:complete', err);
          sendResponse({ success: false });
        }
        return;
      }
    })();
    return true;
  });

  Runtime role: Service-worker control plane dispatches incoming runtime
  commands to per-action handlers and backend side effects.

  ### 3) WebSocket state sync implementation

  Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  File: crosslister-backend/services/mirrorMode/index.js:26
  Code:

  function createMirrorWebSocketServer() {
    if (!ENABLED) {
      logger.info('Mirror Mode disabled. Skipping WebSocket
  initialization.');
      return null;
    }

    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', (socket) => {
      let session = null;
      let authenticated = false;
      let heartbeatInterval = null;

      const handleAuth = async (message) => {
        const { token, version, marketplaces, clientType, installId } =
  message.payload || {};
        const claims = mirrorTokenService.verifyToken(token);
        const { sub: userId, accountId, browserId, sessionId } = claims;

        session = {
          id: sessionId,
          socket,
          userId,
          accountId,
          browserId,
          installId: installId || null,
          clientType: clientType === 'spa' ? 'spa' : 'extension',
          lastHeartbeat: Date.now(),
        };
        mirrorSessionManager.sessions.set(sessionId, session);

        await mirrorSessionManager.registerExtensionSession({
          userId, accountId, browserId, installId, version, marketplaces,
        });

        authenticated = true;
        socket.send(JSON.stringify({ type: 'mirror:connect', payload:
  { status: 'authenticated' } }));

        heartbeatInterval = setInterval(() => {
          const currentSession =
  mirrorSessionManager.sessions.get(sessionId);
          if (!currentSession) return socket.close(1011, 'Session
  terminated');
          if (Date.now() - currentSession.lastHeartbeat > SERVER_TIMEOUT_MS)
  {
            return socket.close(4408, 'Server timeout');
          }
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'mirror:heartbeat', payload:
  { timestamp: new Date().toISOString() } }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      socket.on('message', async (raw) => {
        const message = parseMessage(raw);
        if (!authenticated) {
          if (message.type === 'mirror:auth') await handleAuth(message);
          else socket.close(4401, 'Session not authenticated. Expected
  mirror:auth message.');
          return;
        }
        await mirrorSessionManager.handleEvent(session.id, message);
      });

      socket.on('close', (code, reason) => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (session) mirrorSessionManager.closeSession(session.id,
  reason.toString());
      });
    });

    return wss;
  }

  Runtime role: Backend sync plane owns socket authentication, heartbeat
  lifecycle, timeout reconciliation, and event handoff to session state
  manager.

  ### 4) Auth token handling strategy

  Commit: 180e49afb546d83be104b0c0688de60ba46fc4fa
  File: crosslister-backend/services/mirrorTokenService.js:44
  Code:

  async function replaceTokenRecord({
    sessionId,
    userId,
    browserId,
    refreshToken,
    accessToken,
    accountId,
  }) {
    if (accountId) {
      const { error: deleteError } = await supabase
        .from(TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .eq('browser_id', browserId);
      if (deleteError) throw new ApiError(`Failed to delete mirror token:
  ${deleteError.message}`, 500);
    }

    const payload = {
      session_id: sessionId,
      user_id: userId,
      account_id: accountId || null,
      browser_id: browserId,
      access_token_encrypted: Buffer.from(encryptJson({ accessToken }),
  'base64'),
      refresh_token_encrypted: Buffer.from(encryptJson({ refreshToken,
  accountId }), 'base64'),
      access_token_expires: new Date(Date.now() + ACCESS_EXPIRES_IN *
  1000).toISOString(),
      refresh_token_expires: new Date(Date.now() + REFRESH_EXPIRES_IN *
  1000).toISOString(),
      revoked: false,
    };

    const { error: insertError } = await
  supabase.from(TABLE).insert(payload);
    if (insertError) throw new ApiError(`Failed to store mirror token:
  ${insertError.message}`, 500);
  }

  async function issueToken({ sessionId, userId, accountId, browserId:
  providedBrowserId }) {
    const browserId = providedBrowserId || uuidv4();
    const refreshToken = uuidv4();
    const { token: accessToken, expiresIn } = buildAccessToken({ sessionId,
  userId, browserId, accountId });

    await replaceTokenRecord({ sessionId, userId, browserId, refreshToken,
  accessToken, accountId });

    return { sessionId, accessToken, refreshToken, browserId, expiresIn,
  refreshAt: Date.now() + REFRESH_SUGGEST_MS, refreshExpiresIn:
  REFRESH_EXPIRES_IN };
  }

  async function refreshToken({ sessionId, refreshToken, browserId,
  userId }) {
    const { data, error } = await supabase
      .from(TABLE).select('*')
      .eq('session_id', sessionId).eq('browser_id', browserId).eq('user_id',
  userId).maybeSingle();

    if (error || !data) throw new ApiError('Mirror token not found.', 404);
    if (data.revoked) throw new ApiError('Mirror token revoked.', 401);
    if (new Date(data.refresh_token_expires) < new Date()) throw new
  ApiError('Refresh token expired.', 401);

    const storedRefresh =
  decryptJson(decodeEncryptedField(data.refresh_token_encrypted));
    if (storedRefresh.refreshToken !== refreshToken) throw new
  ApiError('Invalid refresh token.', 401);

    const newRefresh = uuidv4();
    const { token: accessToken, expiresIn } = buildAccessToken({ sessionId,
  userId, browserId, accountId: storedRefresh.accountId });

    await upsertTokenRecord({
      sessionId, userId, browserId, refreshToken: newRefresh, accessToken,
  accountId: storedRefresh.accountId,
    });

    return { sessionId, accessToken, refreshToken: newRefresh, browserId,
  expiresIn, refreshAt: Date.now() + REFRESH_SUGGEST_MS, refreshExpiresIn:
  REFRESH_EXPIRES_IN };
  }

  function verifyToken(token) {
    const claims = jwt.verify(token, process.env.MIRROR_JWT_SECRET);
    return claims;
  }

  Runtime role: Backend token authority issues, encrypts/stores, refreshes,
  and verifies mirror auth material used by extension sessions.

  ### 5) Control plane vs execution plane separation proof

  Commit: 451cb29a7e652b33f95eafa51315005f9d367c51
  File: extension/src/background/commandRouter.ts:80
  Code:

  export async function routeCommand(command: MirrorMessage) {
    const { type, payload, jobId, marketplace } = command;
    log(`Routing command: ${type} for ${marketplace || 'N/A'}`);

    if (type === 'mirror:prefill') {
      await handlePrefillCommand(command);
      return;
    }

    let targetTabId: number | undefined;

    switch (type) {
      case 'mirror:inventory:scan':
      case 'mirror:delist':
        break;
      default:
        warn(`Unsupported command type: ${type}`);
        return;
    }

    targetTabId = command.payload?.tabId || await
  findTargetTab(marketplace);
    if (!targetTabId && marketplace) {
      const targetUrl = `https://${marketplace}.com`;
      const tab = await chrome.tabs.create({ url: targetUrl, active:
  true });
      targetTabId = tab.id;
    }

    if (!targetTabId) {
      warn(`No target tab found or created for ${marketplace}`);
      return;
    }

    const response = await chrome.tabs.sendMessage(targetTabId, command);
    if (response && !response.error) {
      send({ type: 'mirror:confirm_action', payload: { ...response, jobId:
  jobId!, marketplace: marketplace! } });
    }
  }

  Runtime role: Background control plane performs orchestration, target-tab
  resolution, and command dispatch without mutating page DOM.

  Commit: 5b745aa7e7324c45acbdf6603286772d1a904ece
  File: extension/src/marketplaces/poshmark/core/executor.ts:74
  Code:

  const runPrefillInitial = async () => {
      if (!currentPrefillData) return;

      if (currentPrefillData.title) {
          const el = await waitForField('title');
          if (el) {
              setElementValue(el, currentPrefillData.title);
              updateStep('Title', 'success');
          } else {
              updateStep('Title', 'error', 'Field not found (Assisted
  Mode)');
          }
      }

      if (currentPrefillData.description) {
          const el = await waitForField('description');
          if (el) {
              setElementValue(el, currentPrefillData.description);
              updateStep('Description', 'success');
          } else {
              updateStep('Description', 'error', 'Field not found (Assisted
  Mode)');
          }
      }

      currentViewState = 'PRICE_GATING';
      updateStep('Price', 'pending', 'Waiting for user action...');
      emitOverlayState();
  };

  const handleSuccess = (url: string) => {
      watcher?.stop();
      currentViewState = 'SUCCESS_CONFIRMED';

      chrome.runtime.sendMessage({
          type: 'mirror:confirm_action',
          jobId: currentJobId,
          action: 'prefill',
          marketplace: 'poshmark',
          result: 'success',
          listingUrl: url
      });
  };

  Runtime role: Execution plane content script mutates marketplace DOM and
  reports execution outcome back to control plane.

  ### 6) Backend coordination layer

  Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  File: crosslister-backend/services/syncJobTracker.js:32
  Code:

  async function createMirrorJob({
    accountId,
    userId,
    marketplace,
    action,
    listingDraftId = null,
    listingId = null,
    timeoutSeconds = 60,
    mirrorJobId = null,
  }) {
    const finalMirrorJobId = mirrorJobId || uuidv4();
    const timeoutAt = new Date(Date.now() + timeoutSeconds *
  1000).toISOString();

    jobStateManager.createJob({
      mirrorJobId: finalMirrorJobId,
      accountId,
      userId,
      marketplace,
      action,
    });

    const payload = {
      account_id: accountId,
      user_id: userId,
      job_type: 'mirror_mode',
      action,
      marketplace,
      mirror_job_id: finalMirrorJobId,
      status: MIRROR_JOB_STATUS.PENDING_EXTENSION,
      timeout_at: timeoutAt,
      listing_draft_id: listingDraftId,
      listing_id: listingId,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'listing_draft_id,marketplace' })
      .select()
      .single();

    if (error) throw new ApiError(`Failed to create mirror job:
  ${error.message}`, 500);
    return data;
  }

  async function assertOwnership({ jobId, mirrorJobId, browserId,
  installId }) {
    const targetJobId = mirrorJobId || jobId;
    try {
      return jobStateManager.assertOwnership(targetJobId, { browserId,
  installId });
    } catch {
      const match = buildMatchClause({ jobId, mirrorJobId });
      let query = supabase.from(TABLE).select('*').eq('owner_browser_id',
  browserId).eq('owner_install_id', installId);
      Object.keys(match).forEach(key => { query = query.eq(key,
  match[key]); });
      const { data } = await query.maybeSingle();
      if (!data) throw new ApiError('Ownership conflict', 403);
      return data;
    }
  }

  async function markJobRunning({
    jobId,
    mirrorJobId,
    ownerBrowserId,
    ownerInstallId,
    ownerTabId,
  }) {
    const match = buildMatchClause({ jobId, mirrorJobId });

    if (mirrorJobId) {
      jobStateManager.setOwnership(mirrorJobId, {
        browserId: ownerBrowserId,
        installId: ownerInstallId,
        tabId: ownerTabId
      });
    }

    const updatePayload = {
      status: MIRROR_JOB_STATUS.RUNNING,
      owner_browser_id: ownerBrowserId || null,
      owner_install_id: ownerInstallId || null,
      owner_tab_id: ownerTabId || null,
      updated_at: new Date().toISOString(),
    };

    let updateQ = supabase.from(TABLE).update(updatePayload);
    Object.keys(match).forEach(key => { updateQ = updateQ.eq(key,
  match[key]); });
    await updateQ;
  }

  Runtime role: Coordinator service creates jobs, records ownership, and
  advances job lifecycle state for mirror execution.

  ### 7) Mirror mode implementation details

  Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  File: crosslister-backend/services/mirrorMode/mirrorSessionManager.js:113
  Code:

  async handleEvent(sessionId, event) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found.');

    session.lastHeartbeat = Date.now();
    if (session.clientType !== 'spa') {
      await this.updateExtensionHeartbeat({
        accountId: session.accountId,
        browserId: session.browserId,
      });
    }

    switch (event.type) {
      case 'mirror:ack:prefill': {
        const { jobId, browserId, installId, tabId } = event;
        if (!jobId || !browserId || !installId) return;
        await syncJobTracker.markJobRunning({
          mirrorJobId: jobId,
          ownerBrowserId: browserId,
          ownerInstallId: installId,
          ownerTabId: tabId || null,
        });
        return;
      }

      case 'mirror:heartbeat': {
        const { jobId, browserId, installId } = event.payload || event;
        if (!jobId) return;
        await syncJobTracker.recordHeartbeat({
          mirrorJobId: jobId,
          browserId: browserId || session.browserId,
          installId: installId || session.installId,
        });
        return;
      }

      case 'mirror:close':
        this.closeSession(sessionId, 'Client closed session');
        return;

      case MIRROR_EVENT_TYPES.STATUS: {
        const statusPayload = event.payload || {};
        if (statusPayload.entity === 'extension' && statusPayload.version) {
          session.extensionVersion = statusPayload.version;
          await this.updateExtensionHeartbeat({
            accountId: session.accountId,
            browserId: session.browserId,
          });
          return;
        }
        break;
      }

      default:
        await this.broadcastToHandlers(session, event);
    }
  }

  Runtime role: Mirror protocol handler applies event-type transitions that
  update session presence and job ownership/running state.

  ### 8) Error handling and reconnection logic

  Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  File: extension/src/background/connectionManager.ts:38
  Code:

  function scheduleReconnect() {
    if (reconnectTimeout || !options) return;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts),
  MAX_RECONNECT_DELAY);
    reconnectAttempts++;

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect(options!);
    }, delay);
  }

  socket.onclose = (evt) => {
    clearTimers();
    authPending = false;

    if (evt.code === 4001 || evt.reason.includes('panic')) {
      options?.onPanic();
      return;
    }

    if (evt.code === 4401 || evt.reason.includes('Authentication failed') ||
  evt.reason.includes('Missing token')) {
      options?.onAuthFailure();
      return;
    }

    if (isAuthenticated) {
      scheduleReconnect();
    } else {
      options?.onAuthFailure();
    }

    isAuthenticated = false;
  };

  async function handleTokenExpired() {
    clearTimers();
    disconnect();

    const newToken = await refreshAccessToken();
    if (newToken && options) {
      connect(options);
    } else {
      options?.onAuthFailure();
    }
  }

  Runtime role: Client-side socket manager handles disconnect classes, retry
  backoff, and token-expiry reconnect flow.

  Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  File: extension/src/background/index.js:2533
  Code:

  async function triggerReplayRequest() {
    const queue = await getReplayQueue();
    if (!queue.length) return;
    const jobIds = queue.map((q) => q.jobId);
    send({
      type: 'mirror:replay_request',
      payload: {
        jobIds,
        browserId: INSTALL_ID,
        installId: INSTALL_ID,
      },
    });
  }

  Runtime role: Recovery path requests replay of queued jobs after reconnect
  or worker lifecycle interruptions.

  ### 9) Anti-duplication safeguards

  Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  File: crosslister-backend/controllers/mirrorEventsController.js:485
  Code:

  if (completedScanIds.has(payload.scanId)) {
    console.info('[mirror.scan.complete] idempotent', { scanId:
  payload.scanId });
    return res.json({ ok: true, idempotent: true });
  }
  completedScanIds.add(payload.scanId);

  if (importRun.completed_at || importRun.status === 'completed') {
    return res.json({ ok: true, idempotent: true });
  }

  const skuSet = new Set(existingDrafts?.map(d => d.sku).filter(Boolean));
  const hashSet = new Set(existingDrafts?.map(d =>
  d.content_hash).filter(Boolean));
  const externalIdSet = new Set(existingLinks?.map(l =>
  l.external_id).filter(Boolean));
  const urlSet = new Set(existingLinks?.map(l =>
  l.listing_url).filter(Boolean));

  let skipReason = null;
  if (sku && skuSet.has(sku)) skipReason = 'duplicate_sku';
  else if (externalId && externalIdSet.has(externalId)) skipReason =
  'duplicate_external_id';
  else if (listingUrl && urlSet.has(listingUrl)) skipReason =
  'duplicate_url';
  else if (hashSet.has(contentHash)) skipReason = 'duplicate_hash';

  Runtime role: Backend enforces idempotency and set-based dedupe before
  persistence.

  Commit: 68c5979567e319daab2b239f98bea3238487fbe5
  File: crosslister-backend/supabase/
  migrations/9999_schema_reconciliation.sql:6
  Code:

  ALTER TABLE public.marketplace_sync_jobs
  ADD CONSTRAINT unique_account_mirror_job UNIQUE(account_id,
  mirror_job_id);

  Runtime role: Database uniqueness constraint prevents duplicate mirror job
  identity per account.


  ## RUN 2 QA

  • - Section: Message protocol completeness
  - Claim: Backend mirror protocol type inventory is centrally declared in
    MIRROR_EVENT_TYPES with mirror:* plus control events.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/services/mirrorMode/eventTypes.js:2-27
  - Snippet:

  const MIRROR_EVENT_TYPES = {
    INIT: 'mirror:init',
    CONNECT: 'mirror:connect',
    AUTH: 'mirror:auth',
    STATUS: 'mirror:status',
    PREFILL: 'mirror:prefill',
    CONFIRM_ACTION: 'mirror:confirm_action',
    INVENTORY_SCAN: 'mirror:inventory:scan',
    INVENTORY_ITEM: 'mirror:inventory:item',

    // Inventory scanning events
    SCAN_NEXT: 'mirror:scan:next',
    SCAN_STOP: 'mirror:scan:stop',
    SCAN_BATCH: 'mirror:scan:batch',
    SCAN_PROGRESS: 'mirror:scan:progress',
    SCAN_COMPLETE: 'mirror:scan:complete',
    SCAN_ERROR: 'mirror:scan:error',

    DELIST: 'mirror:delist',
    ERROR: 'mirror:error',
    FIELD_CHANGE: 'fieldChange',
    TOGGLE_MARKETPLACE: 'toggleMarketplace',
    SUBMIT: 'submit',
    CLOSE: 'mirror:close',
    HEARTBEAT: 'heartbeat',
  };

  - Verify commands:
  - rg "MIRROR_EVENT_TYPES" -n crosslister-backend/services/mirrorMode/
    eventTypes.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    services/mirrorMode/eventTypes.js
  - Section: Message protocol completeness
  - Claim: Extension-side message contracts define auth/status/confirm
    payload schemas used across runtime and websocket handlers.
  - Commit: d022839c748f9880e211179382154856db09cdf4
  - File: extension/src/types/mirror.ts:1-45
  - Snippet:

  export interface MirrorAuthPayload {
    token: string;
    version: string;
    marketplaces: string[];
    clientType?: 'extension' | 'spa';
    installId?: string;
  }

  export interface MirrorMessage<T = any> {
    type: string;
    payload?: T;
    jobId?: string; // For messages related to specific jobs
    marketplace?: string; // For messages related to specific marketplaces
  }

  export interface MirrorConfirmActionPayload {
    jobId: string;
    action: 'prefill' | 'publish_confirmed' | 'inventory' | 'delist' |
  'media' | 'variant';
    marketplace: string;
    result: 'success' | 'awaiting_user_submit' | 'user_cancelled' | 'error';
    listingUrl?: string;
    notes?: string;
    errorCode?: string; // For specific error codes like SELECTOR_NOT_FOUND
    message?: string; // For general error messages
  }

  export interface MirrorStatusPayload {
    entity: 'connection' | 'extension' | 'marketplace' | 'account' |
  'import';
    status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'panic'
  | 'idle' | 'prefill_in_progress' | 'pending_extension' |
  'awaiting_user_submit' | 'item_processed' | 'scan_requested';
    message?: string;
    marketplace?: string;
    version?: string; // For extension status
    timestamp?: string;
    clientType?: 'spa' | 'extension';
    browserId?: string;
    heartbeatInterval?: number;
    clientTimeout?: number;
    serverTimeout?: number;
    actionTimeout?: number;
  }

  - Verify commands:
  - rg "export interface Mirror" -n extension/src/types/mirror.ts
  - git show d022839c748f9880e211179382154856db09cdf4:extension/src/types/
    mirror.ts
  - Section: Message protocol completeness
  - Claim: SPA-to-extension bridge forwards auth, scan, launch, attach, and
    lock commands into background runtime message handling.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: extension/src/contentScripts/spaBridge.ts:50-59
  - Snippet:

  case 'CROSSLISTER_MIRROR_TOKEN':
      console.log('[Crosslister Extension] Received token bundle from SPA');
      const tokenData = event.data.payload;

      try {
          // Forward to background script
          const response = await chrome.runtime.sendMessage({
              type: 'mirror-token',
              data: tokenData
          });

  - Verify commands:
  - rg "CROSSLISTER_MIRROR_TOKEN|mirror-token" -n extension/src/
    contentScripts/spaBridge.ts
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/
    contentScripts/spaBridge.ts
  - Section: Message protocol completeness
  - Claim: Bridge also forwards mirror scan/work and extension lock control
    message types.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: extension/src/contentScripts/spaBridge.ts:116-186
  - Snippet:

  case 'mirror:scan:next':
      await chrome.runtime.sendMessage({
          type: 'mirror:scan:next',
          payload: event.data.payload,
      });
      break;

  case 'mirror:scan:stop':
      await chrome.runtime.sendMessage({
          type: 'mirror:scan:stop',
          payload: event.data.payload,
      });
      break;

  case 'mirror:work:launch':
      await chrome.runtime.sendMessage({
          type: 'mirror:work:launch',
          payload: event.data.payload,
      });
      break;

  case 'mirror:scan:launch':
      await chrome.runtime.sendMessage({
          type: 'mirror:scan:launch',
          payload: event.data.payload,
      });
      break;

  case 'ATTACH_JOB_TO_TAB':
      await chrome.runtime.sendMessage({
          type: 'ATTACH_JOB_TO_TAB',
          payload: event.data.payload,
      });
      break;

  case 'EXTENSION_ACQUIRE_LOCK':
      chrome.runtime.sendMessage(event.data).catch(() => { });
      break;

  case 'EXTENSION_RELEASE_LOCK':
      chrome.runtime.sendMessage(event.data).catch(() => { });
      break;

  - Verify commands:
  - rg "mirror:scan:next|mirror:work:launch|EXTENSION_ACQUIRE_LOCK|
    EXTENSION_RELEASE_LOCK" -n extension/src/contentScripts/spaBridge.ts
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/
    contentScripts/spaBridge.ts
  - Section: Message protocol completeness
  - Claim: Background explicitly handles mirror-token from internal and
    external callers.
  - Commit: c035a8f40a8943ad51c605d1d5830d20917965aa
  - File: extension/src/background/messaging.js:3-18
  - Snippet:

  const handleMirrorToken = (message, sendResponse) => {
    if (message.type !== 'mirror-token') return false;
    // Persist tokens from either internal (popup/content) or external (SPA)
  callers.
    saveTokens(message.data).then(() => sendResponse({ ok: true }));
    return true; // keep message channel open for async response
  };

  // Internal messages (popup/content scripts/background)
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    return handleMirrorToken(message, sendResponse);
  });

  // External messages (web app via
  chrome.runtime.sendMessage(extensionId, ...))
  chrome.runtime.onMessageExternal.addListener((message, _sender,
  sendResponse) => {
    return handleMirrorToken(message, sendResponse);
  });

  - Verify commands:
  - rg "handleMirrorToken|onMessageExternal|mirror-token" -n extension/src/
    background/messaging.js
  - git show c035a8f40a8943ad51c605d1d5830d20917965aa:extension/src/
    background/messaging.js
  - Section: Message protocol completeness
  - Claim: Background runtime dispatch handles auth, confirm, lock, scan,
    and work command families.
  - Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  - File: extension/src/background/index.js:429-604
  - Snippet:

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      if (message.type === 'AUTH_BUNDLE') {
        try {
          await handleAuthBundle(message.payload);
          sendResponse({ success: true });
        } catch {
          sendResponse({ success: false });
        }
        return;
      }

      if (message.type === 'mirror:confirm_action') {
        await handleConfirmAction(message.payload || message, sendResponse);
        return;
      }

      if (message.type === 'EXTENSION_ACQUIRE_LOCK') {
        const { id, ttl } = message.payload;
        acquireLock(id, ttl);
        sendResponse({ success: true, count: getLockCount() });
        return;
      }

      if (message.type === 'EXTENSION_RELEASE_LOCK') {
        const { id } = message.payload;
        releaseLock(id);
        sendResponse({ success: true, count: getLockCount() });
        return;
      }

      if (message.type === 'mirror:scan:next') {
        await handleScanNext(message.payload);
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'mirror:scan:complete') {
        await handleScanComplete(message.payload);
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'mirror:work:launch') {
        await handleWorkLaunch(message.payload);
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'mirror:work:complete') {
        try {
          await postMirror('/api/mirror/work/complete', message.payload);
          sendResponse({ success: true });
        } catch (err) {
          warn('Failed to post mirror:work:complete', err);
          sendResponse({ success: false });
        }
        return;
      }
    })();
    return true;
  });

  - Verify commands:
  - rg "chrome.runtime.onMessage.addListener|EXTENSION_ACQUIRE_LOCK|
    mirror:scan:complete|mirror:work:complete" -n extension/src/background/
    index.js
  - git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/
    background/index.js
  - Section: Message protocol completeness
  - Claim: Background websocket ingress handles mirror:* server events and
    routes execution commands into command router.
  - Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  - File: extension/src/background/index.js:306-376
  - Snippet:

  const handleIncomingMirrorMessage = async (message) => {
    switch (message.type) {
      case 'mirror:connect':
        log('WebSocket connected and authenticated by server.');
        try {
          const manifest = chrome.runtime.getManifest();
          send({
            type: 'mirror:status',
            payload: {
              entity: 'extension',
              version: manifest.version,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (err) {
          warn('Failed to send extension status after connect', err);
        }
        const buffered = await getBufferedResults();
        for (const result of buffered) {
          send(result);
        }
        await clearBufferedResults();
        break;

      case 'mirror:status':
        const statusPayload = message.payload;
        if (statusPayload?.entity === 'account' && statusPayload.status ===
  'panic') {
          warn('Received account-level panic from server.');
          notify({ severity: 'error', code: 'PANIC', message: 'Panic mode
  active for this account.' });
          disconnect();
        } else if (statusPayload?.entity === 'connection' &&
  statusPayload.clientType === 'extension') {
          log('Received heartbeat from server.');
        }
        break;

      case 'mirror:heartbeat':
        send({ type: 'mirror:heartbeat', payload: { timestamp: new
  Date().toISOString() } });
        break;

      case 'mirror:prefill': {
        await handlePrefillMessage(message);
        break;
      }
      case 'mirror:delist':
      case 'mirror:media':
      case 'mirror:variant':
        await routeCommand(message);
        break;

      case 'mirror:error':
        warn('Received error from server', message);
        break;
    }
  };

  - Verify commands:
  - rg "handleIncomingMirrorMessage|case 'mirror:connect'|case
    'mirror:prefill'|case 'mirror:error'" -n extension/src/background/
    index.js
  - git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/
    background/index.js
  - Section: Message protocol completeness
  - Claim: Backend HTTP mirror routes wire token, confirm, bind, terminal,
    scan, and work endpoints.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/routes/mirror.js:10-41
  - Snippet:

  router.post('/token', verifyAuth, mirrorController.issueToken);
  router.post('/token/refresh', mirrorController.refreshToken);
  router.post('/token/revoke', verifyAuth, mirrorController.revokeToken);

  router.post('/events/confirm', verifyConfirmAuth,
  mirrorEventsController.confirmAction);
  router.post('/events/bind', verifyMirrorAuth,
  mirrorEventsController.bindJobOwner);
  router.post('/events/terminal', verifyMirrorAuth,
  mirrorEventsController.terminalAction);
  router.post('/scan/complete', verifyMirrorAuth,
  mirrorEventsController.scanComplete);
  router.post('/work/complete', verifyMirrorAuth,
  mirrorEventsController.workComplete);
  router.post('/import/start', verifyAuth,
  mirrorEventsController.startImport);
  router.post('/prefill/enqueue', verifyAuth,
  mirrorEventsController.enqueuePrefill);

  - Verify commands:
  - rg "router.post\\('/token'|router.post\\('/events/bind'|router.post\\('/
    events/terminal'|router.post\\('/scan/complete'" -n crosslister-backend/
    routes/mirror.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    routes/mirror.js
  - Section: Control-plane vs execution-plane boundary proof
  - Claim: Control plane selects tabs, dispatches commands, and sends
    confirm payloads without performing DOM writes.
  - Commit: 451cb29a7e652b33f95eafa51315005f9d367c51
  - File: extension/src/background/commandRouter.ts:80-117
  - Snippet:

  export async function routeCommand(command: MirrorMessage) {
    const { type, payload, jobId, marketplace } = command;
    log(`Routing command: ${type} for ${marketplace || 'N/A'}`);

    if (type === 'mirror:prefill') {
      await handlePrefillCommand(command);
      return;
    }

    let targetTabId: number | undefined;

    switch (type) {
      case 'mirror:inventory:scan':
      case 'mirror:delist':
        break;
      default:
        warn(`Unsupported command type: ${type}`);
        return;
    }

    targetTabId = command.payload?.tabId || await
  findTargetTab(marketplace);
    if (!targetTabId && marketplace) {
      const targetUrl = `https://${marketplace}.com`;
      const tab = await chrome.tabs.create({ url: targetUrl, active:
  true });
      targetTabId = tab.id;
    }

    if (!targetTabId) {
      warn(`No target tab found or created for ${marketplace}`);
      return;
    }

    const response = await chrome.tabs.sendMessage(targetTabId, command);
    if (response && !response.error) {
      send({ type: 'mirror:confirm_action', payload: { ...response, jobId:
  jobId!, marketplace: marketplace! } });
    }
  }

  - Verify commands:
  - rg "export async function routeCommand|chrome.tabs.sendMessage|
    mirror:confirm_action" -n extension/src/background/commandRouter.ts
  - git show 451cb29a7e652b33f95eafa51315005f9d367c51:extension/src/
    background/commandRouter.ts
  - Section: Control-plane vs execution-plane boundary proof
  - Claim: Execution plane performs marketplace DOM mutation via selector
    resolution and value setting.
  - Commit: 5b745aa7e7324c45acbdf6603286772d1a904ece
  - File: extension/src/marketplaces/poshmark/core/executor.ts:74-111
  - Snippet:

  const runPrefillInitial = async () => {
      console.log('[PoshmarkPrefill] Starting Phase 1 (Safe Fields)...');
      if (!currentPrefillData) return;

      // Title
      if (currentPrefillData.title) {
          updateStep('Title', 'pending', 'Waiting for field...');
          const el = await waitForField('title');
          if (el) {
              setElementValue(el, currentPrefillData.title);
              updateStep('Title', 'success');
          } else {
              updateStep('Title', 'error', 'Field not found (Assisted
  Mode)');
          }
      } else {
          updateStep('Title', 'warning', 'No title provided.');
      }

      // Description
      if (currentPrefillData.description) {
          updateStep('Description', 'pending', 'Waiting for field...');
          const el = await waitForField('description');
          if (el) {
              setElementValue(el, currentPrefillData.description);
              updateStep('Description', 'success');
          } else {
              updateStep('Description', 'error', 'Field not found (Assisted
  Mode)');
          }
      } else {
          updateStep('Description', 'warning', 'No description provided.');
      }

      currentViewState = 'PRICE_GATING';
      updateStep('Price', 'pending', 'Waiting for user action...');
      emitOverlayState();
  };

  - Verify commands:
  - rg "runPrefillInitial|setElementValue|waitForField" -n extension/src/
    marketplaces/poshmark/core/executor.ts
  - git show 5b745aa7e7324c45acbdf6603286772d1a904ece:extension/src/
    marketplaces/poshmark/core/executor.ts
  - Section: Control-plane vs execution-plane boundary proof
  - Claim: Execution plane reports outcomes back to control plane through
    mirror:confirm_action.
  - Commit: 5b745aa7e7324c45acbdf6603286772d1a904ece
  - File: extension/src/marketplaces/poshmark/core/executor.ts:187-201
  - Snippet:

  const handleSuccess = (url: string) => {
      console.log('[Poshmark] Success detected:', url);
      watcher?.stop();
      currentViewState = 'SUCCESS_CONFIRMED';

      chrome.runtime.sendMessage({
          type: 'mirror:confirm_action',
          jobId: currentJobId,
          action: 'prefill',
          marketplace: 'poshmark',
          result: 'success',
          listingUrl: url
      });
      sendProgress('submit', 'success', true);
      emitOverlayState();
  };

  - Verify commands:
  - rg "handleSuccess|mirror:confirm_action|listingUrl" -n extension/src/
    marketplaces/poshmark/core/executor.ts
  - git show 5b745aa7e7324c45acbdf6603286772d1a904ece:extension/src/
    marketplaces/poshmark/core/executor.ts
  - Section: Realtime coordination internals
  - Claim: Backend websocket server enforces mirror auth handshake, periodic
    heartbeat, timeout close, and authenticated event forwarding.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/services/mirrorMode/index.js:50-163
  - Snippet:

  const handleAuth = async (message) => {
    const { token, version, marketplaces, clientType, installId } =
  message.payload || {};
    if (!token) {
      return closeWithReason(4401, 'Missing token in auth payload.');
    }

    const claims = mirrorTokenService.verifyToken(token);
    const { sub: userId, accountId, browserId, sessionId } = claims;

    if (!userId || !accountId || !browserId || !sessionId) {
      return closeWithReason(4401, 'Invalid token claims.');
    }

    session = {
      id: sessionId,
      socket,
      userId,
      accountId,
      browserId,
      installId: installId || null,
      clientType: resolvedClientType,
      lastHeartbeat: Date.now(),
    };
    mirrorSessionManager.sessions.set(sessionId, session);

    authenticated = true;
    socket.send(JSON.stringify({ type: 'mirror:connect', payload: { status:
  'authenticated' } }));

    heartbeatInterval = setInterval(() => {
      const currentSession = mirrorSessionManager.sessions.get(sessionId);
      if (!currentSession) {
        return closeWithReason(1011, 'Session terminated');
      }
      if (Date.now() - currentSession.lastHeartbeat > SERVER_TIMEOUT_MS) {
        logger.warn({ sessionId }, 'Mirror session server timeout');
        return closeWithReason(4408, 'Server timeout');
      }
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'mirror:heartbeat', payload:
  { timestamp: new Date().toISOString() } }));
      }
    }, HEARTBEAT_INTERVAL);
  };

  socket.on('message', async (raw) => {
    const message = parseMessage(raw);
    if (!authenticated) {
      if (message.type === 'mirror:auth') {
        await handleAuth(message);
      } else {
        closeWithReason(4401, 'Session not authenticated. Expected
  mirror:auth message.');
      }
      return;
    }

    await mirrorSessionManager.handleEvent(session.id, message);
  });

  socket.on('close', (code, reason) => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (session) {
      mirrorSessionManager.closeSession(session.id, reason.toString());
    }
  });

  - Verify commands:
  - rg "handleAuth|SERVER_TIMEOUT_MS|socket.on\\('message'|socket.on\
    \('close'" -n crosslister-backend/services/mirrorMode/index.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    services/mirrorMode/index.js
  - Section: Realtime coordination internals
  - Claim: Session manager transition logic processes mirror:ack:prefill,
    mirror:heartbeat, mirror:close, and status events.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/services/mirrorMode/
    mirrorSessionManager.js:126-181
  - Snippet:

  switch (event.type) {
    case 'mirror:ack:prefill': {
      const { jobId, browserId, installId, tabId } = event;
      if (!jobId || !browserId || !installId) {
        logger.warn({ event }, 'Invalid mirror:ack:prefill payload');
        return;
      }
      await syncJobTracker.markJobRunning({
        mirrorJobId: jobId,
        ownerBrowserId: browserId,
        ownerInstallId: installId,
        ownerTabId: tabId || null,
      });
      return;
    }
    case 'mirror:heartbeat': {
      const { jobId, browserId, installId } = event.payload || event;
      if (!jobId) return;
      await syncJobTracker.recordHeartbeat({
        mirrorJobId: jobId,
        browserId: browserId || session.browserId,
        installId: installId || session.installId,
      });
      return;
    }
    case 'mirror:close':
      this.closeSession(sessionId, 'Client closed session');
      return;
    case MIRROR_EVENT_TYPES.STATUS: {
      const statusPayload = event.payload || {};
      if (statusPayload.entity === 'extension' && statusPayload.version) {
        session.extensionVersion = statusPayload.version;
        await this.updateExtensionHeartbeat({
          accountId: session.accountId,
          browserId: session.browserId,
        });
        return;
      }
      break;
    }
  }

  - Verify commands:
  - rg "case 'mirror:ack:prefill'|case 'mirror:heartbeat'|case
    'mirror:close'|MIRROR_EVENT_TYPES.STATUS" -n crosslister-backend/
    services/mirrorMode/mirrorSessionManager.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    services/mirrorMode/mirrorSessionManager.js
  - Section: Realtime coordination internals
  - Claim: Job ownership transitions set owner browser/install/tab and
    enforce ownership conflict checks.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/services/syncJobTracker.js:348-383
  - Snippet:

  async function assertOwnership({
    jobId,
    mirrorJobId,
    browserId,
    installId,
  }) {
    if (!browserId || !installId) {
      throw new ApiError('Missing ownership identifiers.', 403);
    }

    const targetJobId = mirrorJobId || jobId;

    // Try memory first
    try {
      const owner = jobStateManager.assertOwnership(targetJobId,
  { browserId, installId });
      return owner; // Success, no DB read needed
    } catch (memErr) {
      // Fallback to DB
      const match = buildMatchClause({ jobId, mirrorJobId });
      let query = supabase
          .from(TABLE)
          .select('*')
          .eq('owner_browser_id', browserId)
          .eq('owner_install_id', installId);
      Object.keys(match).forEach(key => {
          query = query.eq(key, match[key]);
      });
      const { data, error } = await query.maybeSingle();
      if (error) {
          throw new ApiError(`Failed to verify ownership: ${error.message}`,
  500);
      }
      if (!data) {
          throw new ApiError('Ownership conflict', 403);
      }
      return data;
    }
  }

  - Verify commands:
  - rg "assertOwnership|owner_browser_id|owner_install_id|Ownership
    conflict" -n crosslister-backend/services/syncJobTracker.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    services/syncJobTracker.js
  - Section: Realtime coordination internals
  - Claim: Running-state transition writes ownership metadata at bind/ack
    time.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/services/syncJobTracker.js:393-436
  - Snippet:

  async function markJobRunning({
    jobId,
    mirrorJobId,
    bullmqJobId,
    ownerBrowserId,
    ownerInstallId,
    ownerTabId,
  }) {
    const match = buildMatchClause({ jobId, mirrorJobId });

    if (mirrorJobId) {
        jobStateManager.setOwnership(mirrorJobId, {
            browserId: ownerBrowserId,
            installId: ownerInstallId,
            tabId: ownerTabId
        });
    }

    const updatePayload = {
      status: MIRROR_JOB_STATUS.RUNNING, // Using new status here
      attempts: attempt,
      started_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      owned_at: new Date().toISOString(),
      owner_browser_id: ownerBrowserId || null,
      owner_install_id: ownerInstallId || null,
      owner_tab_id: ownerTabId || null,
      updated_at: new Date().toISOString(),
    };

  - Verify commands:
  - rg "markJobRunning|setOwnership|owner_browser_id|owner_install_id|
    owner_tab_id" -n crosslister-backend/services/syncJobTracker.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    services/syncJobTracker.js
  - Section: Auth lifecycle proof
  - Claim: Mirror token endpoints issue/refresh/revoke and perform
    opportunistic cleanup before token operations.
  - Commit: 180e49afb546d83be104b0c0688de60ba46fc4fa
  - File: crosslister-backend/controllers/mirrorController.js:6-73
  - Snippet:

  async function issueToken(req, res, next) {
    const { sessionId, installId } = req.body || {};
    if (!sessionId) {
      throw new ApiError('sessionId is required.', 400);
    }

    // Opportunistic token cleanup
    await cleanupExpiredTokens();

    const payload = await mirrorTokenService.issueToken({
      sessionId,
      userId: req.user.id,
      accountId: req.tenant.account_id,
      browserId: installId
    });
    res.status(201).json(payload);
  }

  async function refreshToken(req, res, next) {
    const {
      sessionId, refreshToken, browserId, userId: bodyUserId,
    } = req.body || {};
    const userId = bodyUserId || req.user?.id || req.tenant?.user_id;

    if (!sessionId || !refreshToken || !browserId || !userId) {
      throw new ApiError('sessionId, refreshToken, browserId, and userId are
  required.', 400);
    }

    await cleanupExpiredTokens();

    const payload = await mirrorTokenService.refreshToken({
      sessionId,
      refreshToken,
      browserId,
      userId,
    });
    res.json(payload);
  }

  async function revokeToken(req, res, next) {
    const { sessionId } = req.body || {};
    if (!sessionId) {
      throw new ApiError('sessionId is required.', 400);
    }

    await cleanupExpiredTokens();

    await mirrorTokenService.revokeTokens(sessionId, req.user.id);
    res.status(204).end();
  }

  - Verify commands:
  - rg "async function issueToken|async function refreshToken|async function
    revokeToken|cleanupExpiredTokens" -n crosslister-backend/controllers/
    mirrorController.js
  - git show 180e49afb546d83be104b0c0688de60ba46fc4fa:crosslister-backend/
    controllers/mirrorController.js
  - Section: Auth lifecycle proof
  - Claim: Token service encrypts stored token material, validates refresh
    token state, and verifies JWT claims.
  - Commit: 180e49afb546d83be104b0c0688de60ba46fc4fa
  - File: crosslister-backend/services/mirrorTokenService.js:44-80
  - Snippet:

  async function replaceTokenRecord({
    sessionId,
    userId,
    browserId,
    refreshToken,
    accessToken,
    accountId,
  }) {
    if (accountId) {
      const { error: deleteError } = await supabase
        .from(TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .eq('browser_id', browserId);
      if (deleteError) {
        throw new ApiError(`Failed to delete mirror token:
  ${deleteError.message}`, 500);
      }
    }
    const payload = {
      session_id: sessionId,
      user_id: userId,
      account_id: accountId || null,
      browser_id: browserId,
      access_token_encrypted: Buffer.from(encryptJson({ accessToken }),
  'base64'),
      refresh_token_encrypted: Buffer.from(encryptJson({ refreshToken,
  accountId }), 'base64'),
      access_token_expires: new Date(Date.now() + ACCESS_EXPIRES_IN *
  1000).toISOString(),
      refresh_token_expires: new Date(Date.now() + REFRESH_EXPIRES_IN *
  1000).toISOString(),
      revoked: false,
    };

  - Verify commands:
  - rg "replaceTokenRecord|encryptJson|access_token_encrypted|
    refresh_token_encrypted" -n crosslister-backend/services/
    mirrorTokenService.js
  - git show 180e49afb546d83be104b0c0688de60ba46fc4fa:crosslister-backend/
    services/mirrorTokenService.js
  - Section: Auth lifecycle proof
  - Claim: Refresh verifies DB token state and refresh secret, then rotates
    both refresh and access tokens.
  - Commit: 180e49afb546d83be104b0c0688de60ba46fc4fa
  - File: crosslister-backend/services/mirrorTokenService.js:124-180
  - Snippet:

  async function refreshToken({
    sessionId,
    refreshToken,
    browserId,
    userId,
  }) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('session_id', sessionId)
      .eq('browser_id', browserId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      throw new ApiError('Mirror token not found.', 404);
    }
    if (data.revoked) {
      throw new ApiError('Mirror token revoked.', 401);
    }
    if (new Date(data.refresh_token_expires) < new Date()) {
      throw new ApiError('Refresh token expired.', 401);
    }
    let storedRefresh;
    try {
      storedRefresh =
  decryptJson(decodeEncryptedField(data.refresh_token_encrypted));
    } catch (err) {
      await clearTokensForInstall({ userId, accountId: data.account_id,
  browserId });
      throw new ApiError('Mirror token corrupted. Please reauthenticate.',
  401);
    }
    if (storedRefresh.refreshToken !== refreshToken) {
      throw new ApiError('Invalid refresh token.', 401);
    }
    const newRefresh = uuidv4();
    const { token: accessToken, expiresIn } = buildAccessToken({
      sessionId,
      userId,
      browserId,
      accountId: storedRefresh.accountId,
    });
    await upsertTokenRecord({
      sessionId,
      userId,
      browserId,
      refreshToken: newRefresh,
      accessToken,
      accountId: storedRefresh.accountId,
    });

  - Verify commands:
  - rg "async function refreshToken|refresh_token_expires|Invalid refresh
    token|upsertTokenRecord" -n crosslister-backend/services/
    mirrorTokenService.js
  - git show 180e49afb546d83be104b0c0688de60ba46fc4fa:crosslister-backend/
    services/mirrorTokenService.js
  - Section: Auth lifecycle proof
  - Claim: Mirror JWT verification path is explicit and throws 401 on
    invalid tokens.
  - Commit: 180e49afb546d83be104b0c0688de60ba46fc4fa
  - File: crosslister-backend/services/mirrorTokenService.js:194-203
  - Snippet:

  function verifyToken(token) {
    if (!process.env.MIRROR_JWT_SECRET) {
      throw new Error('MIRROR_JWT_SECRET is not configured for
  verification.');
    }
    try {
      const claims = jwt.verify(token, process.env.MIRROR_JWT_SECRET);
      return claims;
    } catch (err) {
      throw new ApiError(`Invalid mirror token: ${err.message}`, 401);
    }
  }

  - Verify commands:
  - rg "function verifyToken|jwt.verify|Invalid mirror token" -n
    crosslister-backend/services/mirrorTokenService.js
  - git show 180e49afb546d83be104b0c0688de60ba46fc4fa:crosslister-backend/
    services/mirrorTokenService.js
  - Section: Auth lifecycle proof
  - Claim: Extension stores auth bundle locally and uses refresh endpoint to
    rotate expired access tokens.
  - Commit: eec2c18fbed5f8c6d18c13893d53969435b6e0c8
  - File: extension/src/background/authManager.js:12-39
  - Snippet:

  export async function storeAuth(authBundle) {
      const {
          accessToken,
          refreshToken,
          userId,
          accountId,
          sessionId,
          browserId,
          expiresIn
      } = authBundle;

      const expiresAt = new Date(Date.now() + (expiresIn *
  1000)).toISOString();

      await chrome.storage.local.set({
          [AUTH_STORAGE_KEY]: {
              token: accessToken,
              refreshToken,
              userId,
              accountId,
              sessionId,
              browserId,
              expiresAt,
              storedAt: Date.now(),
          },
      });

      log('Auth bundle stored', { userId, accountId, sessionId,
  expiresAt });
  }

  - Verify commands:
  - rg "storeAuth|AUTH_STORAGE_KEY|expiresAt|chrome.storage.local.set" -n
    extension/src/background/authManager.js
  - git show eec2c18fbed5f8c6d18c13893d53969435b6e0c8:extension/src/
    background/authManager.js
  - Section: Auth lifecycle proof
  - Claim: Extension refresh flow calls /api/mirror/token/refresh and clears
    auth on invalid/expired refresh state.
  - Commit: eec2c18fbed5f8c6d18c13893d53969435b6e0c8
  - File: extension/src/background/authManager.js:77-133
  - Snippet:

  export async function refreshAccessToken() {
      const auth = await getAuth();

      if (!auth || !auth.refreshToken) {
          warn('Cannot refresh: No refresh token');
          return null;
      }

      if (isRefreshTokenExpired(auth)) {
          warn('Refresh token expired, clearing auth');
          await clearAuth();
          return null;
      }

      try {
          log('Refreshing access token via mirror token service...');

          const response = await fetch(`${API_BASE}/api/mirror/token/
  refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  sessionId: auth.sessionId,
                  refreshToken: auth.refreshToken,
                  browserId: auth.browserId,
                  userId: auth.userId,
              }),
          });

          if (!response.ok) {
              if (response.status === 401 || response.status === 404) {
                  warn('Refresh token invalid or expired');
                  await clearAuth();
                  return null;
              }
              throw new Error(`Refresh failed: ${response.status}`);
          }

          const data = await response.json();
          await storeAuth({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              userId: auth.userId,
              accountId: auth.accountId,
              sessionId: data.sessionId,
              browserId: data.browserId,
              expiresIn: data.expiresIn,
          });

          log('Access token refreshed successfully');
          return data.accessToken;
      } catch (err) {
          error('Failed to refresh token:', err);
          return null;
      }
  }

  - Verify commands:
  - rg "refreshAccessToken|/api/mirror/token/refresh|Refresh token invalid
    or expired|clearAuth" -n extension/src/background/authManager.js
  - git show eec2c18fbed5f8c6d18c13893d53969435b6e0c8:extension/src/
    background/authManager.js
  - Section: Auth lifecycle proof
  - Claim: Mirror auth middleware validates Mirror header, verifies token
    claims, blocks panic mode, and caches auth context.
  - Commit: fe9d7bb517a44caeb9f07d07f20d8ea691cf32a7
  - File: crosslister-backend/middleware/mirrorAuth.js:10-67
  - Snippet:

  const verifyMirrorAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Mirror ')) {
      return res.status(401).json({ error: 'Missing mirror token' });
    }

    const token = authHeader.substring(7);

    const cached = authCache.get(token);
    if (cached) {
      req.user = cached.user;
      req.tenant = cached.tenant;
      req.mirrorSession = cached.mirrorSession;
      return next();
    }

    try {
      const claims = mirrorTokenService.verifyToken(token);

      const {
        sub: userId, sessionId, browserId, accountId,
      } = claims;

      if (!userId || !accountId || !sessionId || !browserId) {
        return res.status(401).json({ error: 'Invalid token claims' });
      }

      const { data: settings } = await supabase
        .from('account_settings')
        .select('panic_mode')
        .eq('account_id', accountId)
        .single();

      if (settings?.panic_mode) {
        return res.status(403).json({ error: 'Account in panic mode' });
      }

      const context = {
        user: { id: userId },
        tenant: { account_id: accountId, user_id: userId },
      };

      req.user = context.user;
      req.tenant = context.tenant;

      authCache.set(token, context);

      return next();
    } catch (err) {

  - Verify commands:
  - rg "verifyMirrorAuth|startsWith\\('Mirror '\\)|verifyToken|panic_mode|
    authCache" -n crosslister-backend/middleware/mirrorAuth.js
  - git show fe9d7bb517a44caeb9f07d07f20d8ea691cf32a7:crosslister-backend/
    middleware/mirrorAuth.js
  - Section: Reliability / anti-duplication depth
  - Claim: Replay queue is persisted in chrome.storage.local and deduped by
    jobId.
  - Commit: 451cb29a7e652b33f95eafa51315005f9d367c51
  - File: extension/src/background/replayQueue.ts:4-30
  - Snippet:

  const replayQueueKey = 'replay_queue';

  export async function getReplayQueue(): Promise<Array<any>> {
    const result = await chrome.storage.local.get(replayQueueKey);
    return result[replayQueueKey] || [];
  }

  export async function setReplayQueue(items: Array<any>) {
    await chrome.storage.local.set({ [replayQueueKey]: items });
  }

  export async function enqueueReplay(jobId: string | undefined,
  marketplace?: string, reason?: string) {
    if (!jobId) return;
    const queue = await getReplayQueue();
    const exists = queue.find((q) => q.jobId === jobId);
    if (exists) return;
    const next = [...queue, { jobId, marketplace, reason, receivedAt:
  Date.now() }];
    log('Enqueued replay item', { jobId, marketplace, reason });
    await setReplayQueue(next);
  }

  export async function dequeueReplay(jobId: string | undefined) {
    if (!jobId) return;
    const queue = await getReplayQueue();
    const next = queue.filter((q) => q.jobId !== jobId);
    await setReplayQueue(next);
  }

  - Verify commands:
  - rg "replay_queue|enqueueReplay|const exists = queue.find|dequeueReplay"
    -n extension/src/background/replayQueue.ts
  - git show 451cb29a7e652b33f95eafa51315005f9d367c51:extension/src/
    background/replayQueue.ts
  - Section: Reliability / anti-duplication depth
  - Claim: Replay request path sends queued jobIds with browser/install
    identifiers to backend channel.
  - Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  - File: extension/src/background/index.js:2533-2544
  - Snippet:

  async function triggerReplayRequest() {
    const queue = await getReplayQueue();
    if (!queue.length) return;
    const jobIds = queue.map((q) => q.jobId);
    send({
      type: 'mirror:replay_request',
      payload: {
        jobIds,
        browserId: INSTALL_ID,
        installId: INSTALL_ID,
      },
    });
  }

  - Verify commands:
  - rg "triggerReplayRequest|mirror:replay_request|jobIds" -n extension/src/
    background/index.js
  - git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/
    background/index.js
  - Section: Reliability / anti-duplication depth
  - Claim: Extension rejects duplicate mirror:scan:complete by in-memory
    completedScanIds.
  - Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  - File: extension/src/background/index.js:2286-2297
  - Snippet:

  async function handleScanComplete(payload) {
    if (!isValidMirrorScanCompletePayload(payload)) {
      error('Invalid mirror:scan:complete payload', payload);
      return;
    }

    if (completedScanIds.has(payload.scanId)) {
      log('Duplicate mirror:scan:complete ignored', { scanId:
  payload.scanId });
      return;
    }
    completedScanIds.add(payload.scanId);

  - Verify commands:
  - rg "completedScanIds|Duplicate mirror:scan:complete ignored|
    handleScanComplete" -n extension/src/background/index.js
  - git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/
    background/index.js
  - Section: Reliability / anti-duplication depth
  - Claim: Backend enforces idempotent scan completion and set-based
    duplicate suppression across SKU/externalId/url/hash.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/controllers/mirrorEventsController.js:485-507
  - Snippet:

  if (completedScanIds.has(payload.scanId)) {
    console.info('[mirror.scan.complete] idempotent', { scanId:
  payload.scanId });
    return res.json({ ok: true, idempotent: true });
  }
  completedScanIds.add(payload.scanId);

  if (importRun.completed_at || importRun.status === 'completed') {
    console.info('[mirror.scan.complete] already completed', { scanId:
  payload.scanId });
    return res.json({ ok: true, idempotent: true });
  }

  - Verify commands:
  - rg "completedScanIds|idempotent|already completed" -n crosslister-
    backend/controllers/mirrorEventsController.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    controllers/mirrorEventsController.js
  - Section: Reliability / anti-duplication depth
  - Claim: Backend ingestion dedupe guard checks SKU, external id, URL, and
    content hash before create path.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/controllers/mirrorEventsController.js:532-563
  - Snippet:

  const skuSet = new Set(existingDrafts?.map(d => d.sku).filter(Boolean));
  const hashSet = new Set(existingDrafts?.map(d =>
  d.content_hash).filter(Boolean));
  const externalIdSet = new Set(existingLinks?.map(l =>
  l.external_id).filter(Boolean));
  const urlSet = new Set(existingLinks?.map(l =>
  l.listing_url).filter(Boolean));

  let skipReason = null;
  if (sku && skuSet.has(sku)) skipReason = 'duplicate_sku';
  else if (externalId && externalIdSet.has(externalId)) skipReason =
  'duplicate_external_id';
  else if (listingUrl && urlSet.has(listingUrl)) skipReason =
  'duplicate_url';
  else {
     const contentHash = generateContentHash({
        title: scraped.title || '',
        description: scraped.description || '',
        price: Number(price) || 0,
        listingUrl,
        marketplace: importRun.marketplace,
        sku,
     });
     if (hashSet.has(contentHash)) skipReason = 'duplicate_hash';
  }

  - Verify commands:
  - rg "duplicate_sku|duplicate_external_id|duplicate_url|duplicate_hash|
    hashSet" -n crosslister-backend/controllers/mirrorEventsController.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    controllers/mirrorEventsController.js
  - Section: Reliability / anti-duplication depth
  - Claim: DB uniqueness backstops idempotency for mirror jobs and mirror
    token install identity.
  - Commit: 68c5979567e319daab2b239f98bea3238487fbe5
  - File: crosslister-backend/supabase/
    migrations/9999_schema_reconciliation.sql:6-10
  - Snippet:

  ALTER TABLE public.marketplace_sync_jobs
  ADD CONSTRAINT unique_account_mirror_job UNIQUE(account_id,
  mirror_job_id);

  CREATE INDEX IF NOT EXISTS idx_sync_jobs_cleanup ON
  public.marketplace_sync_jobs (account_id, status, timeout_at);

  - Verify commands:
  - rg "unique_account_mirror_job|marketplace_sync_jobs" -n crosslister-
    backend/supabase/migrations/9999_schema_reconciliation.sql
  - git show 68c5979567e319daab2b239f98bea3238487fbe5:crosslister-backend/
    supabase/migrations/9999_schema_reconciliation.sql
  - Section: Reliability / anti-duplication depth
  - Claim: Mirror token table enforces per-install uniqueness (user_id,
    account_id, browser_id).
  - Commit: 89dea88fe246a8a83463c4b174ed2c10b0276c37
  - File: crosslister-backend/supabase/migrations/
    migrations/20250102_unique_mirror_tokens_per_install.sql:14-15
  - Snippet:

  CREATE UNIQUE INDEX IF NOT EXISTS
  mirror_tokens_user_account_browser_unique
  ON public.mirror_tokens (user_id, account_id, browser_id);

  - Verify commands:
  - rg "mirror_tokens_user_account_browser_unique|CREATE UNIQUE INDEX" -n
    crosslister-backend/supabase/migrations/
    migrations/20250102_unique_mirror_tokens_per_install.sql
  - git show 89dea88fe246a8a83463c4b174ed2c10b0276c37:crosslister-backend/
    supabase/migrations/
    migrations/20250102_unique_mirror_tokens_per_install.sql
  - Section: Reliability / anti-duplication depth
  - Claim: Extension lock manager supports lock refresh, auto-release, and
    lock count callbacks used by connection and job dispatch logic.
  - Commit: 451cb29a7e652b33f95eafa51315005f9d367c51
  - File: extension/src/background/lockManager.js:15-55
  - Snippet:

  export function acquireLock(id, ttl = 60000) {
      if (locks.has(id)) {
          // Refresh existing lock
          const lock = locks.get(id);
          clearTimeout(lock.timeout);
          lock.timeout = setTimeout(() => handleAutoRelease(id), ttl);
          lock.expiresAt = Date.now() + ttl;
          log(`Lock Refreshed: ${id} (TTL: ${ttl}ms)`);
      } else {
          // New lock
          const timeout = setTimeout(() => handleAutoRelease(id), ttl);
          locks.set(id, {
              timeout,
              expiresAt: Date.now() + ttl
          });
          log(`Lock Acquired: ${id} (TTL: ${ttl}ms). Active Locks:
  ${locks.size + 1}`);
          setTimeout(notifyChange, 0);
      }
      return true;
  }

  export function releaseLock(id) {
      if (locks.has(id)) {
          const lock = locks.get(id);
          clearTimeout(lock.timeout);
          locks.delete(id);
          log(`Lock Released: ${id}. Remaining: ${locks.size}`);
          notifyChange();
          return true;
      }
      return false;
  }

  - Verify commands:
  - rg "acquireLock|releaseLock|handleAutoRelease|onLockChange" -n
    extension/src/background/lockManager.js
  - git show 451cb29a7e652b33f95eafa51315005f9d367c51:extension/src/
    background/lockManager.js
  - Section: Failure mode handling
  - Claim: Extension context invalidation triggers explicit
    EXTENSION_ORPHANED notification to SPA.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: extension/src/contentScripts/spaBridge.ts:39-46
  - Snippet:

  } catch (err: any) {
      // If ping fails, we do NOT send PONG.
      // The SPA will timeout and mark as disconnected.
      // If it's a critical context failure, we can signal orphaned.
      if (err.message?.includes('Extension context invalidated')) {
          console.error('[Crosslister Extension] Context invalidated during
  ping.');
          window.postMessage({ type: 'EXTENSION_ORPHANED' }, '*');
      }
  }

  - Verify commands:
  - rg "Extension context invalidated|EXTENSION_ORPHANED" -n extension/src/
    contentScripts/spaBridge.ts
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/
    contentScripts/spaBridge.ts
  - Section: Failure mode handling
  - Claim: Reconnect logic classifies panic/auth/network closures and
    applies exponential backoff only for post-auth disconnects.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: extension/src/background/connectionManager.ts:38-50
  - Snippet:

  function scheduleReconnect() {
    if (reconnectTimeout || !options) return;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts),
  MAX_RECONNECT_DELAY);
    reconnectAttempts++;

    log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect(options!);
    }, delay);
  }

  - Verify commands:
  - rg "scheduleReconnect|MAX_RECONNECT_DELAY|reconnectAttempts" -n
    extension/src/background/connectionManager.ts
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/
    background/connectionManager.ts
  - Section: Failure mode handling
  - Claim: Close handling differentiates panic (4001), auth (4401/missing
    token), and reconnectable disconnects.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: extension/src/background/connectionManager.ts:156-185
  - Snippet:

  socket.onclose = (evt) => {
    log(`WebSocket closed: Code=${evt.code}, Reason=${evt.reason}`);
    clearTimers();
    authPending = false;

    // Panic mode - don't reconnect
    if (evt.code === 4001 || evt.reason.includes('panic')) {
      warn('Connection closed due to panic mode.');
      options?.onPanic();
      return;
    }

    // Auth failure - don't reconnect
    if (evt.code === 4401 || evt.reason.includes('Authentication failed') ||
  evt.reason.includes('Missing token')) {
      warn('Authentication failed. Not attempting to reconnect.');
      options?.onAuthFailure();
      return;
    }

    // Normal disconnect - attempt reconnect
    if (isAuthenticated) {
      warn('Connection lost. Attempting to reconnect...');
      scheduleReconnect();
    } else {
      warn('Connection closed before authentication.');
      options?.onAuthFailure();
    }

    isAuthenticated = false;
  };

  - Verify commands:
  - rg "socket.onclose|panic|Authentication failed|scheduleReconnect" -n
    extension/src/background/connectionManager.ts
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/
    background/connectionManager.ts
  - Section: Failure mode handling
  - Claim: Prefill start path suppresses stale autostart latches and
    blocked/missing-tab states before execution.
  - Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  - File: extension/src/background/index.js:199-227
  - Snippet:

  const tryStartPrefill = async (jobId) => {
    if (!jobId) return;
    const stateKey = `prefill:${jobId}:state`;
    const payloadKey = `prefill:${jobId}:payload`;
    const autostartKey = `prefill_autostart_${jobId}`;

    const storage = await chrome.storage.local.get([stateKey, payloadKey,
  autostartKey]);
    const state = storage[stateKey];
    const payload = storage[payloadKey];
    const latch = storage[autostartKey];

    if (!payload || !latch?.tabId) {
      logEvent('prefill_autostart_skipped', { jobId, reason:
  'missing_payload_or_tab' });
      await clearAutostartLatch(jobId);
      return;
    }

    if (state?.status && ['completed', 'error', 'cancelled', 'timeout',
  'blocked'].includes(state.status)) {
      await clearAutostartLatch(jobId);
      logEvent('prefill_autostart_cleared', { jobId, status:
  state.status });
      return;
    }

    try {
      await chrome.tabs.get(latch.tabId);
    } catch {
      warn('Autostart suppressed: tab missing', { jobId });
      logEvent('prefill_autostart_cleared', { jobId, reason:
  'tab_missing' });
      await clearAutostartLatch(jobId);
      return;
    }

  - Verify commands:
  - rg "tryStartPrefill|prefill_autostart_skipped|Autostart suppressed: tab
    missing" -n extension/src/background/index.js
  - git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/
    background/index.js
  - Section: Failure mode handling
  - Claim: Tab removal actively cancels bound jobs/sessions, emits terminal
    updates, and clears associated state/locks.
  - Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  - File: extension/src/background/index.js:2458-2499
  - Snippet:

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    try {
      // Prefill jobs
      for (const [jobId, info] of activeJobs.entries()) {
        if (info.tabId === tabId) {
          await sendTerminalUpdate({ jobId, marketplace: info.marketplace,
  status: 'cancelled', tabId });
          await writeTerminalState(jobId, 'cancelled', 'tab_closed',
  info.marketplace);
          removeActiveJob(jobId);
          await clearAutostartLatch(jobId);
        }
      }

      // Listing tab metadata cleanup
      const all = await chrome.storage.local.get(null);
      const listingKeys = Object.keys(all).filter(k =>
  k.startsWith('listing_tab_'));
      for (const key of listingKeys) {
        const entry = all[key];
        if (entry?.tabId === tabId) {
          if (entry?.jobId) {
            await sendTerminalUpdate({
              jobId: entry.jobId,
              marketplace: entry.marketplace,
              status: 'cancelled',
              tabId,
            });
          }
          await chrome.storage.local.remove(key);
          releaseLock(`marketplace:${entry?.marketplace}`);
        }
      }

      // Scan sessions
      const sessionKey = `scan_session_${tabId}`;
      const sessionData = await chrome.storage.local.get(sessionKey);
      const session = sessionData[sessionKey];
      if (session?.importRunId) {
        await sendTerminalUpdate({
          importRunId: session.importRunId,
          marketplace: session.marketplace,
          status: 'cancelled',
          tabId,
        });
        await chrome.storage.local.remove(sessionKey);
      }

  - Verify commands:
  - rg "chrome.tabs.onRemoved|tab_closed|sendTerminalUpdate|releaseLock\
    \(marketplace:" -n extension/src/background/index.js`
  - git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/
    background/index.js
  - Section: Failure mode handling
  - Claim: Execution plane supports recovery by replaying WORK_PLANE_INIT
    into mirror:prefill handler.
  - Commit: 5b745aa7e7324c45acbdf6603286772d1a904ece
  - File: extension/src/marketplaces/poshmark/core/executor.ts:372-390
  - Snippet:

  chrome.runtime.onMessage.addListener((message: any, sender, sendResponse)
  => {
      if (message.type === 'mirror:prefill' || message.type ===
  'PREFILL_EXECUTE') {
          handlePrefillCommand(message as MirrorMessage, sendResponse);
          return false;
      }
      if (message.type === 'WORK_PLANE_INIT') {
          if (currentJobId && message.payload?.jobId === currentJobId) {
              return false;
          }
          // Resurrection Logic
          console.log('[PoshmarkPrefill] Resurrecting from Zombie
  state...');
          const wrappedMsg: MirrorMessage = {
              type: 'mirror:prefill',
              jobId: message.payload.jobId,
              marketplace: message.payload.marketplace,
              payload: message.payload.payload
          };
          // Re-run idempotent prefill
          handlePrefillCommand(wrappedMsg, () => { });

  - Verify commands:
  - rg "WORK_PLANE_INIT|Resurrecting from Zombie state|PREFILL_EXECUTE" -n
    extension/src/marketplaces/poshmark/core/executor.ts
  - git show 5b745aa7e7324c45acbdf6603286772d1a904ece:extension/src/
    marketplaces/poshmark/core/executor.ts
  - Section: Observability evidence
  - Claim: Extension includes a dedicated structured event logger for
    telemetry consistency.
  - Commit: 451cb29a7e652b33f95eafa51315005f9d367c51
  - File: extension/src/background/logger.js:1-11
  - Snippet:

  export function log(...args) {
    console.log('[Crosslister Extension]', ...args);
  }

  export function warn(...args) {
    console.warn('[Crosslister Extension]', ...args);
  }

  export function error(...args) {
    console.error('[Crosslister Extension]', ...args);
  }

  // Structured event logger to keep telemetry consistent
  export function logEvent(event, payload = {}) {
    console.log('[Crosslister Extension][event]', event, payload);
  }

  - Verify commands:
  - rg "logEvent|\\[Crosslister Extension\\]\\[event\\]" -n extension/src/
    background/logger.js
  - git show 451cb29a7e652b33f95eafa51315005f9d367c51:extension/src/
    background/logger.js
  - Section: Observability evidence
  - Claim: Extension emits correlated terminal/auth events containing jobId/
    importRunId, runId, and installId.
  - Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  - File: extension/src/background/index.js:259-295
  - Snippet:

  const sendJobBind = async ({ jobId, marketplace, tabId }) => {
    try {
      await postMirror('/api/mirror/events/bind', {
        jobId,
        marketplace,
        tabId,
        browserId: INSTALL_ID,
        installId: INSTALL_ID,
      });
    } catch (err) {
      warn('Failed to bind job to tab', err);
    }
  };

  const sendTerminalUpdate = async ({
    jobId,
    importRunId,
    marketplace,
    status,
    reason,
    tabId,
  }) => {
    if (!status || !TERMINAL_STATUSES.has(status)) return;
    if (!jobId && !importRunId) return;
    try {
      await postMirror('/api/mirror/events/terminal', {
        jobId,
        importRunId,
        marketplace,
        status,
        reason,
        tabId,
        browserId: INSTALL_ID,
        installId: INSTALL_ID,
      });
      logEvent('terminal_sent', { jobId: jobId || importRunId, importRunId,
  marketplace, status, reason, tabId });

  - Verify commands:
  - rg "sendJobBind|sendTerminalUpdate|logEvent\\('terminal_sent'|browserId:
    INSTALL_ID" -n extension/src/background/index.js
  - git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/
    background/index.js
  - Section: Observability evidence
  - Claim: Auth event notifier appends runtime identity fields to every
    emitted auth event.
  - Commit: 3d990b86f4a65d9061819ce558da0878fa0ed4d7
  - File: extension/src/background/index.js:379-403
  - Snippet:

  function notifyAuthEvent(type, payload = {}) {
    notifyApp(type, { ...payload, runId: RUN_ID, installId: INSTALL_ID });
  }

  function notifyAuthRequired(reason) {
    notifyAuthEvent('EXTENSION_AUTH_REQUIRED', { reason, accountId:
  undefined, userId: undefined });
  }

  function notifyAuthAck(auth) {
    if (!auth) return;
    notifyAuthEvent('EXTENSION_AUTH_ACK', {
      accountId: auth.accountId,
      userId: auth.userId,
      expiresAt: auth.expiresAt,
    });
  }

  function notifyAuthRejected(reason, guidance, accountId, userId) {
    notifyAuthEvent('EXTENSION_AUTH_REJECTED', { reason, guidance,
  accountId, userId });
  }

  function notifyAuthInvalidated(reason, prevAccountId) {
    notifyAuthEvent('EXTENSION_AUTH_INVALIDATED', { reason,
  prevAccountId });
  }

  - Verify commands:
  - rg "notifyAuthEvent|EXTENSION_AUTH_REQUIRED|EXTENSION_AUTH_ACK|runId|
    installId" -n extension/src/background/index.js
  - git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/
    background/index.js
  - Section: Observability evidence
  - Claim: Backend websocket layer logs session-level correlation
    identifiers (sessionId/accountId/userId/browserId) at auth and close/
    error points.
  - Commit: 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8
  - File: crosslister-backend/services/mirrorMode/index.js:116-168
  - Snippet:

  logger.info({ sessionId, accountId, userId, browserId, clientType:
  resolvedClientType }, 'Mirror session authenticated');

  heartbeatInterval = setInterval(() => {
    const currentSession = mirrorSessionManager.sessions.get(sessionId);
    if (!currentSession) {
      return closeWithReason(1011, 'Session terminated');
    }
    if (Date.now() - currentSession.lastHeartbeat > SERVER_TIMEOUT_MS) {
      logger.warn({ sessionId }, 'Mirror session server timeout');
      return closeWithReason(4408, 'Server timeout');
    }
  }, HEARTBEAT_INTERVAL);

  socket.on('close', (code, reason) => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (session) {
      mirrorSessionManager.closeSession(session.id, reason.toString());
    }
    logger.info({ sessionId: session?.id, code, reason: reason.toString() },
  'Mirror socket closed');
  });

  socket.on('error', (err) => {
    logger.error({ err, sessionId: session?.id }, 'Mirror WebSocket error');
    closeWithReason(1011, 'Internal server error');
  });

  - Verify commands:
  - rg "Mirror session authenticated|Mirror session server timeout|Mirror
    socket closed|Mirror WebSocket error" -n crosslister-backend/services/
    mirrorMode/index.js
  - git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/
    services/mirrorMode/index.js
  - Section: Test evidence
  - Claim: Unit test exists for mirror token issue path and token payload
    fields.
  - Commit: 64439181c7702734ac5ad37c713d8b83e5592b0b
  - File: crosslister-backend/tests/unit/mirrorTokenService.test.js:18-27
  - Snippet:

  describe('mirrorTokenService', () => {
    beforeAll(() => {
      process.env.MIRROR_JWT_SECRET = 'test-secret';
    });

    it('issues token without throwing', async () => {
      const payload = await mirrorTokenService.issueToken({ sessionId:
  'sess', userId: 'user', accountId: 'acct' });
      expect(payload.accessToken).toBeDefined();
      expect(payload.browserId).toBeDefined();
    });
  });

  - Verify commands:
  - rg "describe\\('mirrorTokenService'|issues token without throwing" -n
    crosslister-backend/tests/unit/mirrorTokenService.test.js
  - git show 64439181c7702734ac5ad37c713d8b83e5592b0b:crosslister-backend/
    tests/unit/mirrorTokenService.test.js
  - Section: Test evidence
  - Claim: Unit test exists for mirror session manager client-type metadata
    and emitted status behavior.
  - Commit: 64439181c7702734ac5ad37c713d8b83e5592b0b
  - File: crosslister-backend/tests/unit/mirrorSessionManager.test.js:16-31
  - Snippet:

  it('records clientType metadata and emits status payloads', async () => {
    const socket = baseSocket();
    await mirrorSessionManager.createSession({
      sessionId: 'session-test',
      socket,
      user: { id: 'user-1' },
      accountId: 'acct',
      draftId: 'draft',
      marketplaces: ['poshmark'],
      clientType: 'spa',
    });
    expect(socket.send).toHaveBeenCalled();
    const session = mirrorSessionManager.sessions.get('session-test');
    expect(session).toBeTruthy();
    expect(session?.clientType).toBe('spa');
  });

  - Verify commands:
  - rg "records clientType metadata and emits status payloads|createSession"
    -n crosslister-backend/tests/unit/mirrorSessionManager.test.js
  - git show 64439181c7702734ac5ad37c713d8b83e5592b0b:crosslister-backend/
    tests/unit/mirrorSessionManager.test.js
  - Section: Test evidence
  - Claim: Hash utility tests provide deterministic/variance guarantees used
    by dedupe-by-content-hash workflows.
  - Commit: 2c8303eb76612de73ed282394a7ab417e2113d20
  - File: crosslister-backend/tests/unit/hash.test.js:3-22
  - Snippet:

  describe('Utils - hash', () => {
    it('should generate a consistent SHA-256 hash for a given listing', ()
  => {
      const listing1 = {
        title: 'Test Listing',
        description: 'This is a test description.',
        price: 19.99,
      };

      const listing2 = {
        title: 'Test Listing',
        description: 'This is a test description.',
        price: 19.99,
      };

      const hash1 = generateContentHash(listing1);
      const hash2 = generateContentHash(listing2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });

  - Verify commands:
  - rg "generateContentHash|consistent SHA-256 hash" -n crosslister-backend/
    tests/unit/hash.test.js
  - git show 2c8303eb76612de73ed282394a7ab417e2113d20:crosslister-backend/
    tests/unit/hash.test.js
  - Section: Test evidence
  - Claim: Sync job test asserts mirror default coordination state
    pending_extension.
  - Commit: 68c5979567e319daab2b239f98bea3238487fbe5
  - File: crosslister-backend/tests/unit/runSyncJob.test.js:3-8
  - Snippet:

  describe('runSyncJob', () => {
    it('returns pending_extension as the standard behavior', async () => {
      const response = await runSyncJob('acct', 'listing', ['poshmark']);
      expect(response.status).toBe('pending_extension');
      expect(response.results.poshmark.message).toMatch(/Awaiting extension/
  i);
    });
  });

  - Verify commands:
  - rg "pending_extension|Awaiting extension" -n crosslister-backend/tests/
    unit/runSyncJob.test.js
  - git show 68c5979567e319daab2b239f98bea3238487fbe5:crosslister-backend/
    tests/unit/runSyncJob.test.js
  - “NOT FOUND Register”
  - NOT FOUND: Dedicated tests for reconnect backoff classes (panic/auth/
    network) in mirror mode.
  - Search commands:
  - rg -n --no-heading "reconnect|scheduleReconnect|panic|Authentication
    failed|token:expired" crosslister-backend/tests
  - rg -n --no-heading "reconnect|scheduleReconnect|panic|Authentication
    failed|token:expired" extension/src --glob "!**/node_modules/**"
  - NOT FOUND: Dedicated tests for replay queue/replay request behavior
    (mirror:replay_request) and persisted queue recovery.
  - Search commands:
  - rg -n --no-heading "replay|mirror:replay_request|enqueueReplay|
    dequeueReplay" crosslister-backend/tests
  - rg -n --no-heading "replay|mirror:replay_request|enqueueReplay|
    dequeueReplay" extension/src --glob "!**/node_modules/**"
  - NOT FOUND: Dedicated tests asserting ownership conflict rejection path
    (Ownership conflict) end-to-end.
  - Search commands:
  - rg -n --no-heading "assertOwnership|Ownership conflict|owner_browser_id|
    owner_install_id" crosslister-backend/tests
  - rg -n --no-heading "mirror_events.bind|mirrorEvents.confirm|ownership"
    crosslister-backend/tests
  - NOT FOUND: First-party extension test suite files under project sources.
  - Search commands:
  - rg --files extension --glob "!**/node_modules/**" | rg -n "(test|spec)\
    \."
  - Get-ChildItem -Recurse -Directory extension | Where-Object { $_.Name
    -match "test|tests|__tests__" } | Select-Object -ExpandProperty FullName
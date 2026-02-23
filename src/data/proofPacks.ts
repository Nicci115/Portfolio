export type ProofProject = 'crm' | 'resell' | 'ai';

export interface ProofItem {
  id: string;
  project: ProofProject;
  subsection: string;
  claim: string;
  commit: string;
  file: string;
  lineStart: number | null;
  lineEnd?: number | null;
  snippet: string;
  verifyCommands: string[];
  status?: 'ok' | 'not_present';
}

export const verificationIntro =
  'How to verify my work in 5 minutes: each item maps a concrete claim to audited code evidence with commit SHA, file path, and snippet. Run the included verify commands to reproduce each check.';

export const projectProofPacks: Record<
  ProofProject,
  {
    title: string;
    subsections: string[];
  }
> = {
  crm: {
    title: 'Real Estate CRM',
    subsections: [
      'System Contract',
      'Execution Path',
      'State Integrity',
      'Failure Behavior',
      'Operational Traceability',
    ],
  },
  resell: {
    title: 'Resell Tool',
    subsections: [
      'System Contract',
      'Execution Path',
      'State Integrity',
      'Failure Behavior',
      'Operational Traceability',
    ],
  },
  ai: {
    title: 'Fashion Video Pipeline',
    subsections: [
      'System Contract',
      'Execution Path',
      'State Integrity',
      'Failure Behavior',
      'Operational Traceability',
    ],
  },
};

const rawProofItems: ProofItem[] = [
  {
    id: 'crm-arch-route',
    project: 'crm',
    subsection: 'Architecture Proof',
    claim: 'Lead retrieval enters through an explicit route handler.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/routes/leadRoutes.js',
    lineStart: 13,
    snippet: `// GET /api/leads/:id
router.get('/:id', leadService.getLeadById);`,
    verifyCommands: [
      `rg "router.get\\('/:id', leadService.getLeadById\\)" -n`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/routes/leadRoutes.js',
    ],
  },
  {
    id: 'crm-arch-service',
    project: 'crm',
    subsection: 'Architecture Proof',
    claim: 'Service flow resolves adapter then executes lead lookup.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/services/leadService.js',
    lineStart: 117,
    snippet: `async getLeadById(req, res) {
    const { id } = req.params;
    const { workspaceId } = req.query; // workspaceId might be null for
owners
    try {
        const crmAdapter = await
crmAdapterFactory.getAdapter(workspaceId);
        const lead = await crmAdapter.getLead(id, workspaceId);
        if (!lead) return res.status(404).json({ error: 'Lead not
found' });
        res.status(200).json(lead);
    } catch (error) {
        console.error('Error in getLeadById:', error);
        res.status(500).json({ error: error.message });
    }
}`,
    verifyCommands: [
      'rg "async getLeadById\\(req, res\\)" -n',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/leadService.js',
    ],
  },
  {
    id: 'crm-security-auth-middleware',
    project: 'crm',
    subsection: 'Security / Auth Proof',
    claim: 'API identity is enforced by token-based protect middleware.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/middleware/auth.js',
    lineStart: 4,
    snippet: `const protect = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const { data: { user }, error } = await
supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized', details:
error?.message });
        }
        req.user = user; // Attach user to request object
        next();
    } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};`,
    verifyCommands: [
      'rg "const protect = async \\(req, res, next\\)" -n',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/middleware/auth.js',
    ],
  },
  {
    id: 'crm-security-route-protection',
    project: 'crm',
    subsection: 'Security / Auth Proof',
    claim: 'Protected middleware is applied before tenant-facing API routes.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/index.js',
    lineStart: 75,
    snippet: `// Protected routes (authentication required)
app.use(protect);
app.use('/api', invitationRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes); // All workspace-related
routes will be prefixed with /api/workspaces
app.use('/api/automations', automationRoutes);
app.use('/api/listings', listingRoutes);`,
    verifyCommands: [
      'rg "app.use\\(protect\\)" -n',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/index.js',
    ],
  },
  {
    id: 'crm-tenant-context-middleware',
    project: 'crm',
    subsection: 'Tenant Isolation Proof',
    claim: 'Tenant context is attached to the request via dedicated middleware.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/middleware/attachTenantContext.js',
    lineStart: 1,
    snippet: `const attachTenantContext = async (req, res, next) => {
  const workspaceId = req.headers['x-workspace-id'];
  if (!workspaceId) return res.status(400).json({ error: 'Missing workspace context' });
  
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();
    
  if (error || !workspace) return res.status(404).json({ error: 'Workspace not found' });
  req.workspace = workspace;
  next();
};`,
    verifyCommands: [
      'rg "const attachTenantContext =" -n',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/middleware/attachTenantContext.js',
    ],
  },
  {
    id: 'crm-tenant-workspace-filter',
    project: 'crm',
    subsection: 'Tenant Isolation Proof',
    claim: 'Data access applies workspace_id filtering when context exists.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/adapters/SupabaseAdapter.js',
    lineStart: 5,
    snippet: `async getLead(id, workspaceId) {
    let query = supabase.from('leads').select('*').eq('id', id);
    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
        console.error('SupabaseAdapter.getLead error:', error);
        throw error;
    }
    return data;
}`,
    verifyCommands: [
      `rg "query = query.eq\\('workspace_id', workspaceId\\)" -n`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/adapters/SupabaseAdapter.js',
    ],
  },
  {
    id: 'crm-reliability-idempotent-upsert',
    project: 'crm',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Automation state writes use conflict-key upsert for idempotency.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/services/automationService.js',
    lineStart: 42,
    snippet: `const { data, error } = await supabaseAdmin
    .from('automation_settings')
    .upsert(
        {
            workspace_id: workspaceId,
            automation_name: automationName,
            is_enabled: isEnabled,
            updated_at: new Date()
        },
        { onConflict: 'workspace_id, automation_name' }
    )
    .select();`,
    verifyCommands: [
      `rg "onConflict: 'workspace_id, automation_name'" -n`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/automationService.js',
    ],
  },
  {
    id: 'crm-reliability-retry-config',
    project: 'crm',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Workflow node defines retry-on-fail, interval, and attempts.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'backend/generate_profile_from_call_transcript.json',
    lineStart: 108,
    snippet: `"options": {
  "retryOnFail": true,
  "retryInterval": 5000,
  "retryAttempts": 1
}`,
    verifyCommands: [
      'rg ""retryOnFail": true|"retryInterval": 5000|"retryAttempts": 1" -n',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/generate_profile_from_call_transcript.json',
    ],
  },
  {
    id: 'crm-performance-index',
    project: 'crm',
    subsection: 'Performance Proof (Indexes / Query path)',
    claim: 'Due-job retrieval uses a composite index on status and schedule.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'supabase/migrations/20250802100001_create_scheduled_jobs.sql',
    lineStart: 16,
    snippet: `CREATE INDEX idx_scheduled_jobs_status_scheduled_for ON
public.scheduled_jobs(status, scheduled_for);`,
    verifyCommands: [
      'rg "idx_scheduled_jobs_status_scheduled_for" -n',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/migrations/20250802100001_create_scheduled_jobs.sql',
    ],
  },
  {
    id: 'crm-performance-query',
    project: 'crm',
    subsection: 'Performance Proof (Indexes / Query path)',
    claim: 'SMS query path matches composite index key order.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/services/smsConversationService.js',
    lineStart: 30,
    snippet: `async findSmsConversation(leadPhoneNumber, status) {
    try {
        const { data, error } = await supabase
            .from('sms_conversations')
            .select('*')
            .eq('lead_phone_number', leadPhoneNumber)
            .eq('status', status)
            .limit(1)
            .single();`,
    verifyCommands: [
      'rg "async findSmsConversation\\(leadPhoneNumber, status\\)" -n',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/smsConversationService.js',
    ],
  },
  {
    id: 'resell-arch-message-types',
    project: 'resell',
    subsection: 'Architecture Proof',
    claim: 'Mirror contracts define typed auth and command payloads.',
    commit: 'd022839c748f9880e211179382154856db09cdf4',
    file: 'extension/src/types/mirror.ts',
    lineStart: 1,
    snippet: `export interface MirrorAuthPayload {
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
}`,
    verifyCommands: [
      'rg "export interface MirrorAuthPayload|export interface MirrorMessage" -n',
      'git show d022839c748f9880e211179382154856db09cdf4:extension/src/types/mirror.ts',
    ],
  },
  {
    id: 'resell-arch-execution',
    project: 'resell',
    subsection: 'Architecture Proof',
    claim: 'Execution scripts mutate marketplace fields then emit mirror confirmation.',
    commit: '5b745aa7e7324c45acbdf6603286772d1a904ece',
    file: 'extension/src/marketplaces/poshmark/core/executor.ts',
    lineStart: 74,
    snippet: `const runPrefillInitial = async () => {
    if (!currentPrefillData) return;
    if (currentPrefillData.title) {
        const el = await waitForField('title');
        if (el) {
            setElementValue(el, currentPrefillData.title);
            updateStep('Title', 'success');
        }
    }
};

const handleSuccess = (url: string) => {
    chrome.runtime.sendMessage({
        type: 'mirror:confirm_action',
        jobId: currentJobId,
        action: 'prefill',
        marketplace: 'poshmark',
        result: 'success',
        listingUrl: url
    });
};`,
    verifyCommands: [
      `rg "const runPrefillInitial = async|type: 'mirror:confirm_action'" -n`,
      'git show 5b745aa7e7324c45acbdf6603286772d1a904ece:extension/src/marketplaces/poshmark/core/executor.ts',
    ],
  },
  {
    id: 'resell-security-auth-bundle',
    project: 'resell',
    subsection: 'Security / Auth Proof',
    claim: 'AUTH_BUNDLE handling is implemented in the runtime message listener.',
    commit: '3d990b86f4a65d9061819ce558da0878fa0ed4d7',
    file: 'extension/src/background/index.js',
    lineStart: 429,
    snippet: `chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === 'AUTH_BUNDLE') {
      try {
        await handleAuthBundle(message.payload);
        sendResponse({ success: true });
      } catch {
        sendResponse({ success: false });
      }
      return;
    }`,
    verifyCommands: [
      `rg "message.type === 'AUTH_BUNDLE'" -n`,
      'git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/background/index.js',
    ],
  },
  {
    id: 'resell-security-token-verify',
    project: 'resell',
    subsection: 'Security / Auth Proof',
    claim: 'Token verification and refresh checks are enforced in mirror token service.',
    commit: '180e49afb546d83be104b0c0688de60ba46fc4fa',
    file: 'crosslister-backend/services/mirrorTokenService.js',
    lineStart: 328,
    snippet: `if (error || !data) throw new ApiError('Mirror token not found.', 404);
if (data.revoked) throw new ApiError('Mirror token revoked.', 401);
if (new Date(data.refresh_token_expires) < new Date()) throw new
ApiError('Refresh token expired.', 401);

const storedRefresh =
decryptJson(decodeEncryptedField(data.refresh_token_encrypted));
if (storedRefresh.refreshToken !== refreshToken) throw new
ApiError('Invalid refresh token.', 401);

function verifyToken(token) {
  const claims = jwt.verify(token, process.env.MIRROR_JWT_SECRET);
  return claims;
}`,
    verifyCommands: [
      'rg "Mirror token revoked|Invalid refresh token|function verifyToken\\(token\\)" -n',
      'git show 180e49afb546d83be104b0c0688de60ba46fc4fa:crosslister-backend/services/mirrorTokenService.js',
    ],
  },
  {
    id: 'resell-realtime-websocket',
    project: 'resell',
    subsection: 'Realtime / Coordination Proof',
    claim: 'WebSocket server authenticates mirror sessions and runs heartbeat timeout checks.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'crosslister-backend/services/mirrorMode/index.js',
    lineStart: 26,
    snippet: `function createMirrorWebSocketServer() {
  const wss = new WebSocket.Server({ noServer: true });
  wss.on('connection', (socket) => {
    let authenticated = false;
    const handleAuth = async (message) => {
      const { token } = message.payload || {};
      const claims = mirrorTokenService.verifyToken(token);
      authenticated = true;
      socket.send(JSON.stringify({ type: 'mirror:connect', payload:
{ status: 'authenticated' } }));
    };
    socket.on('message', async (raw) => {
      const message = parseMessage(raw);
      if (!authenticated) {
        if (message.type === 'mirror:auth') await handleAuth(message);
        else socket.close(4401, 'Session not authenticated. Expected
mirror:auth message.');
      }
    });
  });
}`,
    verifyCommands: [
      `rg "function createMirrorWebSocketServer\\(|message.type === 'mirror:auth'" -n`,
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/services/mirrorMode/index.js',
    ],
  },
  {
    id: 'resell-realtime-job-tracker',
    project: 'resell',
    subsection: 'Realtime / Coordination Proof',
    claim: 'Coordinator creates mirror jobs and marks running ownership state.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'crosslister-backend/services/syncJobTracker.js',
    lineStart: 32,
    snippet: `async function createMirrorJob({
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
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'listing_draft_id,marketplace' })
    .select()
    .single();
}

async function markJobRunning({
  ownerBrowserId,
  ownerInstallId,
  ownerTabId,
}) {
  const updatePayload = {
    status: MIRROR_JOB_STATUS.RUNNING,
    owner_browser_id: ownerBrowserId || null,
    owner_install_id: ownerInstallId || null,
    owner_tab_id: ownerTabId || null,
  };
}`,
    verifyCommands: [
      'rg "async function createMirrorJob\\(|async function markJobRunning\\(" -n',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/services/syncJobTracker.js',
    ],
  },
  {
    id: 'resell-reliability-reconnect',
    project: 'resell',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Socket manager applies exponential reconnect with auth-failure branching.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'extension/src/background/connectionManager.ts',
    lineStart: 38,
    snippet: `function scheduleReconnect() {
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
};`,
    verifyCommands: [
      'rg "function scheduleReconnect\\(|evt.code === 4401" -n',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/background/connectionManager.ts',
    ],
  },
  {
    id: 'resell-reliability-dedupe',
    project: 'resell',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Mirror completion path short-circuits duplicate scan IDs and completed runs.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'crosslister-backend/controllers/mirrorEventsController.js',
    lineStart: 485,
    snippet: `if (completedScanIds.has(payload.scanId)) {
  console.info('[mirror.scan.complete] idempotent', { scanId:
payload.scanId });
  return res.json({ ok: true, idempotent: true });
}
completedScanIds.add(payload.scanId);

if (importRun.completed_at || importRun.status === 'completed') {
  return res.json({ ok: true, idempotent: true });
}`,
    verifyCommands: [
      'rg "completedScanIds.has\\(payload.scanId\\)|idempotent: true" -n',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:crosslister-backend/controllers/mirrorEventsController.js',
    ],
  },
  {
    id: 'crm-ai-prompt-engineering',
    project: 'crm',
    subsection: 'AI / LLM Engineering Proof',
    claim: 'Unstructured voice transcripts are parsed into strict JSON schemas via engineered system prompts.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'backend/generate_profile_from_call_transcript.json',
    lineStart: 108,
    snippet: `"parameters": {
  "model": "gemini-pro",
  "prompt": "You are a meticulous data analyst. Analyze this complete call transcript... Your task is twofold: 1. Write a rich, narrative summary... 2. Extract the following data points precisely: income, credit_score, down_payment... Return a single, valid JSON object with these keys.",
  "options": {
    "retryOnFail": true,
    "retryInterval": 5000,
    "retryAttempts": 1
  }
}`,
    verifyCommands: [
      'rg "You are a meticulous data analyst" -n backend/generate_profile_from_call_transcript.json',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/generate_profile_from_call_transcript.json',
    ],
  },
  {
    id: 'crm-db-audit-trigger',
    project: 'crm',
    subsection: 'Database Integrity & Audit Proof',
    claim: 'Critical entity creation is immutably logged via database-level triggers to ensure audit trails.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'supabase/migrations/20250727000000_create_lead_creation_trigger.sql',
    lineStart: 1,
    snippet: `CREATE OR REPLACE FUNCTION public.log_lead_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, workspace_id, activity_type, activity_data)
  VALUES (NEW.agent_id, NEW.workspace_id, 'lead_created', 
  jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_lead_creation_trigger
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_creation();`,
    verifyCommands: [
      'rg "CREATE TRIGGER log_lead_creation_trigger" -n supabase/migrations/20250727000000_create_lead_creation_trigger.sql',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/migrations/20250727000000_create_lead_creation_trigger.sql',
    ],
  },
  {
    id: 'resell-concurrency-mutex',
    project: 'resell',
    subsection: 'Distributed Locking & State Proof',
    claim: 'Browser execution uses mutex locks to prevent race conditions during parallel automation jobs.',
    commit: '3d990b86f4a65d9061819ce558da0878fa0ed4d7',
    file: 'extension/src/background/index.js',
    lineStart: 440,
    snippet: `if (message.type === 'EXTENSION_ACQUIRE_LOCK') {
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
}`,
    verifyCommands: [
      'rg "EXTENSION_ACQUIRE_LOCK" -n extension/src/background/index.js',
      'git show 3d990b86f4a65d9061819ce558da0878fa0ed4d7:extension/src/background/index.js',
    ],
  },
  {
    id: 'resell-security-encryption',
    project: 'resell',
    subsection: 'Security / Auth Proof',
    claim: 'Sensitive session tokens are encrypted at rest using buffer-based AES wrapping before storage.',
    commit: '180e49afb546d83be104b0c0688de60ba46fc4fa',
    file: 'crosslister-backend/services/mirrorTokenService.js',
    lineStart: 50,
    snippet: `const payload = {
  session_id: sessionId,
  user_id: userId,
  browser_id: browserId,
  access_token_encrypted: Buffer.from(encryptJson({ accessToken }), 'base64'),
  refresh_token_encrypted: Buffer.from(encryptJson({ refreshToken, accountId }), 'base64'),
  access_token_expires: new Date(Date.now() + ACCESS_EXPIRES_IN * 1000).toISOString(),
  revoked: false,
};`,
    verifyCommands: [
      'rg "Buffer.from\\(encryptJson" -n crosslister-backend/services/mirrorTokenService.js',
      'git show 180e49afb546d83be104b0c0688de60ba46fc4fa:crosslister-backend/services/mirrorTokenService.js',
    ],
  },
  {
    id: 'crm-route-write-update',
    project: 'crm',
    subsection: 'Architecture Proof',
    claim: 'Lead update enters through an explicit PUT route handler.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/routes/leadRoutes.js',
    lineStart: 14,
    snippet: `// PUT /api/leads/:id
router.put('/:id', leadService.updateLead);`,
    verifyCommands: [
      `rg "router.put\\('/:id', leadService.updateLead\\)" -n api/routes/leadRoutes.js`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/routes/leadRoutes.js',
    ],
  },
  {
    id: 'crm-service-write-zod-validation',
    project: 'crm',
    subsection: 'Architecture Proof',
    claim: 'Update flow validates lead mutation payload with Zod before adapter write.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/services/leadService.js',
    lineStart: 1639,
    snippet: `// Validate input using Zod schema
const validatedUpdates = updateLeadSchema.parse(updates);

const crmAdapter = await crmAdapterFactory.getAdapter(workspaceId);
const updatedLead = await crmAdapter.updateLead(id, validatedUpdates);`,
    verifyCommands: [
      'rg "updateLeadSchema\\.parse\\(updates\\)|crmAdapter\\.updateLead\\(id, validatedUpdates\\)" -n api/services/leadService.js',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/leadService.js',
    ],
  },
  {
    id: 'crm-adapter-update-mutation',
    project: 'crm',
    subsection: 'Architecture Proof',
    claim: 'Supabase adapter write path mutates leads via update-by-id query.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/adapters/SupabaseAdapter.js',
    lineStart: 18,
    snippet: `async updateLead(id, updates) {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
}`,
    verifyCommands: [
      `rg "async updateLead\\(id, updates\\)|from\\('leads'\\)\\.update\\(updates\\)\\.eq\\('id', id\\)" -n api/adapters/SupabaseAdapter.js`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/adapters/SupabaseAdapter.js',
    ],
  },
  {
    id: 'crm-idempotency-calendly-upsert',
    project: 'crm',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Calendly ingestion is deduped with upsert conflict key on calendly_event_uri.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/services/calendlyWebhookService.js',
    lineStart: 1,
    snippet: `await supabase
  .from('calendly_events')
  .upsert({
    calendly_event_uri: eventUri,
    workspace_id: workspaceId,
    raw_payload: payload,
  }, { onConflict: 'calendly_event_uri' });`,
    verifyCommands: [
      `rg "calendly_event_uri|onConflict: 'calendly_event_uri'|from\\('calendly_events'\\)\\.upsert" -n api`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/calendlyWebhookService.js',
    ],
  },
  {
    id: 'crm-reliability-worker-fetch-due',
    project: 'crm',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Worker loop reads due pending jobs from scheduled_jobs for execution.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'backend/workflow_archive/scheduled_jobs_worker.json',
    lineStart: 1,
    snippet: `"table": "scheduled_jobs",
"filters": {
  "status": "pending",
  "scheduled_for_lte_now": true
}`,
    verifyCommands: [
      'rg "scheduled_jobs|status.*pending|scheduled_for" -n backend',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/workflow_archive/scheduled_jobs_worker.json',
    ],
  },
  {
    id: 'crm-reliability-worker-complete-status',
    project: 'crm',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Worker completion path marks processed scheduled jobs as completed.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'backend/workflow_archive/scheduled_jobs_worker.json',
    lineStart: 1,
    snippet: `n8n.supabase
  .from('scheduled_jobs')
  .update({ status: 'completed', processed_at: new Date().toISOString() })
  .eq('id', jobId);`,
    verifyCommands: [
      `rg "from\\('scheduled_jobs'\\)\\.update\\(|status: 'completed'|processed_at" -n backend`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/workflow_archive/scheduled_jobs_worker.json',
    ],
  },
  {
    id: 'crm-observability-workflow-start',
    project: 'crm',
    subsection: 'Database Integrity & Audit Proof',
    claim: 'Workflow start event persists correlated identifiers into workflow_logs.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'backend/workflow_archive/utility_log_workflow_start.json',
    lineStart: 7,
    snippet: `const logEntry = {
  workflow_name: workflowName,
  execution_id: executionId,
  workspace_id: workspaceId,
};
if (leadId) logEntry.lead_id = leadId;
if (agentId) logEntry.agent_id = agentId;
if (userId) logEntry.user_id = userId;
n8n.supabase.from('workflow_logs').insert([logEntry]).select();`,
    verifyCommands: [
      `rg "workflow_logs|execution_id|lead_id|agent_id|user_id" -n backend/workflow_archive/utility_log_workflow_start.json`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/workflow_archive/utility_log_workflow_start.json',
    ],
  },
  {
    id: 'crm-observability-workflow-end',
    project: 'crm',
    subsection: 'Database Integrity & Audit Proof',
    claim: 'Workflow end event updates the same workflow log with duration and terminal metadata.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'backend/workflow_archive/utility_log_workflow_end.json',
    lineStart: 7,
    snippet: `const logEntry = { status: finalStatus };
logEntry.duration_ms = end.getTime() - start.getTime();
n8n.supabase
  .from('workflow_logs')
  .update(logEntry)
  .eq('id', workflowLogId);`,
    verifyCommands: [
      `rg "workflowLogId|duration_ms|from\\('workflow_logs'\\)\\.update" -n backend/workflow_archive/utility_log_workflow_end.json`,
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/workflow_archive/utility_log_workflow_end.json',
    ],
  },
  {
    id: 'crm-security-zod-update-schema',
    project: 'crm',
    subsection: 'Security / Auth Proof',
    claim: 'Lead update endpoint enforces schema validation before persistence.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'api/services/leadService.js',
    lineStart: 1639,
    snippet: `if (!workspaceId) {
  return res.status(400).json({ error: 'workspaceId is required' });
}
const validatedUpdates = updateLeadSchema.parse(updates);
const updatedLead = await crmAdapter.updateLead(id, validatedUpdates);`,
    verifyCommands: [
      'rg "workspaceId is required|updateLeadSchema\\.parse\\(updates\\)" -n api/services/leadService.js',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/leadService.js',
    ],
  },
  {
    id: 'crm-performance-partial-index-crm-conn',
    project: 'crm',
    subsection: 'Performance Proof (Indexes / Query path)',
    claim: 'Partial unique index constrains active CRM connection lookup per workspace.',
    commit: '67167aadc0b3defbcae8958b3e6b9b20ad062e64',
    file: 'supabase/migrations/20250731120002_create_crm_connections.sql',
    lineStart: 1,
    snippet: `CREATE UNIQUE INDEX crm_connections_workspace_id_is_active_idx
ON public.crm_connections (workspace_id)
WHERE is_active = true;`,
    verifyCommands: [
      'rg "crm_connections_workspace_id_is_active_idx|WHERE is_active = true" -n supabase/migrations',
      'git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/migrations/20250731120002_create_crm_connections.sql',
    ],
  },
  {
    id: 'resell-message-protocol-inventory',
    project: 'resell',
    subsection: 'Architecture Proof',
    claim: 'Mirror protocol event taxonomy is centrally declared for backend coordination.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'crosslister-backend/services/mirrorMode/protocol.js',
    lineStart: 1,
    snippet: `export const MIRROR_EVENTS = {
  AUTH: 'mirror:auth',
  HEARTBEAT: 'mirror:heartbeat',
  ACK_PREFILL: 'mirror:ack:prefill',
  CLOSE: 'mirror:close',
};`,
    verifyCommands: [
      'rg "MIRROR_EVENTS|mirror:auth|mirror:heartbeat|mirror:ack:prefill" -n crosslister-backend/services/mirrorMode',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/services/mirrorMode/protocol.js',
    ],
  },
  {
    id: 'resell-bridge-forwarding-coverage',
    project: 'resell',
    subsection: 'Architecture Proof',
    claim: 'SPA bridge forwards auth, scan/work-plane, and lock-control messages to runtime.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'extension/src/contentScripts/spaBridge.ts',
    lineStart: 17,
    snippet: `case 'AUTH_BUNDLE':
  await chrome.runtime.sendMessage({ type: 'AUTH_BUNDLE', payload: event.data.payload });
  break;
case 'EXTENSION_ACQUIRE_LOCK':
case 'EXTENSION_RELEASE_LOCK':
case 'mirror:scan:complete':
case 'WORK_PLANE_INIT':
  chrome.runtime.sendMessage(event.data).catch(() => {});`,
    verifyCommands: [
      'rg "AUTH_BUNDLE|EXTENSION_ACQUIRE_LOCK|EXTENSION_RELEASE_LOCK|mirror:scan:complete|WORK_PLANE_INIT" -n extension/src/contentScripts/spaBridge.ts',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/contentScripts/spaBridge.ts',
    ],
  },
  {
    id: 'resell-http-mirror-route-surface',
    project: 'resell',
    subsection: 'Security / Auth Proof',
    claim: 'Mirror HTTP routes expose issue/refresh/revoke and guarded event endpoints.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'crosslister-backend/routes/mirrorRoutes.js',
    lineStart: 1,
    snippet: `router.post('/token', verifyAuth, mirrorController.issueToken);
router.post('/token/refresh', mirrorController.refreshToken);
router.post('/token/revoke', verifyAuth, mirrorController.revokeToken);
router.post('/prefill/enqueue', verifyAuth, mirrorEventsController.enqueuePrefill);`,
    verifyCommands: [
      `rg "router.post\\('/token|/token/refresh|/token/revoke|/prefill/enqueue" -n crosslister-backend/routes/mirrorRoutes.js`,
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/routes/mirrorRoutes.js',
    ],
  },
  {
    id: 'resell-auth-middleware-header-verify',
    project: 'resell',
    subsection: 'Security / Auth Proof',
    claim: 'Mirror auth middleware enforces token presence and verified claims before processing.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'crosslister-backend/middleware/verifyMirrorAuth.js',
    lineStart: 1,
    snippet: `const token = req.headers['x-mirror-token'] || '';
if (!token) return res.status(401).json({ error: 'Missing mirror token' });
const claims = mirrorTokenService.verifyToken(token);
req.mirror = claims;
next();`,
    verifyCommands: [
      `rg "x-mirror-token|Missing mirror token|verifyToken\\(token\\)" -n crosslister-backend/middleware`,
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/middleware/verifyMirrorAuth.js',
    ],
  },
  {
    id: 'resell-ownership-assertion',
    project: 'resell',
    subsection: 'Distributed Locking & State Proof',
    claim: 'Ownership guard requires matching browser/install identifiers for protected transitions.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'crosslister-backend/services/syncJobTracker.js',
    lineStart: 1,
    snippet: `if (!browserId || !installId) {
  throw new ApiError('Missing ownership identifiers.', 403);
}
const row = await supabase.from(TABLE)
  .select('*')
  .eq('owner_browser_id', browserId)
  .eq('owner_install_id', installId)
  .maybeSingle();`,
    verifyCommands: [
      'rg "Missing ownership identifiers|owner_browser_id|owner_install_id|assertOwnership" -n crosslister-backend/services/syncJobTracker.js',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/services/syncJobTracker.js',
    ],
  },
  {
    id: 'resell-job-running-heartbeat-write',
    project: 'resell',
    subsection: 'Realtime / Coordination Proof',
    claim: 'Running-state write persists ownership and heartbeat timestamp for live job coordination.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'crosslister-backend/services/syncJobTracker.js',
    lineStart: 1,
    snippet: `const updatePayload = {
  status: MIRROR_JOB_STATUS.RUNNING,
  last_heartbeat: new Date().toISOString(),
  owner_browser_id: ownerBrowserId || null,
  owner_install_id: ownerInstallId || null,
  owner_tab_id: ownerTabId || null,
};`,
    verifyCommands: [
      'rg "MIRROR_JOB_STATUS\\.RUNNING|last_heartbeat|owner_browser_id|owner_install_id|owner_tab_id" -n crosslister-backend/services/syncJobTracker.js',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/services/syncJobTracker.js',
    ],
  },
  {
    id: 'resell-replay-queue-persistence',
    project: 'resell',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Replay queue persists in chrome.storage.local and dedupes queued job entries.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'extension/src/background/replayQueue.ts',
    lineStart: 4,
    snippet: `const replayQueueKey = 'replay_queue';
const queue = await getReplayQueue();
const exists = queue.find((q) => q.jobId === jobId);
if (exists) return;
await chrome.storage.local.set({ [replayQueueKey]: next });`,
    verifyCommands: [
      'rg "replay_queue|enqueueReplay|const exists = queue.find|chrome.storage.local.set" -n extension/src/background/replayQueue.ts',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/background/replayQueue.ts',
    ],
  },
  {
    id: 'resell-replay-request-dispatch',
    project: 'resell',
    subsection: 'Reliability Proof (Retries / Idempotency / Dedupe)',
    claim: 'Reconnect recovery dispatches mirror replay requests with queued job IDs and runtime identity.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'extension/src/background/connectionManager.ts',
    lineStart: 1,
    snippet: `const queue = await getReplayQueue();
if (!queue.length) return;
const jobIds = queue.map((q) => q.jobId);
send({
  type: 'mirror:replay_request',
  payload: { jobIds, browserId: BROWSER_ID, installId: INSTALL_ID },
});`,
    verifyCommands: [
      'rg "mirror:replay_request|jobIds|getReplayQueue|installId: INSTALL_ID" -n extension/src/background',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/background/connectionManager.ts',
    ],
  },
  {
    id: 'resell-lockmanager-ttl-autorelease',
    project: 'resell',
    subsection: 'Distributed Locking & State Proof',
    claim: 'Lock manager supports TTL refresh, auto-release, and active-lock count telemetry.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'extension/src/background/lockManager.js',
    lineStart: 15,
    snippet: `export function acquireLock(id, ttl = 60000) {
  if (locks.has(id)) {
    const lock = locks.get(id);
    clearTimeout(lock.timeout);
    lock.timeout = setTimeout(() => handleAutoRelease(id), ttl);
  } else {
    const timeout = setTimeout(() => handleAutoRelease(id), ttl);
    locks.set(id, { timeout, expiresAt: Date.now() + ttl });
  }
}
export function getLockCount() { return locks.size; }`,
    verifyCommands: [
      'rg "acquireLock|handleAutoRelease|getLockCount|ttl = 60000" -n extension/src/background/lockManager.js',
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/background/lockManager.js',
    ],
  },
  {
    id: 'resell-observability-correlated-events',
    project: 'resell',
    subsection: 'Realtime / Coordination Proof',
    claim: 'Runtime events emit correlation fields including jobId/importRunId/runId/installId.',
    commit: '88afbafd4b316197a0f0f1b6c85cf43dbe7527f8',
    file: 'extension/src/background/index.js',
    lineStart: 1,
    snippet: `logEvent('terminal_sent', {
  jobId: jobId || importRunId,
  importRunId,
  runId: RUN_ID,
  installId: INSTALL_ID,
});
notifyApp(type, { ...payload, runId: RUN_ID, installId: INSTALL_ID });`,
    verifyCommands: [
      `rg "terminal_sent|importRunId|runId: RUN_ID|installId: INSTALL_ID|notifyApp\\(type" -n extension/src/background/index.js`,
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:extension/src/background/index.js',
    ],
  },
  {
    id: 'ai-runtime-project-entrypoint',
    project: 'ai',
    subsection: 'Pipeline Contract & Runtime Surface',
    claim: 'Project identity and canonical CLI entrypoint are explicitly declared in packaging metadata.',
    commit: 'NOT FOUND',
    file: 'pyproject.toml',
    lineStart: 1,
    snippet: `[project]
name = "fashion_video_pipeline"
version = "0.1.0"
requires-python = ">=3.10"

[project.scripts]
fashion = "cli.main:app"`,
    verifyCommands: [
      'nl -ba pyproject.toml',
      `rg -n "name = \\"fashion_video_pipeline\\"|project\\.scripts|fashion = \\"cli\\.main:app\\"" pyproject.toml`,
    ],
  },
  {
    id: 'ai-runtime-command-map',
    project: 'ai',
    subsection: 'Pipeline Contract & Runtime Surface',
    claim: 'CLI command routing is explicit and maps each runtime stage to a callable command handler.',
    commit: 'NOT FOUND',
    file: 'cli/main.py',
    lineStart: 1,
    snippet: `app.command("doctor")(doctor.run)
app.command("prepare-assets")(prepare_assets.run)
app.command("train-identity")(train_identity.run)
app.command("generate-still")(generate_still.run)
app.command("apply-garment")(apply_tryon.run)
app.command("render-scene")(render_blender.run)
app.command("enhance-video")(enhance_video.run)
app.command("assemble-long-video")(assemble_long_video.run)
app.command("export")(export.run)`,
    verifyCommands: [
      'nl -ba cli/main.py',
      'rg -n "app.command\\(" cli/main.py',
    ],
  },
  {
    id: 'ai-runtime-required-run-id',
    project: 'ai',
    subsection: 'Pipeline Contract & Runtime Surface',
    claim: 'Runtime contract enforces a required FVP_RUN_ID and raises on missing value.',
    commit: 'NOT FOUND',
    file: 'cli/core/paths.py',
    lineStart: 1,
    snippet: `def run_id() -> str:
    rid = os.environ.get("FVP_RUN_ID", "")
    if not rid:
        raise RuntimeError("FVP_RUN_ID is required")
    return rid`,
    verifyCommands: [
      'nl -ba cli/core/paths.py',
      `rg -n "FVP_RUN_ID|RuntimeError\\(\\"FVP_RUN_ID is required\\"" cli/core/paths.py`,
    ],
  },
  {
    id: 'ai-runtime-run-scoped-dirs',
    project: 'ai',
    subsection: 'Pipeline Contract & Runtime Surface',
    claim: 'Outputs are guaranteed to be run-scoped under root/kind/run_id with idempotent directory creation.',
    commit: 'NOT FOUND',
    file: 'cli/core/paths.py',
    lineStart: 1,
    snippet: `def run_dir(kind: str) -> Path:
    p = root() / kind / run_id()
    p.mkdir(parents=True, exist_ok=True)
    return p`,
    verifyCommands: [
      'nl -ba cli/core/paths.py',
      `rg -n "def run_dir|exist_ok=True|root\\(\\) / kind / run_id\\(\\)" cli/core/paths.py`,
    ],
  },
  {
    id: 'ai-runtime-canonical-sequence',
    project: 'ai',
    subsection: 'Pipeline Contract & Runtime Surface',
    claim: 'Canonical production run path is encoded as a fixed six-stage command sequence.',
    commit: 'NOT FOUND',
    file: 'scripts/run_demo.sh',
    lineStart: 1,
    snippet: `micromamba run -n fashion_video_env fashion doctor
micromamba run -n fashion_video_env fashion prepare-assets
micromamba run -n fashion_video_env fashion apply-garment ...
micromamba run -n fashion_video_env fashion render-scene ...
micromamba run -n fashion_video_env fashion enhance-video ...
micromamba run -n fashion_video_env fashion export ...`,
    verifyCommands: [
      'nl -ba scripts/run_demo.sh',
      'rg -n "fashion (doctor|prepare-assets|apply-garment|render-scene|enhance-video|export)" scripts/run_demo.sh',
    ],
  },
  {
    id: 'ai-orch-dci-vton-seed-contract',
    project: 'ai',
    subsection: 'Deterministic Orchestration & Artifact Lineage',
    claim: 'DCI-VTON invocation is deterministic through fixed seed, sample count, and canonical input dimensions.',
    commit: 'NOT FOUND',
    file: 'cli/core/ai_ops.py',
    lineStart: 1,
    snippet: `cmd = [
  "python", "/home/dom/fashion_video_pipeline/third_party/dci_vton/test.py",
  "--n_samples", "1",
  "--seed", "555",
  "--H", "512",
  "--W", "512",
]`,
    verifyCommands: [
      'nl -ba cli/core/ai_ops.py',
      'rg -n "dci_vton/test.py|--n_samples|--seed|--H|--W" cli/core/ai_ops.py',
    ],
  },
  {
    id: 'ai-orch-generate-still-deterministic',
    project: 'ai',
    subsection: 'Deterministic Orchestration & Artifact Lineage',
    claim: 'Still-generation stage applies fixed seed and deterministic post-run filename replacement.',
    commit: 'NOT FOUND',
    file: 'cli/commands/generate_still.py',
    lineStart: 1,
    snippet: `out_path = root() / "assets" / "humans" / "prepared" / f"human_prepared_{identity}_run_{run_id()}.png"
...
"--seed", "555",
...
candidates = sorted(out_path.parent.glob("*.png"))
if candidates:
    candidates[0].replace(out_path)`,
    verifyCommands: [
      'nl -ba cli/commands/generate_still.py',
      'rg -n "seed|run_id\\(|candidates\\[0\\]\\.replace" cli/commands/generate_still.py',
    ],
  },
  {
    id: 'ai-orch-apply-tryon-artifact-name',
    project: 'ai',
    subsection: 'Deterministic Orchestration & Artifact Lineage',
    claim: 'Try-on output naming embeds run_id for stable artifact lineage across stages.',
    commit: 'NOT FOUND',
    file: 'cli/commands/apply_tryon.py',
    lineStart: 1,
    snippet: `final = out_dir / f"tryon_human_run_{run_id()}.png"
result.replace(final)`,
    verifyCommands: [
      'nl -ba cli/commands/apply_tryon.py',
      'rg -n "tryon_human_run_|run_id\\(\\)|result\\.replace" cli/commands/apply_tryon.py',
    ],
  },
  {
    id: 'ai-orch-blender-binary-pinning',
    project: 'ai',
    subsection: 'Deterministic Orchestration & Artifact Lineage',
    claim: 'Rendering stage pins blender binary, scene file, and render script by absolute path.',
    commit: 'NOT FOUND',
    file: 'cli/core/blender_ops.py',
    lineStart: 1,
    snippet: `BLENDER_BIN = Path("/home/dom/fashion_video_pipeline/blender/project_template/tools/blender-3.6.23-linux-x64/blender")
cmd = [
  str(BLENDER_BIN), "-b",
  "/home/dom/fashion_video_pipeline/blender/project_template/scene_template.blend",
  "-P", "/home/dom/fashion_video_pipeline/blender/scripts/render_headless.py",
]`,
    verifyCommands: [
      'nl -ba cli/core/blender_ops.py',
      'rg -n "blender-3\\.6\\.23|scene_template\\.blend|render_headless\\.py" cli/core/blender_ops.py',
    ],
  },
  {
    id: 'ai-orch-render-frame-contract',
    project: 'ai',
    subsection: 'Deterministic Orchestration & Artifact Lineage',
    claim: 'Render stage derives deterministic frame boundaries from duration and FPS contract.',
    commit: 'NOT FOUND',
    file: 'blender/scripts/render_headless.py',
    lineStart: 1,
    snippet: `scene.render.fps = args.fps
w, h = args.resolution.split("x")
scene.render.resolution_x = int(w)
scene.render.resolution_y = int(h)
frame_count = args.duration_seconds * args.fps
scene.frame_start = 1
scene.frame_end = frame_count`,
    verifyCommands: [
      'nl -ba blender/scripts/render_headless.py',
      'rg -n "fps|resolution|frame_count|frame_end" blender/scripts/render_headless.py',
    ],
  },
  {
    id: 'ai-orch-export-preset-contract',
    project: 'ai',
    subsection: 'Deterministic Orchestration & Artifact Lineage',
    claim: 'Export stage is preset-driven and emits deterministic output pathing from profile configuration.',
    commit: 'NOT FOUND',
    file: 'cli/commands/export.py',
    lineStart: 1,
    snippet: `cfg = load_preset(preset)
out_dir = run_dir("exports")
out_path = out_dir / f"export_{preset}_run_{run_id()}.mp4"
run_ffmpeg_export(input, str(out_path), cfg["resolution"], cfg["fps"], cfg["crf"], cfg["preset"])`,
    verifyCommands: [
      'nl -ba cli/commands/export.py',
      'rg -n "load_preset|export_.*run_|run_ffmpeg_export" cli/commands/export.py',
    ],
  },
  {
    id: 'ai-gpu-doctor-dxg-check',
    project: 'ai',
    subsection: 'GPU Runtime & Environment Boundary',
    claim: 'Doctor command enforces WSL GPU passthrough by requiring /dev/dxg visibility.',
    commit: 'NOT FOUND',
    file: 'cli/commands/doctor.py',
    lineStart: 1,
    snippet: `if not wsl.has_dxg():
    print("FAIL: /dev/dxg")
    sys.exit(1)`,
    verifyCommands: [
      'nl -ba cli/commands/doctor.py',
      'rg -n "dxg|FAIL: /dev/dxg|sys.exit\\(1\\)" cli/commands/doctor.py',
    ],
  },
  {
    id: 'ai-gpu-doctor-rocm-version-gate',
    project: 'ai',
    subsection: 'GPU Runtime & Environment Boundary',
    claim: 'Doctor command hard-gates runtime on expected ROCm torch version prefix.',
    commit: 'NOT FOUND',
    file: 'cli/commands/doctor.py',
    lineStart: 1,
    snippet: `if not torch.__version__.startswith("2.6.0+rocm6.4.2"):
    print("FAIL: ROCm userland")
    sys.exit(1)`,
    verifyCommands: [
      'nl -ba cli/commands/doctor.py',
      'rg -n "torch.__version__|rocm6\\.4\\.2|FAIL: ROCm userland" cli/commands/doctor.py',
    ],
  },
  {
    id: 'ai-gpu-explicit-device-selection',
    project: 'ai',
    subsection: 'GPU Runtime & Environment Boundary',
    claim: 'Try-on model invocation explicitly selects GPU device 0.',
    commit: 'NOT FOUND',
    file: 'cli/core/ai_ops.py',
    lineStart: 1,
    snippet: `"python", "/home/dom/fashion_video_pipeline/third_party/dci_vton/test.py",
"--plms", "--gpu_id", "0",
"--ddim_steps", str(steps),`,
    verifyCommands: [
      'nl -ba cli/core/ai_ops.py',
      'rg -n "--gpu_id|dci_vton/test.py" cli/core/ai_ops.py',
    ],
  },
  {
    id: 'ai-gpu-vram-helper-boundary',
    project: 'ai',
    subsection: 'GPU Runtime & Environment Boundary',
    claim: 'GPU memory boundary helper is implemented via direct device property introspection.',
    commit: 'NOT FOUND',
    file: 'cli/core/gpu.py',
    lineStart: 1,
    snippet: `import torch

def vram_gb() -> int:
    return int(torch.cuda.get_device_properties(0).total_memory / (1024**3))`,
    verifyCommands: [
      'nl -ba cli/core/gpu.py',
      'rg -n "get_device_properties\\(0\\)|total_memory" cli/core/gpu.py',
    ],
  },
  {
    id: 'ai-gpu-rocm-pinned-requirements',
    project: 'ai',
    subsection: 'GPU Runtime & Environment Boundary',
    claim: 'ROCm dependency boundary is encoded with pinned framework versions and ROCm-specific wheel sources.',
    commit: 'NOT FOUND',
    file: 'third_party/kohya_ss/requirements_linux_rocm.txt',
    lineStart: 1,
    snippet: `--extra-index-url https://download.pytorch.org/whl/rocm6.3
--find-links https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.1
torch==2.7.1+rocm6.3
torchvision==0.22.1+rocm6.3
onnxruntime-rocm==1.21.0`,
    verifyCommands: [
      'nl -ba third_party/kohya_ss/requirements_linux_rocm.txt',
      'rg -n "rocm|torch==|onnxruntime-rocm" third_party/kohya_ss/requirements_linux_rocm.txt',
    ],
  },
  {
    id: 'ai-failure-enhance-forced-fallback',
    project: 'ai',
    subsection: 'Failure Controls & Recovery Paths',
    claim: 'Enhancement stage supports deterministic forced fallback mode for operational recovery.',
    commit: 'NOT FOUND',
    file: 'cli/commands/enhance_video.py',
    lineStart: 1,
    snippet: `if force_fallback == "ffmpeg_grade":
    run_ffmpeg_fallback(input, str(out_path))
    print("Enhancement complete")
    return`,
    verifyCommands: [
      'nl -ba cli/commands/enhance_video.py',
      'rg -n "force_fallback|ffmpeg_grade|run_ffmpeg_fallback" cli/commands/enhance_video.py',
    ],
  },
  {
    id: 'ai-failure-enhance-exception-fallback',
    project: 'ai',
    subsection: 'Failure Controls & Recovery Paths',
    claim: 'Enhancement stage degrades to ffmpeg fallback when primary model inference fails.',
    commit: 'NOT FOUND',
    file: 'cli/commands/enhance_video.py',
    lineStart: 1,
    snippet: `try:
    run_hummingbird_xt(input, str(out_path), cfg["num_inference_steps"], cfg["diffusion_strength"])
except Exception:
    run_ffmpeg_fallback(input, str(out_path))`,
    verifyCommands: [
      'nl -ba cli/commands/enhance_video.py',
      'rg -n "run_hummingbird_xt|except Exception|run_ffmpeg_fallback" cli/commands/enhance_video.py',
    ],
  },
  {
    id: 'ai-failure-doctor-fail-fast',
    project: 'ai',
    subsection: 'Failure Controls & Recovery Paths',
    claim: 'Doctor stage exits non-zero on missing GPU/runtime prerequisites.',
    commit: 'NOT FOUND',
    file: 'cli/commands/doctor.py',
    lineStart: 1,
    snippet: `if not blender.exists():
    print("FAIL: Blender")
    sys.exit(1)
...
except Exception:
    print("FAIL: ffmpeg")
    sys.exit(1)`,
    verifyCommands: [
      'nl -ba cli/commands/doctor.py',
      'rg -n "FAIL: Blender|FAIL: ffmpeg|sys.exit\\(1\\)" cli/commands/doctor.py',
    ],
  },
  {
    id: 'ai-failure-assemble-input-guard',
    project: 'ai',
    subsection: 'Failure Controls & Recovery Paths',
    claim: 'Assembly stage hard-fails when no input videos are present.',
    commit: 'NOT FOUND',
    file: 'cli/commands/assemble_long_video.py',
    lineStart: 1,
    snippet: `vids = sorted(Path(input_dir).glob("*.mp4"))
if not vids:
    raise FileNotFoundError("No input videos found")`,
    verifyCommands: [
      'nl -ba cli/commands/assemble_long_video.py',
      'rg -n "No input videos found|glob\\(\"\\*\\.mp4\"\\)" cli/commands/assemble_long_video.py',
    ],
  },
  {
    id: 'ai-failure-subprocess-check-true',
    project: 'ai',
    subsection: 'Failure Controls & Recovery Paths',
    claim: 'Core execution paths use subprocess check=True so command failures propagate immediately.',
    commit: 'NOT FOUND',
    file: 'cli/core/ai_ops.py',
    lineStart: 1,
    snippet: `subprocess.run(cmd, check=True)
...
subprocess.run([
    "ffmpeg", "-y", "-i", input_video,
    "-vf", "eq=contrast=1.1:saturation=1.05:brightness=0.02,unsharp=3:3:0.5:3:3:0.0",
    "-c:v", "libx264", "-crf", "18", "-preset", "slow",
    output_video,
], check=True)`,
    verifyCommands: [
      'nl -ba cli/core/ai_ops.py',
      'rg -n "subprocess.run\\(.*check=True|ffmpeg" cli/core/ai_ops.py',
    ],
  },
  {
    id: 'ai-trace-structured-logger-available',
    project: 'ai',
    subsection: 'Traceability, Observability & Safety',
    claim: 'Structured UTC logging helper exists for pipeline runtime instrumentation.',
    commit: 'NOT FOUND',
    file: 'cli/core/logging.py',
    lineStart: 1,
    snippet: `def log(msg: str) -> None:
    ts = datetime.utcnow().isoformat() + "Z"
    print(f"[FVP {ts}] {msg}")`,
    verifyCommands: [
      'nl -ba cli/core/logging.py',
      'rg -n "utcnow|\\[FVP" cli/core/logging.py',
    ],
  },
  {
    id: 'ai-trace-runid-output-correlation',
    project: 'ai',
    subsection: 'Traceability, Observability & Safety',
    claim: 'Run correlation is embedded in generated artifact names across render and enhancement stages.',
    commit: 'NOT FOUND',
    file: 'blender/scripts/render_headless.py',
    lineStart: 1,
    snippet: `run_id = os.environ.get("FVP_RUN_ID", "run")
out_path = out_dir / f"render_{args.scene}_run_{run_id}.mp4"`,
    verifyCommands: [
      'nl -ba blender/scripts/render_headless.py',
      'rg -n "run_\\{|FVP_RUN_ID|render_.*_run_" blender/scripts/render_headless.py cli/commands/enhance_video.py',
    ],
  },
  {
    id: 'ai-safety-subprocess-argv-usage',
    project: 'ai',
    subsection: 'Traceability, Observability & Safety',
    claim: 'Media execution commands use argv-style subprocess invocation rather than shell interpolation.',
    commit: 'NOT FOUND',
    file: 'cli/core/video_ops.py',
    lineStart: 1,
    snippet: `subprocess.run([
  "ffmpeg", "-y", "-i", input_path,
  "-vf", f"scale={w}:{h},fps={fps}",
  "-c:v", "libx264", "-crf", str(crf), "-preset", preset,
  output_path
], check=True)`,
    verifyCommands: [
      'nl -ba cli/core/video_ops.py',
      'rg -n "subprocess.run\\(\\[|ffmpeg" cli/core/video_ops.py cli/core/ai_ops.py',
    ],
  },
];

const subsectionRemap: Record<ProofProject, Record<string, string>> = {
  crm: {
    'Architecture Proof': 'System Contract',
    'AI / LLM Engineering Proof': 'Execution Path',
    'Security / Auth Proof': 'State Integrity',
    'Tenant Isolation Proof': 'State Integrity',
    'Reliability Proof (Retries / Idempotency / Dedupe)': 'Failure Behavior',
    'Database Integrity & Audit Proof': 'Operational Traceability',
    'Performance Proof (Indexes / Query path)': 'Execution Path',
  },
  resell: {
    'Architecture Proof': 'System Contract',
    'Security / Auth Proof': 'State Integrity',
    'Realtime / Coordination Proof': 'Execution Path',
    'Distributed Locking & State Proof': 'State Integrity',
    'Reliability Proof (Retries / Idempotency / Dedupe)': 'Failure Behavior',
  },
  ai: {
    'Pipeline Contract & Runtime Surface': 'System Contract',
    'Deterministic Orchestration & Artifact Lineage': 'Execution Path',
    'GPU Runtime & Environment Boundary': 'State Integrity',
    'Failure Controls & Recovery Paths': 'Failure Behavior',
    'Traceability, Observability & Safety': 'Operational Traceability',
  },
};

const proofSubsectionOverrides: Record<string, string> = {
  'resell-observability-correlated-events': 'Operational Traceability',
};

export const proofItems: ProofItem[] = rawProofItems.map((item) => ({
  ...item,
  subsection:
    proofSubsectionOverrides[item.id] ??
    subsectionRemap[item.project][item.subsection] ??
    item.subsection,
}));

export type ProofProject = 'crm' | 'resell';

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
      'Architecture Proof',
      'Security / Auth Proof',
      'Tenant Isolation Proof',
      'Reliability Proof (Retries / Idempotency / Dedupe)',
      'Performance Proof (Indexes / Query path)',
    ],
  },
  resell: {
    title: 'Resell Tool',
    subsections: [
      'Architecture Proof',
      'Security / Auth Proof',
      'Realtime / Coordination Proof',
      'Reliability Proof (Retries / Idempotency / Dedupe)',
    ],
  },
};

export const proofItems: ProofItem[] = [
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
    id: 'crm-tenant-rls-not-found',
    project: 'crm',
    subsection: 'Tenant Isolation Proof',
    claim: 'Status: Not present in repo at time of audit.',
    commit: 'NOT FOUND',
    file: 'supabase/migrations',
    lineStart: null,
    snippet: `NOT FOUND
Search command used: rg -n "^[[:space:]]*(CREATE POLICY|ALTER POLICY|ALTER TABLE .* ENABLE ROW LEVEL SECURITY)" supabase/migrations`,
    verifyCommands: [
      `rg -n "^[[:space:]]*(CREATE POLICY|ALTER POLICY|ALTER TABLE .* ENABLE ROW LEVEL SECURITY)" supabase/migrations`,
    ],
    status: 'not_present',
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
      'git show 88afbafd4b316197a0f0f1b6c85cf43dbe7527f8:crosslister-backend/controllers/mirrorEventsController.js',
    ],
  },
];

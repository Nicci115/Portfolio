• 1) Full database schema (DDL)
  Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64

  File: supabase/
  migrations/20250727000000_create_lead_creation_trigger.sql:1
  Code:

  CREATE OR REPLACE FUNCTION public.log_lead_creation()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.activity_log (user_id, workspace_id, activity_type,
  activity_data)
    VALUES (NEW.agent_id, NEW.workspace_id, 'lead_created',
  jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.name));
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER log_lead_creation_trigger
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_creation();

  Why this is the artifact: This file defines a production trigger function
  and trigger for lead creation logging.

  File: supabase/
  migrations/20250729100000_create_calendly_events_table.sql:1
  Code:

  DROP TABLE IF EXISTS calendly_events;

  CREATE TABLE calendly_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      calendly_event_uri TEXT UNIQUE NOT NULL,
      event_type_uri TEXT NOT NULL,
      invitee_uri TEXT NOT NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Assuming a
  'leads' table exists
      status TEXT NOT NULL DEFAULT 'active',
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      event_name TEXT,
      invitee_email TEXT NOT NULL,
      invitee_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_payload JSONB
  );

  CREATE TRIGGER set_updated_at_calendly_events
  BEFORE UPDATE ON calendly_events
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

  Why this is the artifact: This file defines a production table and update
  trigger for Calendly events.

  File: supabase/migrations/20250730000000_create_default_availability.sql:1
  Code:

  CREATE OR REPLACE FUNCTION trigger_set_timestamp()
  RETURNS TRIGGER AS $
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $ LANGUAGE plpgsql;

  CREATE TABLE default_availability (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      availability_rules JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON default_availability
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

  Why this is the artifact: This file defines a production trigger function,
  table, and trigger for default availability.

  File: supabase/migrations/20250730000001_create_calendly_event_types.sql:1
  Code:

  CREATE TABLE calendly_event_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      calendly_uri TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      duration INT NOT NULL,
      description TEXT,
      availability_rule JSONB,
      scheduling_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TRIGGER set_updated_at_calendly_event_types
  BEFORE UPDATE ON calendly_event_types
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

  Why this is the artifact: This file defines a production table and trigger
  for Calendly event type records.

  File: supabase/migrations/20250731120000_add_ai_summary_to_leads.sql:1
  Code:

  ALTER TABLE public.leads ADD COLUMN ai_summary TEXT;

  Why this is the artifact: This file applies production schema DDL on the
  leads table.

  File: supabase/migrations/20250731120001_create_automation_settings.sql:1
  Code:


  CREATE TABLE public.automation_settings (
      id uuid NOT NULL DEFAULT uuid_generate_v4(),
      workspace_id uuid NOT NULL,
      automation_name TEXT NOT NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      requires_approval BOOLEAN NOT NULL DEFAULT false,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT automation_settings_pkey PRIMARY KEY (id),
      CONSTRAINT automation_settings_workspace_id_fkey FOREIGN KEY
  (workspace_id) REFERENCES public.workspaces(id),
      CONSTRAINT automation_settings_workspace_id_automation_name_key UNIQUE
  (workspace_id, automation_name)
  );

  COMMENT ON TABLE public.automation_settings IS 'Stores settings for AI
  automations on a per-workspace basis.';
  COMMENT ON COLUMN public.automation_settings.automation_name IS 'The
  unique name of the automation, e.g., ''ai_lead_summary''.';
  COMMENT ON COLUMN public.automation_settings.is_enabled IS 'Whether the
  automation is active for the workspace.';
  COMMENT ON COLUMN public.automation_settings.requires_approval IS 'Whether
  the automation requires manual user approval before executing.';

  Why this is the artifact: This file defines a production automation
  settings table with PK, FK, and unique constraint.

  File: supabase/migrations/20250731130000_create_crm_connections.sql:1
  Code:

  CREATE TABLE public.crm_connections (
      id uuid NOT NULL DEFAULT uuid_generate_v4(),
      workspace_id uuid NOT NULL,
      crm_type TEXT NOT NULL, -- e.g., 'INTERNAL', 'HUBSPOT', 'SALESFORCE'
      credentials JSONB NOT NULL, -- Will be encrypted
      is_active BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'DISCONNECTED', -- e.g., 'CONNECTED',
  'ERROR', 'DISCONNECTED'
      status_message TEXT,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT crm_connections_pkey PRIMARY KEY (id),
      CONSTRAINT crm_connections_workspace_id_fkey FOREIGN KEY
  (workspace_id) REFERENCES public.workspaces(id)
  );

  -- Create the conditional uniqueness constraint separately
  CREATE UNIQUE INDEX crm_connections_workspace_id_is_active_idx
  ON public.crm_connections (workspace_id)
  WHERE is_active = true;

  COMMENT ON TABLE public.crm_connections IS 'Stores connection details and
  credentials for external CRMs.';
  COMMENT ON COLUMN public.crm_connections.credentials IS 'Encrypted API
  keys, OAuth tokens, etc.';

  Why this is the artifact: This file defines a production CRM connections
  table and conditional unique index.

  File: supabase/migrations/20250731130001_add_source_crm_to_leads.sql:1
  Code:

  ALTER TABLE public.leads ADD COLUMN source_crm TEXT;
  ALTER TABLE public.leads ADD COLUMN source_crm_id TEXT;

  CREATE INDEX idx_leads_source_crm_id ON public.leads(source_crm_id);

  Why this is the artifact: This file applies production leads-table schema
  changes and index creation.

  File: supabase/migrations/20250731150000_refine_leads_table.sql:1
  Code:

  ALTER TABLE public.leads DROP COLUMN IF EXISTS ai_followup_enabled;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS smart_scheduler_enabled;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS offer_bot_enabled;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS negotiation_agent_enabled;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS follow_up_enabled;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS follow_up_channels;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS last_contact;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS preferred_contact;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS school_preferences;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS pets;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS work_needs;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS walkability;
  ALTER TABLE public.leads DROP COLUMN IF EXISTS must_have_features;

  Why this is the artifact: This file applies production DDL refinements to
  the leads table schema.

  File: supabase/migrations/20250731160000_add_workspace_id_to_offers.sql:1
  Code:

  ALTER TABLE public.offers ADD COLUMN workspace_id UUID;
  ALTER TABLE public.offers ADD CONSTRAINT fk_offers_workspace_id FOREIGN
  KEY (workspace_id) REFERENCES public.workspaces(id);
  CREATE INDEX idx_offers_workspace_id ON public.offers(workspace_id);

  Why this is the artifact: This file adds production offer tenant keying,
  FK constraint, and index.

  File: supabase/
  migrations/20250731170000_add_workspace_id_to_activities.sql:1
  Code:

  ALTER TABLE public.activities ADD COLUMN workspace_id UUID;
  ALTER TABLE public.activities ADD CONSTRAINT fk_activities_workspace_id
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
  CREATE INDEX idx_activities_workspace_id ON
  public.activities(workspace_id);

  Why this is the artifact: This file adds production activity tenant
  keying, FK constraint, and index.

  File: supabase/
  migrations/20250731180000_add_workspace_id_to_calendly_event_types.sql:1
  Code:


  ALTER TABLE public.calendly_event_types
  ADD COLUMN workspace_id uuid;

  ALTER TABLE public.calendly_event_types
  ADD CONSTRAINT fk_calendly_event_types_workspace_id
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);

  -- Optional: Update existing rows with a default workspace_id if
  applicable
  -- For now, we'll leave it nullable and handle in application logic.
  -- If you want to backfill, you'd need to determine the appropriate
  workspace_id for existing user_id entries.
  -- UPDATE public.calendly_event_types
  -- SET workspace_id = (SELECT workspace_id FROM public.workspace_users
  WHERE user_id = calendly_event_types.user_id LIMIT 1)
  -- WHERE workspace_id IS NULL;

  -- Make the column NOT NULL after backfilling if desired
  -- ALTER TABLE public.calendly_event_types
  -- ALTER COLUMN workspace_id SET NOT NULL;

  Why this is the artifact: This file adds production workspace foreign-key
  enforcement to Calendly event types.

  File: supabase/
  migrations/20250731190000_create_user_notification_settings.sql:1
  Code:

  -- Create user_notification_settings table
  CREATE TABLE public.user_notification_settings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    email_general boolean NOT NULL DEFAULT TRUE,
    sms_general boolean NOT NULL DEFAULT FALSE,
    new_lead_assigned boolean NOT NULL DEFAULT TRUE,
    meeting_scheduled boolean NOT NULL DEFAULT TRUE,
    ai_followup_sent boolean NOT NULL DEFAULT TRUE,
    lead_status_change boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL DEFAULT
  timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT
  timezone('utc'::text, now()),
    CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id),
    CONSTRAINT fk_user_notification_settings_user_id FOREIGN KEY (user_id)
  REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_notification_settings_workspace_id FOREIGN KEY
  (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
    CONSTRAINT user_notification_settings_user_id_workspace_id_key UNIQUE
  (user_id, workspace_id)
  );

  -- Add RLS policies (to be manually configured by user later)
  -- ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL
  SECURITY;
  -- CREATE POLICY "Users can view their own notification settings." ON
  public.user_notification_settings FOR SELECT USING (auth.uid() = user_id);
  -- CREATE POLICY "Users can update their own notification settings." ON
  public.user_notification_settings FOR UPDATE USING (auth.uid() = user_id);
  -- CREATE POLICY "Users can insert their own notification settings." ON
  public.user_notification_settings FOR INSERT WITH CHECK (auth.uid() =
  user_id);

  -- Create a trigger to update the 'updated_at' column automatically
  CREATE TRIGGER set_updated_at_user_notification_settings
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  -- Note: The 'set_updated_at' function must exist in your Supabase
  project.
  -- If not, you'll need to create it:
  -- CREATE OR REPLACE FUNCTION public.set_updated_at()
  -- RETURNS TRIGGER AS $$
  -- BEGIN
  --   NEW.updated_at = now();
  --   RETURN NEW;
  -- END;
  -- $$ LANGUAGE plpgsql;

  Why this is the artifact: This file defines a production table with PK/FK/
  unique constraints and an update trigger.

  File: supabase/migrations/20250801120000_add_hubspot_id_to_leads.sql:1
  Code:

  ALTER TABLE public.leads ADD COLUMN hubspot_id TEXT;

  Why this is the artifact: This file applies production DDL that extends
  leads with external CRM mapping.

  File: supabase/
  migrations/20250801130000_add_ai_columns_to_activity_log.sql:1
  Code:

  ALTER TABLE public.activity_log ADD COLUMN is_ai BOOLEAN DEFAULT false;
  ALTER TABLE public.activity_log ADD COLUMN workflow_name TEXT;
  ALTER TABLE public.activity_log ADD COLUMN trigger_type TEXT;
  ALTER TABLE public.activity_log ADD COLUMN notes TEXT;

  Why this is the artifact: This file applies production schema changes to
  activity log structure.

  File: supabase/
  migrations/20250801140000_add_raw_payload_to_calendly_events.sql:1
  Code:

  ALTER TABLE public.calendly_events ADD COLUMN raw_payload JSONB;

  Why this is the artifact: This file applies production schema DDL for
  Calendly payload persistence.

  File: supabase/
  migrations/20250801150000_add_description_to_activity_log.sql:1
  Code:

  ALTER TABLE public.activity_log ADD COLUMN description TEXT;

  Why this is the artifact: This file applies production DDL for activity
  description storage.

  File: supabase/
  migrations/20250801160000_add_loaded_sample_listings_to_activity_type_enum
  .sql:1
  Code:

  ALTER TYPE public.activity_type ADD VALUE 'Loaded Sample Listings';

  Why this is the artifact: This file applies production enum-type DDL for
  activity taxonomy.

  File: supabase/
  migrations/20250801170000_add_lead_updated_to_activity_type_enum.sql:1
  Code:

  ALTER TYPE public.activity_type ADD VALUE 'Lead Updated';

  Why this is the artifact: This file applies production enum-type DDL for
  activity taxonomy.

  File: supabase/
  migrations/20250801180000_add_unique_constraint_to_user_id_in_user_notific
  ation_settings.sql:1
  Code:

  ALTER TABLE public.user_notification_settings ADD CONSTRAINT
  user_notification_settings_user_id_key UNIQUE (user_id);

  Why this is the artifact: This file applies a production unique constraint
  on notification settings.

  File: supabase/migrations/20250802100000_create_sms_conversations.sql:1
  Code:

  -- Migration for sms_conversations table

  CREATE TABLE public.sms_conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending_reply', -- e.g., pending_reply,
  reply_received, time_confirmed, error
      last_message_sid TEXT, -- To store the SID of the last message sent
      lead_phone_number TEXT NOT NULL, -- Denormalized for quick lookup from
  Twilio webhook
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_sms_conversations_lead_phone_number_status ON
  public.sms_conversations(lead_phone_number, status);

  -- Assume trigger_set_timestamp function already exists
  CREATE TRIGGER set_updated_at_sms_conversations
  BEFORE UPDATE ON public.sms_conversations
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

  Why this is the artifact: This file defines a production table, composite
  index, and trigger for SMS conversation processing.

  File: supabase/migrations/20250802100001_create_scheduled_jobs.sql:1
  Code:

  -- Migration for scheduled_jobs table

  CREATE TABLE public.scheduled_jobs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_type TEXT NOT NULL, -- e.g., 'AI_DISCOVERY_CALL'
      lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, processing,
  completed, failed
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_scheduled_jobs_status_scheduled_for ON
  public.scheduled_jobs(status, scheduled_for);

  -- Assume trigger_set_timestamp function already exists
  CREATE TRIGGER set_updated_at_scheduled_jobs
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

  Why this is the artifact: This file defines the production scheduled-jobs
  table, index, and trigger used by async processing.

  File: supabase/migrations/20250806100000_create_user_sync_trigger.sql:1
  Code:


  create or replace function public.handle_new_user()
  returns trigger as $$
  begin
    insert into public.agents (id, email, name)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name');
    return new;
  end;
  $$ language plpgsql security definer;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

  Why this is the artifact: This file defines a production function and
  trigger syncing auth users into the agents table.

  File: supabase/
  migrations/20250806100001_standardize_fks_to_auth_users.sql:1
  Code:


  -- Standardize foreign keys to point to auth.users(id) instead of
  public.agents(id)

  -- Drop existing foreign key constraints
  ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS fk_deals_agent_id;
  ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS
  fk_invitations_inviting_user_id;
  ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS fk_leads_agent_id;
  ALTER TABLE public.negotiations DROP CONSTRAINT IF EXISTS
  fk_negotiations_agent_id;
  ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS fk_offers_agent_id;
  ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS
  fk_support_tickets_assigned_to;

  -- Add new foreign key constraints referencing auth.users(id)
  ALTER TABLE public.deals ADD CONSTRAINT fk_deals_agent_id FOREIGN KEY
  (agent_id) REFERENCES auth.users(id);
  ALTER TABLE public.invitations ADD CONSTRAINT
  fk_invitations_inviting_user_id FOREIGN KEY (inviting_user_id) REFERENCES
  auth.users(id);
  ALTER TABLE public.leads ADD CONSTRAINT fk_leads_agent_id FOREIGN KEY
  (agent_id) REFERENCES auth.users(id);
  ALTER TABLE public.negotiations ADD CONSTRAINT fk_negotiations_agent_id
  FOREIGN KEY (agent_id) REFERENCES auth.users(id);
  ALTER TABLE public.offers ADD CONSTRAINT fk_offers_agent_id FOREIGN KEY
  (agent_id) REFERENCES auth.users(id);
  ALTER TABLE public.support_tickets ADD CONSTRAINT
  fk_support_tickets_assigned_to FOREIGN KEY (assigned_to) REFERENCES
  auth.users(id);

  Why this is the artifact: This file applies production FK constraint
  standardization across tenant data tables.

  File: supabase/migrations/20250806100002_create_tasks_table.sql:1
  Code:


  CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone NOT NULL DEFAULT
  timezone('utc'::text, now()),
    description text,
    status text NOT NULL DEFAULT 'pending'::text,
    priority text NOT NULL DEFAULT 'medium'::text,
    assigned_to uuid REFERENCES auth.users(id),
    lead_id uuid REFERENCES public.leads(id),
    workspace_id uuid REFERENCES public.workspaces(id),
    CONSTRAINT tasks_pkey PRIMARY KEY (id)
  );

  Why this is the artifact: This file defines the production tasks table and
  key constraints.

  File: supabase/migrations/20250806100003_create_ai_prompt_logs_table.sql:1
  Code:


  CREATE TABLE public.ai_prompt_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone NOT NULL DEFAULT
  timezone('utc'::text, now()),
    workflow_name text,
    lead_id uuid REFERENCES public.leads(id),
    prompt text,
    response text,
    is_valid boolean,
    validation_error text,
    CONSTRAINT ai_prompt_logs_pkey PRIMARY KEY (id)
  );

  Why this is the artifact: This file defines the production AI prompt log
  table and foreign key to leads.

  File: supabase/
  migrations/20250810_add_automation_state_updated_to_activity_type_enum.sql
  :1
  Code:

  ALTER TYPE public.activity_type ADD VALUE 'Automation State Updated';

  Why this is the artifact: This file applies production enum-type DDL for
  activity classification.

  File: supabase/migrations/20250811_add_all_activity_types_to_enum.sql:1
  Code:

  ALTER TYPE public.activity_type ADD VALUE 'User.Login.EmailPassword';
  ALTER TYPE public.activity_type ADD VALUE 'User.Register.EmailPassword';
  ALTER TYPE public.activity_type ADD VALUE 'User.Login.Google.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'UI.AuthMode.Toggled';
  ALTER TYPE public.activity_type ADD VALUE 'User.Register.Invitation';
  ALTER TYPE public.activity_type ADD VALUE 'User.Email.Verified';
  ALTER TYPE public.activity_type ADD VALUE 'User.Logout';
  ALTER TYPE public.activity_type ADD VALUE 'UI.Navigation.Click';
  ALTER TYPE public.activity_type ADD VALUE 'Workspace.Switched';
  ALTER TYPE public.activity_type ADD VALUE 'UI.GuidedTour.Started';
  ALTER TYPE public.activity_type ADD VALUE 'System.Confetti.Displayed';
  ALTER TYPE public.activity_type ADD VALUE 'Lead.Add.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Lead.Created';
  ALTER TYPE public.activity_type ADD VALUE 'Lead.Viewed';
  ALTER TYPE public.activity_type ADD VALUE 'Lead.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Lead.Deleted';
  ALTER TYPE public.activity_type ADD VALUE 'Lead.Filter.Status.Applied';
  ALTER TYPE public.activity_type ADD VALUE 'Lead.Search.Performed';
  ALTER TYPE public.activity_type ADD VALUE 'Lead.Notes.Saved';
  ALTER TYPE public.activity_type ADD VALUE 'Listing.Connect.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Listing.SampleData.Loaded';
  ALTER TYPE public.activity_type ADD VALUE 'Listing.Source.Add.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Listing.Created';
  ALTER TYPE public.activity_type ADD VALUE 'Listing.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Listing.Deleted';
  ALTER TYPE public.activity_type ADD VALUE 'Workspace.Create.Initiated';
  ALTER TYPE public.activity_type ADD VALUE
  'Workspace.Members.Edit.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'User.Invite.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Workspace.Member.Data.Viewed/
  Edited';
  ALTER TYPE public.activity_type ADD VALUE
  'Workspace.Member.Role.Edit.Initiated';
  ALTER TYPE public.activity_type ADD VALUE
  'Workspace.Member.Deactivate.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Admin.User.Invited';
  ALTER TYPE public.activity_type ADD VALUE 'Admin.Agent.Role.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Admin.Agent.Deleted';
  ALTER TYPE public.activity_type ADD VALUE
  'Admin.Agent.Role.Edit.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Inbox.Lead.Selected';
  ALTER TYPE public.activity_type ADD VALUE 'Inbox.Message.Sent';
  ALTER TYPE public.activity_type ADD VALUE 'Inbox.AISuggestion.Used';
  ALTER TYPE public.activity_type ADD VALUE 'Inbox.Message.Edit.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Inbox.Message.Edited';
  ALTER TYPE public.activity_type ADD VALUE 'Inbox.Message.ApprovedAndSent';
  ALTER TYPE public.activity_type ADD VALUE 'Inbox.Message.Cancelled';
  ALTER TYPE public.activity_type ADD VALUE
  'Inbox.Message.Status.Update.Failed';
  ALTER TYPE public.activity_type ADD VALUE 'ActivityHistory.Tab.Switched';
  ALTER TYPE public.activity_type ADD VALUE
  'ActivityHistory.Page.Navigated';
  ALTER TYPE public.activity_type ADD VALUE 'Onboarding.Step.Completed';
  ALTER TYPE public.activity_type ADD VALUE 'Onboarding.Tour.Skipped';
  ALTER TYPE public.activity_type ADD VALUE 'Onboarding.Tour.Started';
  ALTER TYPE public.activity_type ADD VALUE 'Calendly.Connect.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Calendly.Sync.Initiated';
  ALTER TYPE public.activity_type ADD VALUE 'Calendly.Event.Viewed';
  ALTER TYPE public.activity_type ADD VALUE
  'Calendly.ScheduleEvent.Modal.Opened';
  ALTER TYPE public.activity_type ADD VALUE
  'Calendly.EventType.Modal.Opened';
  ALTER TYPE public.activity_type ADD VALUE 'Calendly.EventType.Saved';
  ALTER TYPE public.activity_type ADD VALUE 'Calendly.EventType.Deleted';
  ALTER TYPE public.activity_type ADD VALUE 'Calendly.TeamCalendar.Toggled';
  ALTER TYPE public.activity_type ADD VALUE
  'Calendly.SchedulingLink.Created';
  ALTER TYPE public.activity_type ADD VALUE 'Agent.Workspace.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Agent.Created';
  ALTER TYPE public.activity_type ADD VALUE 'Agent.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Agent.Role.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Workspace.Created';
  ALTER TYPE public.activity_type ADD VALUE 'Workspace.Member.Added';
  ALTER TYPE public.activity_type ADD VALUE 'Workspace.Member.Role.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Workspace.Member.Removed';
  ALTER TYPE public.activity_type ADD VALUE 'Workspace.Members.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Automation.State.Updated';
  ALTER TYPE public.activity_type ADD VALUE 'Message Sent';

  Why this is the artifact: This file applies production enum-type DDL
  expanding the activity type domain.

  ———

  2) All RLS policies
  NOT FOUND
  Search command used: rg -n "^[[:space:]]*(CREATE POLICY|ALTER POLICY|ALTER
  TABLE .* ENABLE ROW LEVEL SECURITY)" supabase/migrations

  ———

  3) One complete endpoint flow
  Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64

  File: api/routes/leadRoutes.js:13
  Code:

  // GET /api/leads/:id
  router.get('/:id', leadService.getLeadById);

  Why this is the artifact: This is the route handler entrypoint for the
  endpoint flow.

  File: api/services/leadService.js:117
  Code:

  async getLeadById(req, res) {
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
  }

  Why this is the artifact: This is the service-layer method invoked by the
  route handler.

  File: api/services/CrmAdapterFactory.js:7
  Code:

  async getAdapter(workspaceId, userId, providedCredentials = null) {
      let credentialsToUse = providedCredentials;

      if (!credentialsToUse) {
          if (!workspaceId) {
              // Default to the internal Supabase adapter if no workspace is
  specified and no credentials provided
              return new SupabaseAdapter();
          }

          const { data: connection, error } = await supabase
              .from('crm_connections')
              .select('crm_type, credentials')
              .eq('workspace_id', workspaceId)
              .eq('is_active', true)
              .single();

          if (error && error.code !== 'PGRST116') { // Ignore 'no rows
  found' error
              throw error;
          }

          if (!connection) {
              // No active external CRM, use the internal one
              return new SupabaseAdapter();
          }

  Why this is the artifact: This service resolves the DB-backed adapter used
  by the endpoint flow.

  File: api/adapters/SupabaseAdapter.js:5
  Code:

  async getLead(id, workspaceId) {
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
  }

  Why this is the artifact: This is the terminal DB query in the endpoint
  execution chain.

  ———

  4) One idempotent automation workflow
  Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64

  File: api/routes/automationRoutes.js:19
  Code:

  // PUT /api/automations/:workspaceId
  router.put('/:workspaceId', auth, async (req, res) => {
      try {
          const { workspaceId } = req.params;
          const { automationName, isEnabled } = req.body;
          const performingUserId = req.user ? req.user.id : null; // Extract
  performingUserId

          const updated = await
  automationService.updateAutomationState(workspaceId, automationName,
  isEnabled, performingUserId); // Pass performingUserId
          res.json(updated);
      } catch (error) {
          console.error('Error in PUT /automations/:workspaceId:', error);
          res.status(500).json({ error: error.message });
      }
  });

  Why this is the artifact: This is the trigger point for the idempotent
  automation-state workflow.

  File: api/services/automationService.js:29
  Code:

  // Fetch current state for logging old_value
  const { data: currentSetting, error: fetchError } = await supabaseAdmin
      .from('automation_settings')
      .select('is_enabled')
      .eq('workspace_id', workspaceId)
      .eq('automation_name', automationName)
      .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching current automation setting for
  logging:', fetchError);
  }
  const oldIsEnabled = currentSetting?.is_enabled;

  Why this is the artifact: This is the persistence check against existing
  state before mutation.

  File: api/services/automationService.js:42
  Code:

  const { data, error } = await supabaseAdmin
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
      .select();

  if (error) {
      console.error('Supabase error updating automation setting:', error);
      throw error;
  }

  Why this is the artifact: This mutation is idempotent via the explicit
  conflict key (workspace_id, automation_name).

  File: api/services/automationService.js:63
  Code:

  await activityLogService.createActivityLog({
      user_id: performingUserId, // Use the passed performingUserId
      workspace_id: workspaceId,
      activity_type: 'Automation.State.Updated',
      description: `Automation '${automationName}' ${isEnabled ? 'enabled' :
  'disabled'}.`,
      old_value: oldIsEnabled,
      new_value: isEnabled,
      metadata: { automation_name: automationName },
      status: 'success',
  });

  Why this is the artifact: This is the outbound action emitted after the
  idempotent state transition.

  ———

  5) One background worker example
  Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64

  File: backend/job_scheduler_worker.json:6
  Code:

  {
    "parameters": {
      "rule": {
        "interval": [
          {
            "value": 1,
            "unit": "minutes"
          }
        ]
      }
    },
    "name": "Cron",
    "type": "n8n-nodes-base.cron",
    "typeVersion": 1,
    "position": [250, 300],
    "id": "cron_trigger_uuid"
  },
  {
    "parameters": {
      "resource": "table",
      "operation": "select",
      "table": "scheduled_jobs",
      "query": "status.eq.pending&scheduled_for.lte.{{new
  Date().toISOString()}}",
      "select": "*"
    },
    "name": "Fetch Due Jobs",
    "type": "n8n-nodes-base.supabase",
    "typeVersion": 1,
    "position": [450, 300],
    "id": "fetch_due_jobs_uuid"
  }

  Why this is the artifact: This is the worker entrypoint and queue-consumer
  selection of due jobs.

  File: backend/job_scheduler_worker.json:43
  Code:

  {
    "parameters": {
      "url": "{{$env.BACKEND_API_URL}}/api/voice/initiate-call",
      "method": "POST",
      "body": [
        { "name": "leadId", "value": "{{$json.lead_id}}" },
        { "name": "userId", "value": "{{$json.user_id}}" }
      ],
      "options": {}
    },
    "name": "Initiate AI Call",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 1,
    "position": [650, 300],
    "id": "initiate_ai_call_uuid"
  },
  {
    "parameters": {
      "resource": "table",
      "operation": "update",
      "table": "scheduled_jobs",
      "query": "id.eq.{{$json.id}}",
      "data": [
        { "name": "status", "value": "completed" }
      ],
      "options": {}
    },
    "name": "Update Job Status",
    "type": "n8n-nodes-base.supabase",
    "typeVersion": 1,
    "position": [850, 300],
    "id": "update_job_status_uuid"
  }

  Why this is the artifact: This is the worker handler and ack path (status
  = completed).

  File: supabase/migrations/20250802100001_create_scheduled_jobs.sql:3
  Code:

  CREATE TABLE public.scheduled_jobs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_type TEXT NOT NULL, -- e.g., 'AI_DISCOVERY_CALL'
      lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, processing,
  completed, failed
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  Why this is the artifact: This schema defines the worker queue state model
  including terminal failure fields (failed, attempts, last_error).

  File: api/services/jobSchedulerService.js:47
  Code:

  async updateJobStatus(jobId, newStatus, attempts, lastError) {
      try {
          const { data, error } = await supabase
              .from('scheduled_jobs')
              .update({
                  status: newStatus,
                  attempts: attempts,
                  last_error: lastError,
                  updated_at: new Date()
              })
              .eq('id', jobId)
              .select();

          if (error) {
              console.error('Error updating job status:', error);
              throw error;
          }
          return data[0];
      } catch (error) {
          console.error('Failed to update job status:', error);
          throw error;
      }
  }

  Why this is the artifact: This is the explicit failure-path status
  mutation interface for worker jobs.

  ———

  6) Logging structure sample
  Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64

  File: api/services/activityLogService.js:45
  Code:

  const createActivityLog = async ({ user_id, workspace_id, activity_type,
  description, old_value = null, new_value = null, lead_id = null, agent_id
  = null, metadata = {} }) => {
      try {
          // Combine explicit parameters into metadata for storage in
  activity_data JSONB column
          const activity_data = {
              ...metadata,
              ...(old_value !== null && { old_value }),
              ...(new_value !== null && { new_value }),
              ...(lead_id !== null && { lead_id }),
              ...(agent_id !== null && { agent_id }),
          };

          const { data, error } = await supabase
              .from('activity_log')
              .insert({
                  user_id,
                  workspace_id,
                  activity_type,
                  description,
                  activity_data, // Store combined metadata
              })
              .select();

          if (error) {
              console.error('Error creating activity log:', error);
              throw error;
          }
          console.log('Activity log created:', data);
          return data;
      } catch (error) {
          console.error('Failed to create activity log:', error);
          throw error;
      }
  };

  Why this is the artifact: This defines the structured logging payload
  schema persisted into activity_log.

  File: api/routes/messagesRoutes.js:7
  Code:

  router.post('/log-activity', async (req, res) => {
      const { userId, workspaceId, leadId, messageContent, messageType } =
  req.body;
      try {
          await activityLogService.createActivityLog({
              user_id: userId,
              workspace_id: workspaceId,
              lead_id: leadId,
              activity_type: 'Message Sent',
              description: `Message sent to lead ${leadId}:
  ${messageContent.substring(0, 50)}...`,
              metadata: { message_type: messageType, content:
  messageContent },
          });
          res.status(200).json({ message: 'Activity logged
  successfully.' });
      } catch (error) {
          console.error('Error logging message activity:', error);
          res.status(500).json({ error: 'Failed to log message
  activity.' });
      }
  });

  Why this is the artifact: This is a real emission path writing structured
  logs through the logging service.

  ———

  7) Queue or retry logic
  Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64

  File: backend/generate_profile_from_call_transcript.json:108
  Code:

  {
    "parameters": {
      "model": "gemini-pro",
      "prompt": "You are a meticulous data analyst. Analyze this complete
  call transcript: '{{$json.json.final_transcript}}'. Your task is twofold:
  1. Write a rich, narrative summary of the lead's personality, goals, and
  situation in a paragraph. 2. Extract the following data points precisely:
  `income`, `credit_score`, `down_payment`, `max_monthly_payment`,
  `pre_approval_status`, `household_size`. If a value was not mentioned,
  return null for that key. Return a single, valid JSON object with these
  keys.",
      "options": {
        "retryOnFail": true,
        "retryInterval": 5000,
        "retryAttempts": 1
      }
    },
    "name": "Generate Summary & Extract Data",
    "type": "n8n-nodes-base.googleGenerativeAi",
    "typeVersion": 1,
    "position": [650, 400],
    "id": "generate_summary_extract_data_uuid"
  }

  Why this is the artifact: This node encodes retry behavior with explicit
  backoff interval and retry count.

  File: backend/generate_profile_from_call_transcript.json:158
  Code:

  {
    "parameters": {
      "resource": "table",
      "operation": "insert",
      "table": "activity_log",
      "data": [
        { "name": "lead_id", "value": "{{$json.json.lead_id}}" },
        { "name": "user_id", "value": "{{$json.json.user_id}}" },
        { "name": "activity_type", "value": "Error" },
        { "name": "description", "value": "AI analysis of call with lead
  {{$json.json.lead_id}} failed. Please review transcript and enter data
  manually. Error: {{$json.json.error}}" },
        { "name": "is_ai", "value": true },
        { "name": "workflow_name", "value":
  "generate_profile_from_call_transcript" }
      ],
      "options": {}
    },
    "name": "Log AI Failure",
    "type": "n8n-nodes-base.supabase",
    "typeVersion": 1,
    "position": [950, 300],
    "id": "log_ai_failure_uuid"
  },
  {
    "parameters": {},
    "name": "Stop Workflow (AI Failure)",
    "type": "n8n-nodes-base.stop",
    "typeVersion": 1,
    "position": [1050, 300],
    "id": "stop_ai_failure_uuid"
  }

  Why this is the artifact: This is the terminal failure handling path after
  retries and validation fail.

  File: backend/generate_profile_from_call_transcript.json:356
  Code:

  "AI Output Valid?": {
    "main": [
      [
        {
          "node": "Save Enriched Data to Lead Profile",
          "type": "main",
          "index": 0
        }
      ]
    ],
    "else": [
      [
        {
          "node": "Log AI Failure",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Log AI Failure": {
    "main": [
      [
        {
          "node": "Stop Workflow (AI Failure)",
          "type": "main",
          "index": 0
        }
      ]
    ]
  }

  Why this is the artifact: This wiring shows the retry flow’s terminal
  branch to fail-stop behavior.

  ———

  8) Indexing strategy
  Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64

  File: supabase/migrations/20250731130000_create_crm_connections.sql:16
  Code:

  CREATE UNIQUE INDEX crm_connections_workspace_id_is_active_idx
  ON public.crm_connections (workspace_id)
  WHERE is_active = true;

  Why this is the artifact: This is a production partial unique index
  implementing one-active-CRM-per-workspace strategy.

  File: supabase/migrations/20250731130001_add_source_crm_to_leads.sql:4
  Code:

  CREATE INDEX idx_leads_source_crm_id ON public.leads(source_crm_id);

  Why this is the artifact: This is a production index for external CRM ID
  lookup on leads.

  File: supabase/migrations/20250731160000_add_workspace_id_to_offers.sql:3
  Code:

  CREATE INDEX idx_offers_workspace_id ON public.offers(workspace_id);

  Why this is the artifact: This is a production tenant-partitioning index
  on offers.

  File: supabase/
  migrations/20250731170000_add_workspace_id_to_activities.sql:3
  Code:

  CREATE INDEX idx_activities_workspace_id ON
  public.activities(workspace_id);

  Why this is the artifact: This is a production tenant-partitioning index
  on activities.

  File: supabase/migrations/20250802100000_create_sms_conversations.sql:15
  Code:

  CREATE INDEX idx_sms_conversations_lead_phone_number_status ON
  public.sms_conversations(lead_phone_number, status);

  Why this is the artifact: This is a production composite index for SMS
  conversation lookup by phone and status.

  File: supabase/migrations/20250802100001_create_scheduled_jobs.sql:16
  Code:

  CREATE INDEX idx_scheduled_jobs_status_scheduled_for ON
  public.scheduled_jobs(status, scheduled_for);

  Why this is the artifact: This is a production composite index for due-job
  retrieval by state and schedule time.

  File: api/services/smsConversationService.js:30
  Code:

  async findSmsConversation(leadPhoneNumber, status) {
      try {
          const { data, error } = await supabase
              .from('sms_conversations')
              .select('*')
              .eq('lead_phone_number', leadPhoneNumber)
              .eq('status', status)
              .limit(1)
              .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 means no
  rows found
              console.error('Error finding SMS conversation:', error);
              throw error;
          }
          return data;
      } catch (error) {
          console.error('Failed to find SMS conversation:', error);
          throw error;
      }
  }

  Why this is the artifact: This representative query matches the indexed
  key order (lead_phone_number, status).

  ———

  9) Tenant isolation enforcement explanation via code
  Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64

  File: api/middleware/auth.js:4
  Code:

  const protect = async (req, res, next) => {
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
  };

  Why this is the artifact: This middleware enforces authenticated API
  identity before tenant-scoped operations.

  File: api/index.js:75
  Code:

  // Protected routes (authentication required)
  app.use(protect);
  app.use('/api', invitationRoutes);
  app.use('/api/activity-log', activityLogRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/workspaces', workspaceRoutes); // All workspace-related
  routes will be prefixed with /api/workspaces
  app.use('/api/automations', automationRoutes);
  app.use('/api/listings', listingRoutes);

  Why this is the artifact: This applies auth middleware to tenant data
  routes at the API boundary.

  File: api/adapters/SupabaseAdapter.js:5
  Code:

  async getLead(id, workspaceId) {
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
  }

  Why this is the artifact: This API-side data access applies workspace-
  bound filtering per request.

  File: supabase/
  migrations/20250731190000_create_user_notification_settings.sql:15
  Code:

  CONSTRAINT fk_user_notification_settings_user_id FOREIGN KEY (user_id)
  REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_notification_settings_workspace_id FOREIGN KEY
  (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT user_notification_settings_user_id_workspace_id_key UNIQUE
  (user_id, workspace_id)

  Why this is the artifact: This DB-side constraint set enforces valid
  workspace ownership linkage and per-user/workspace uniqueness.

  File: supabase/migrations/20250731120001_create_automation_settings.sql:11
  Code:

  CONSTRAINT automation_settings_workspace_id_fkey FOREIGN KEY
  (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT automation_settings_workspace_id_automation_name_key UNIQUE
  (workspace_id, automation_name)

  Why this is the artifact: This DB-side constraint set enforces tenant-key
  integrity and workspace-scoped uniqueness for automation state.


## RUN 2 QA

• - Section: RLS Inventory (HEAD)
  - Claim: SQL/script scan at HEAD yields one RLS reference location and it
    is commented out.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/
    migrations/20250731190000_create_user_notification_settings.sql:20-24
  - Snippet:

  table_name | rls_enabled | policies_found | source_file
  public.user_notification_settings | false | 3 commented CREATE POLICY; 1
  commented ENABLE ROW LEVEL SECURITY | supabase/
  migrations/20250731190000_create_user_notification_settings.sql:21-24

  - Verify commands:
  - rg "CREATE POLICY|ALTER POLICY|ENABLE ROW LEVEL SECURITY|DISABLE ROW
    LEVEL SECURITY" -n -g "*.sql" -g "*.ps1" -g "*.sh" -g "*.js" -g "*.ts"
    -g "*.json" .
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250731190000_create_user_notification_settings.sql
  - Section: RLS Inventory (HEAD)
  - Claim: The only RLS statements in production SQL are commented stubs for
    public.user_notification_settings.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/
    migrations/20250731190000_create_user_notification_settings.sql:21-24
  - Snippet:

  -- ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL
  SECURITY;
  -- CREATE POLICY "Users can view their own notification settings." ON
  public.user_notification_settings FOR SELECT USING (auth.uid() = user_id);
  -- CREATE POLICY "Users can update their own notification settings." ON
  public.user_notification_settings FOR UPDATE USING (auth.uid() = user_id);
  -- CREATE POLICY "Users can insert their own notification settings." ON
  public.user_notification_settings FOR INSERT WITH CHECK (auth.uid() =
  user_id);

  - Verify commands:
  - rg "ENABLE ROW LEVEL SECURITY|CREATE POLICY" -n supabase/
    migrations/20250731190000_create_user_notification_settings.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250731190000_create_user_notification_settings.sql
  - Section: RLS History Check
  - Claim: Git history contains only an initial addition of commented RLS
    lines and no removal diff for active policies.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/
    migrations/20250731190000_create_user_notification_settings.sql:20-24
  - Snippet:

  +-- Add RLS policies (to be manually configured by user later)
  +-- ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL
  SECURITY;
  +-- CREATE POLICY "Users can view their own notification settings." ON
  public.user_notification_settings FOR SELECT USING (auth.uid() = user_id);
  +-- CREATE POLICY "Users can update their own notification settings." ON
  public.user_notification_settings FOR UPDATE USING (auth.uid() = user_id);
  +-- CREATE POLICY "Users can insert their own notification settings." ON
  public.user_notification_settings FOR INSERT WITH CHECK (auth.uid() =
  user_id);

  - Verify commands:
  - rg "CREATE POLICY|ENABLE ROW LEVEL SECURITY" -n supabase/
    migrations/20250731190000_create_user_notification_settings.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250731190000_create_user_notification_settings.sql
  - Section: Tenant Boundary Proof (DB Constraints)
  - Claim: automation_settings is tenant-keyed by workspace_id FK and
    workspace-scoped uniqueness.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/
    migrations/20250731120001_create_automation_settings.sql:10-13
  - Snippet:

  CONSTRAINT automation_settings_pkey PRIMARY KEY (id),
  CONSTRAINT automation_settings_workspace_id_fkey FOREIGN KEY
  (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT automation_settings_workspace_id_automation_name_key UNIQUE
  (workspace_id, automation_name)

  - Verify commands:
  - rg "automation_settings_workspace_id_fkey|
    workspace_id_automation_name_key" -n supabase/
    migrations/20250731120001_create_automation_settings.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250731120001_create_automation_settings.sql
  - Section: Tenant Boundary Proof (DB Constraints)
  - Claim: user_notification_settings enforces tenant linkage via
    workspace_id FK plus per-user/workspace uniqueness.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/
    migrations/20250731190000_create_user_notification_settings.sql:15-17
  - Snippet:

  CONSTRAINT fk_user_notification_settings_user_id FOREIGN KEY (user_id)
  REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_notification_settings_workspace_id FOREIGN KEY
  (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT user_notification_settings_user_id_workspace_id_key UNIQUE
  (user_id, workspace_id)

  - Verify commands:
  - rg "fk_user_notification_settings_workspace_id|
    user_notification_settings_user_id_workspace_id_key" -n supabase/
    migrations/20250731190000_create_user_notification_settings.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250731190000_create_user_notification_settings.sql
  - Section: Tenant Boundary Proof (API Middleware)
  - Claim: All protected API routes require authenticated user context via
    protect middleware.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/index.js:75-83
  - Snippet:

  // Protected routes (authentication required)
  app.use(protect);
  app.use('/api', invitationRoutes);
  app.use('/api/activity-log', activityLogRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/workspaces', workspaceRoutes); // All workspace-related
  routes will be prefixed with /api/workspaces
  app.use('/api/automations', automationRoutes);
  app.use('/api/listings', listingRoutes);

  - Verify commands:
  - rg "Protected routes|app.use\\(protect\\)|/api/leads|/api/workspaces" -n
    api/index.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/index.js
  - Section: Tenant Boundary Proof (API Middleware)
  - Claim: protect resolves bearer token to a Supabase user and attaches
    req.user.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/middleware/auth.js:4-19
  - Snippet:

  const protect = async (req, res, next) => {
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

  - Verify commands:
  - rg "const protect|supabase.auth.getUser|req.user = user" -n api/
    middleware/auth.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/middleware/auth.js
  - Section: Tenant Boundary Proof (Query Filters)
  - Claim: Lead reads enforce workspace scoping when workspaceId is
    supplied.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/adapters/SupabaseAdapter.js:5-10
  - Snippet:

  async getLead(id, workspaceId) {
      let query = supabase.from('leads').select('*').eq('id', id);
      if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
      }
      const { data, error } = await query.maybeSingle();

  - Verify commands:
  - rg "getLead\\(id, workspaceId\\)|eq\\('workspace_id'" -n api/adapters/
    SupabaseAdapter.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/adapters/
    SupabaseAdapter.js
  - Section: Endpoint Chain (READ Step 1)
  - Claim: GET /api/leads/:id is wired to leadService.getLeadById.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/routes/leadRoutes.js:12-13
  - Snippet:

  // GET /api/leads/:id
  router.get('/:id', leadService.getLeadById);

  - Verify commands:
  - rg "GET /api/leads/:id|router.get\\('/:id'" -n api/routes/leadRoutes.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/routes/
    leadRoutes.js
  - Section: Endpoint Chain (READ Step 2)
  - Claim: Service layer calls adapter resolution then
    crmAdapter.getLead(id, workspaceId).
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/leadService.js:117-124
  - Snippet:

  async getLeadById(req, res) {
      const { id } = req.params;
      const { workspaceId } = req.query; // workspaceId might be null for
  owners

      try {
          const crmAdapter = await
  crmAdapterFactory.getAdapter(workspaceId);
          const lead = await crmAdapter.getLead(id, workspaceId);
          if (!lead) return res.status(404).json({ error: 'Lead not
  found' });

  - Verify commands:
  - rg "async getLeadById|crmAdapterFactory.getAdapter|crmAdapter.getLead"
    -n api/services/leadService.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    leadService.js
  - Section: Endpoint Chain (READ Step 3)
  - Claim: Adapter factory selects active CRM connection by workspace and
    falls back to SupabaseAdapter.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/CrmAdapterFactory.js:16-30
  - Snippet:

  const { data: connection, error } = await supabase
      .from('crm_connections')
      .select('crm_type, credentials')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .single();

  if (error && error.code !== 'PGRST116') { // Ignore 'no rows found' error
      throw error;
  }

  if (!connection) {
      // No active external CRM, use the internal one
      return new SupabaseAdapter();
  }

  - Verify commands:
  - rg "from\\('crm_connections'\\)|eq\\('workspace_id'|return new
    SupabaseAdapter" -n api/services/CrmAdapterFactory.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    CrmAdapterFactory.js
  - Section: Endpoint Chain (READ Step 4)
  - Claim: DB call is select('*') on leads with id and optional workspace_id
    filters.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/adapters/SupabaseAdapter.js:5-10
  - Snippet:

  async getLead(id, workspaceId) {
      let query = supabase.from('leads').select('*').eq('id', id);
      if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
      }
      const { data, error } = await query.maybeSingle();

  - Verify commands:
  - rg "from\\('leads'\\)\\.select\\('\\*'\\)\\.eq\\('id'|eq\
    \('workspace_id'" -n api/adapters/SupabaseAdapter.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/adapters/
    SupabaseAdapter.js
  - Section: Endpoint Chain (WRITE Step 1)
  - Claim: PUT /api/leads/:id is wired to leadService.updateLead.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/routes/leadRoutes.js:21-22
  - Snippet:

  // PUT /api/leads/:id
  router.put('/:id', leadService.updateLead);

  - Verify commands:
  - rg "PUT /api/leads/:id|router.put\\('/:id'" -n api/routes/leadRoutes.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/routes/
    leadRoutes.js
  - Section: Endpoint Chain (WRITE Step 2)
  - Claim: Service validates workspace and performs adapter-backed lead
    update.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/leadService.js:132-150
  - Snippet:

  async updateLead(req, res) {
      const { id } = req.params;
      const updates = req.body;
      const { workspaceId } = req.query;
      if (!workspaceId) {
          return res.status(400).json({ error: 'workspaceId is required' });
      }

      try {
          // Fetch old lead data for logging
          const crmAdapterForOldData = await
  crmAdapterFactory.getAdapter(workspaceId);
          const oldLead = await crmAdapterForOldData.getLead(id);

          // Validate input using Zod schema
          const validatedUpdates = updateLeadSchema.parse(updates);

          const crmAdapter = await
  crmAdapterFactory.getAdapter(workspaceId);
          const updatedLead = await crmAdapter.updateLead(id,
  validatedUpdates);

  - Verify commands:
  - rg "async updateLead|workspaceId is required|crmAdapter.updateLead" -n
    api/services/leadService.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    leadService.js
  - Section: Endpoint Chain (WRITE Step 3)
  - Claim: Adapter factory lookup for active CRM on workspace is invoked
    before update.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/CrmAdapterFactory.js:16-21
  - Snippet:

  const { data: connection, error } = await supabase
      .from('crm_connections')
      .select('crm_type, credentials')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .single();

  - Verify commands:
  - rg "from\\('crm_connections'\\)|eq\\('workspace_id'|eq\\('is_active'" -n
    api/services/CrmAdapterFactory.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    CrmAdapterFactory.js
  - Section: Endpoint Chain (WRITE Step 4)
  - Claim: The write DB mutation is update(updates).eq('id', id) on leads.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/adapters/SupabaseAdapter.js:18-21
  - Snippet:

  async updateLead(id, updates) {
      const { data, error } = await
  supabase.from('leads').update(updates).eq('id', id).select();
      if (error) throw error;
      return data[0];
  }

  - Verify commands:
  - rg "async updateLead\\(id, updates\\)|from\\('leads'\\)\\.update" -n
    api/adapters/SupabaseAdapter.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/adapters/
    SupabaseAdapter.js
  - Section: Transaction Safety Example
  - Claim: Lead insert side-effect logging is implemented as a DB trigger
    function executed on insert.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/
    migrations/20250727000000_create_lead_creation_trigger.sql:2-14
  - Snippet:

  CREATE OR REPLACE FUNCTION public.log_lead_creation()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.activity_log (user_id, workspace_id, activity_type,
  activity_data)
    VALUES (NEW.agent_id, NEW.workspace_id, 'lead_created',
  jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.name));
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER log_lead_creation_trigger
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_creation();

  - Verify commands:
  - rg "CREATE OR REPLACE FUNCTION public.log_lead_creation|CREATE TRIGGER
    log_lead_creation_trigger" -n supabase/
    migrations/20250727000000_create_lead_creation_trigger.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250727000000_create_lead_creation_trigger.sql
  - Section: Idempotency (Webhook Dedupe)
  - Claim: Webhook processing performs duplicate detection by raw_payload
    before continuing.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/calendlyService.js:273-283
  - Snippet:

  // Check for duplicate webhooks
  const { data: existingEvent, error: existingEventError } = await supabase
      .from('calendly_events')
      .select('id')
      .eq('raw_payload', payload)
      .single();

  if (existingEvent) {
      console.warn('Duplicate webhook received. Skipping processing.');
      return;
  }

  - Verify commands:
  - rg "Duplicate webhook received|raw_payload|from\\('calendly_events'\\)"
    -n api/services/calendlyService.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    calendlyService.js
  - Section: Idempotency (Webhook Upsert)
  - Claim: Calendly event writes are idempotent on calendly_event_uri
    conflict key.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/calendlyService.js:398-416
  - Snippet:

  // Insert into calendly_events table
  const { data: newCalendlyEvent, error: calendlyEventError } = await
  supabase
      .from('calendly_events')
      .upsert({
          calendly_event_uri: calendlyEventUri,
          event_type_uri: eventTypeUri,
          invitee_uri: inviteeUri,
          user_id: agentId, // Use the fetched agentId
          lead_id: leadId,
          status: eventStatus,
          start_time: startTime,
          end_time: endTime,
          event_name: eventName,
          invitee_email: inviteeEmail,
          invitee_name: inviteeName,
          raw_payload: payload,
          workspace_id: workspaceId, // Pass workspaceId
      }, { onConflict: 'calendly_event_uri' }) // Use upsert for idempotency
      .select();

  - Verify commands:
  - rg "onConflict: 'calendly_event_uri'|from\\('calendly_events'\\)\
    \.upsert" -n api/services/calendlyService.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    calendlyService.js
  - Section: Worker Reliability Internals (Queue Consumption)
  - Claim: Worker consumes pending due jobs from scheduled_jobs every
    minute.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: backend/job_scheduler_worker.json:16-31
  - Snippet:

  "name": "Cron",
  "type": "n8n-nodes-base.cron",
  ...
  {
    "parameters": {
      "resource": "table",
      "operation": "select",
      "table": "scheduled_jobs",
      "query": "status.eq.pending&scheduled_for.lte.{{new
  Date().toISOString()}}",
      "select": "*"
    },
    "name": "Fetch Due Jobs",
    "type": "n8n-nodes-base.supabase"
  }

  - Verify commands:
  - rg "Cron|Fetch Due Jobs|scheduled_jobs|status.eq.pending" -n backend/
    job_scheduler_worker.json
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/
    job_scheduler_worker.json
  - Section: Worker Reliability Internals (Status Transition)
  - Claim: Worker marks processed jobs as completed in scheduled_jobs.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: backend/job_scheduler_worker.json:59-70
  - Snippet:

  {
    "parameters": {
      "resource": "table",
      "operation": "update",
      "table": "scheduled_jobs",
      "query": "id.eq.{{$json.id}}",
      "data": [
        { "name": "status", "value": "completed" }
      ],
      "options": {}
    },
    "name": "Update Job Status",
    "type": "n8n-nodes-base.supabase"
  }

  - Verify commands:
  - rg "Update Job Status|status\\\", \\\"value\\\": \\\"completed\\\"|
    table\\\": \\\"scheduled_jobs\\\"" -n backend/job_scheduler_worker.json
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/
    job_scheduler_worker.json
  - Section: Worker Reliability Internals (Retry/Backoff)
  - Claim: AI generation step is configured with retry, interval, and
    attempt count.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: backend/generate_profile_from_call_transcript.json:108-115
  - Snippet:

  "parameters": {
    "model": "gemini-pro",
    "prompt": "You are a meticulous data analyst. Analyze this complete call
  transcript: '{{$json.json.final_transcript}}'. Your task is twofold: 1.
  Write a rich, narrative summary of the lead's personality, goals, and
  situation in a paragraph. 2. Extract the following data points precisely:
  `income`, `credit_score`, `down_payment`, `max_monthly_payment`,
  `pre_approval_status`, `household_size`. If a value was not mentioned,
  return null for that key. Return a single, valid JSON object with these
  keys.",
    "options": {
      "retryOnFail": true,
      "retryInterval": 5000,
      "retryAttempts": 1
    }
  }

  - Verify commands:
  - rg "retryOnFail|retryInterval|retryAttempts" -n backend/
    generate_profile_from_call_transcript.json
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/
    generate_profile_from_call_transcript.json
  - Section: Worker Reliability Internals (Terminal Failure Path)
  - Claim: Invalid AI output branches to Log AI Failure and then Stop
    Workflow (AI Failure).
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: backend/generate_profile_from_call_transcript.json:356-385
  - Snippet:

  "AI Output Valid?": {
    "main": [
      [
        {
          "node": "Save Enriched Data to Lead Profile",
          "type": "main",
          "index": 0
        }
      ]
    ],
    "else": [
      [
        {
          "node": "Log AI Failure",
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Log AI Failure": {
    "main": [
      [
        {
          "node": "Stop Workflow (AI Failure)",
          "type": "main",
          "index": 0
        }
      ]
    ]
  }

  - Verify commands:
  - rg "AI Output Valid\\?|Log AI Failure|Stop Workflow \\(AI Failure\\)" -n
    backend/generate_profile_from_call_transcript.json
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/
    generate_profile_from_call_transcript.json
  - Section: Worker Reliability Internals (Failure/Attempts Schema)
  - Claim: Queue schema stores status, attempts, and last_error for failure
    accounting.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/migrations/20250802100001_create_scheduled_jobs.sql:8-12
  - Snippet:

  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, processing,
  completed, failed
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  - Verify commands:
  - rg "status TEXT NOT NULL DEFAULT 'pending'|attempts INT|last_error" -n
    supabase/migrations/20250802100001_create_scheduled_jobs.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250802100001_create_scheduled_jobs.sql
  - Section: Worker Reliability Internals (Failure/Attempts Update API)
  - Claim: Job status updates accept newStatus, attempts, and lastError and
    persist them.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/jobSchedulerService.js:47-58
  - Snippet:

  async updateJobStatus(jobId, newStatus, attempts, lastError) {
      try {
          const { data, error } = await supabase
              .from('scheduled_jobs')
              .update({
                  status: newStatus,
                  attempts: attempts,
                  last_error: lastError,
                  updated_at: new Date()
              })
              .eq('id', jobId)
              .select();

  - Verify commands:
  - rg "updateJobStatus\\(|status: newStatus|attempts: attempts|last_error:
    lastError" -n api/services/jobSchedulerService.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    jobSchedulerService.js
  - Section: Observability Correlation
  - Claim: Workflow start log persists workflow, execution, lead, agent, and
    user identifiers and returns workflowLogId.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: backend/workflow_archive/utility_log_workflow_start.json:7-7
  - Snippet:

  const workflowName = items[0].json.workflowName;
  const workflowId = $workflow.id;
  const executionId = $workflow.executionId;
  const leadId = items[0].json.lead_id;
  const agentId = items[0].json.agent_id;
  const userId = items[0].json.user_id;
  const inputData = items[0].json.input_data;

  const logEntry = {
    workflow_name: workflowName,
    workflow_id: workflowId,
    execution_id: executionId,
    start_time: new Date().toISOString(),
    status: 'started',
    input_data: inputData
  };

  if (leadId) logEntry.lead_id = leadId;
  if (agentId) logEntry.agent_id = agentId;
  if (userId) logEntry.user_id = userId;

  const { data, error } = await
  n8n.supabase.from('workflow_logs').insert([logEntry]).select();

  if (error) {
    console.error('Error logging workflow start:', error);
  }

  return [{
    json: {
      ...items[0].json.input_data,
      workflowLogId: data && data.length > 0 ? data[0].id : null,
      start_time: new Date().toISOString()
    }
  }];

  - Verify commands:
  - rg "executionId|workflowLogId|lead_id|agent_id|user_id" -n backend/
    workflow_archive/utility_log_workflow_start.json
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/
    workflow_archive/utility_log_workflow_start.json
  - Section: Observability Correlation
  - Claim: Workflow end log updates the same record by workflowLogId with
    status, error, stack trace, and duration.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: backend/workflow_archive/utility_log_workflow_end.json:7-7
  - Snippet:

  const workflowLogId = items[0].json.workflowLogId;
  const status = items[0].json.status;
  const error_message = items[0].json.error_message;
  const stack_trace = items[0].json.stack_trace;
  const context = items[0].json.context;
  const startTime = items[0].json.start_time;

  const logEntry = {
    end_time: new Date().toISOString(),
    status: status,
    error_message: error_message,
    stack_trace: stack_trace,
    context: context
  };

  // Calculate duration if start_time is available
  if (startTime) {
    const start = new Date(startTime);
    const end = new Date();
    logEntry.duration_ms = end.getTime() - start.getTime();
  }

  const { data, error } = await
  n8n.supabase.from('workflow_logs').update(logEntry).eq('id',
  workflowLogId).select();

  if (error) {
    console.error('Error logging workflow end:', error);
  }

  return items;

  - Verify commands:
  - rg "workflowLogId|duration_ms|stack_trace|workflow_logs" -n backend/
    workflow_archive/utility_log_workflow_end.json
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:backend/
    workflow_archive/utility_log_workflow_end.json
  - Section: Observability Correlation
  - Claim: API activity logging structure explicitly stores user_id,
    workspace_id, activity_type, description, and composed activity_data.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/activityLogService.js:45-64
  - Snippet:

  const createActivityLog = async ({ user_id, workspace_id, activity_type,
  description, old_value = null, new_value = null, lead_id = null, agent_id
  = null, metadata = {} }) => {
      try {
          // Combine explicit parameters into metadata for storage in
  activity_data JSONB column
          const activity_data = {
              ...metadata,
              ...(old_value !== null && { old_value }),
              ...(new_value !== null && { new_value }),
              ...(lead_id !== null && { lead_id }),
              ...(agent_id !== null && { agent_id }),
          };

          const { data, error } = await supabase
              .from('activity_log')
              .insert({
                  user_id,
                  workspace_id,
                  activity_type,
                  description,
                  activity_data, // Store combined metadata
              })

  - Verify commands:
  - rg "createActivityLog|workspace_id|activity_data" -n api/services/
    activityLogService.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    activityLogService.js
  - Section: Performance Proof (Index)
  - Claim: Composite index exists for due-job retrieval path.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/migrations/20250802100001_create_scheduled_jobs.sql:16-16
  - Snippet:

  CREATE INDEX idx_scheduled_jobs_status_scheduled_for ON
  public.scheduled_jobs(status, scheduled_for);

  - Verify commands:
  - rg "idx_scheduled_jobs_status_scheduled_for" -n supabase/
    migrations/20250802100001_create_scheduled_jobs.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250802100001_create_scheduled_jobs.sql
  - Section: Performance Proof (Matching Query Path)
  - Claim: Due-job query filters by status and scheduled_for matching the
    composite index columns.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/jobSchedulerService.js:30-35
  - Snippet:

  const { data, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

  - Verify commands:
  - rg "from\\('scheduled_jobs'\\)|eq\\('status'|lte\\('scheduled_for'" -n
    api/services/jobSchedulerService.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    jobSchedulerService.js
  - Section: Performance Proof (Index)
  - Claim: Composite index exists for SMS conversation lookups by phone and
    status.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/
    migrations/20250802100000_create_sms_conversations.sql:15-15
  - Snippet:

  CREATE INDEX idx_sms_conversations_lead_phone_number_status ON
  public.sms_conversations(lead_phone_number, status);

  - Verify commands:
  - rg "idx_sms_conversations_lead_phone_number_status" -n supabase/
    migrations/20250802100000_create_sms_conversations.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250802100000_create_sms_conversations.sql
  - Section: Performance Proof (Matching Query Path)
  - Claim: SMS conversation query filters on lead_phone_number and status,
    matching the composite index.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/smsConversationService.js:33-38
  - Snippet:

  const { data, error } = await supabase
      .from('sms_conversations')
      .select('*')
      .eq('lead_phone_number', leadPhoneNumber)
      .eq('status', status)
      .limit(1)
      .single();

  - Verify commands:
  - rg "from\\('sms_conversations'\\)|eq\\('lead_phone_number'|eq\
    \('status'" -n api/services/smsConversationService.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    smsConversationService.js
  - Section: Performance Proof (Index)
  - Claim: Partial unique index exists on active CRM connection per
    workspace.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: supabase/migrations/20250731130000_create_crm_connections.sql:16-
    18
  - Snippet:

  CREATE UNIQUE INDEX crm_connections_workspace_id_is_active_idx
  ON public.crm_connections (workspace_id)
  WHERE is_active = true;

  - Verify commands:
  - rg "crm_connections_workspace_id_is_active_idx|WHERE is_active = true"
    -n supabase/migrations/20250731130000_create_crm_connections.sql
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:supabase/
    migrations/20250731130000_create_crm_connections.sql
  - Section: Performance Proof (Matching Query Path)
  - Claim: Adapter lookup query filters by workspace_id and is_active=true,
    matching the partial index predicate.
  - Commit: 67167aadc0b3defbcae8958b3e6b9b20ad062e64
  - File: api/services/CrmAdapterFactory.js:16-21
  - Snippet:

  const { data: connection, error } = await supabase
      .from('crm_connections')
      .select('crm_type, credentials')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .single();

  - Verify commands:
  - rg "from\\('crm_connections'\\)|eq\\('workspace_id'|eq\\('is_active'" -n
    api/services/CrmAdapterFactory.js
  - git show 67167aadc0b3defbcae8958b3e6b9b20ad062e64:api/services/
    CrmAdapterFactory.js
  - NOT FOUND Register
  - Missing requirement: Active CREATE POLICY / ALTER POLICY / ENABLE ROW
    LEVEL SECURITY / DISABLE ROW LEVEL SECURITY statements in executable
    SQL/scripts at HEAD.
  - Search commands used:
  - rg -n "CREATE POLICY|ALTER POLICY|ENABLE ROW LEVEL SECURITY|DISABLE ROW
    LEVEL SECURITY" -g "*.sql" -g "*.ps1" -g "*.sh" -g "*.js" -g "*.ts" -g
    "*.json" .
  - rg -n "^[[:space:]]*(CREATE POLICY|ALTER POLICY|ALTER TABLE .* ENABLE
    ROW LEVEL SECURITY|ALTER TABLE .* DISABLE ROW LEVEL SECURITY)" supabase/
    migrations
  - Missing requirement: Commits removing RLS policies.
  - Search commands used:
  - git log --all -p -G "CREATE POLICY|ALTER POLICY|ENABLE ROW LEVEL
    SECURITY|DISABLE ROW LEVEL SECURITY" -- supabase/migrations
  - git log --all --diff-filter=D --name-status -- "*policy*" "*rls*"
    "*.sql"
  - Missing requirement: Explicit COMMIT/ROLLBACK transaction blocks in
    runtime API/worker code.
  - Search commands used:
  - rg -n "\bBEGIN\b|\bCOMMIT\b|\bROLLBACK\b|transaction" api supabase
    backend Docs -g "*.sql" -g "*.js" -g "*.ts" -g "*.json"
  - Missing requirement: Active job-scheduler worker path writing
    scheduled_jobs.status='failed' in the current worker JSON.
  - Search commands used:
  - rg -n "scheduled_jobs" api backend supabase
  - rg -n "status.*failed|failed.*status" api backend supabase
  - Missing requirement: Request-level correlation fields (request_id/
    trace_id/correlation_id) in API/backend/supabase code.
  - Search commands used:
  - rg -n "request_id|trace_id|correlation_id" api backend supabase
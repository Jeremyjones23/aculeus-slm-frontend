create table if not exists workspaces (
  id text primary key,
  name text not null,
  slug text unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists aculeus_users (
  id text primary key,
  clerk_user_id text unique,
  email text not null unique,
  name text,
  organization text,
  role text not null default 'viewer',
  approval_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists workspace_memberships (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id text not null references aculeus_users(id) on delete cascade,
  role text not null default 'viewer',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists access_requests (
  id text primary key,
  email text not null,
  name text,
  organization text,
  requested_work text not null,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists cases (
  id text primary key,
  workspace_id text references workspaces(id) on delete set null,
  owner_user_id text references aculeus_users(id),
  title text not null,
  lead text not null,
  jurisdiction text,
  status text not null default 'intake',
  visibility text not null default 'private',
  case_spec jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sources (
  id text primary key,
  case_id text not null references cases(id) on delete cascade,
  title text not null,
  source_type text not null,
  visibility text not null default 'private',
  public_url text,
  blob_url text,
  artifact_name text,
  extraction_status text not null default 'pending',
  quality_score numeric(6, 3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists citations (
  id text primary key,
  source_id text not null references sources(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  claim_id text,
  page_number integer,
  row_label text,
  section_label text,
  text_span text,
  excerpt text not null,
  support_level text not null,
  created_at timestamptz not null default now()
);

create table if not exists runs (
  id text primary key,
  case_id text not null references cases(id) on delete cascade,
  user_id text references aculeus_users(id),
  status text not null,
  adapter_mode text not null,
  model_id text,
  state text not null default 'submitted',
  run_payload jsonb not null default '{}'::jsonb,
  cost_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists run_checkpoints (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  state text not null,
  label text not null,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists run_ledger_entries (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  case_id text references cases(id) on delete cascade,
  entry_type text not null,
  status text not null,
  labels jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  public_safe boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists candidate_sources (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  case_id text references cases(id) on delete cascade,
  source_family text not null,
  provider text,
  title text not null,
  public_url text,
  snippet text,
  quality_score numeric(6, 3),
  status text not null default 'candidate_lead_not_evidence',
  receipt_required boolean not null default true,
  evidence_promotion_allowed boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists receipts (
  id text primary key,
  candidate_source_id text references candidate_sources(id) on delete set null,
  source_id text references sources(id) on delete set null,
  run_id text references runs(id) on delete cascade,
  public_url text not null,
  content_hash text not null,
  content_type text,
  byte_length integer,
  storage_url text,
  captured_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists evidence_records (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  source_id text references sources(id) on delete set null,
  receipt_id text references receipts(id) on delete set null,
  claim text,
  support_level text not null,
  status text not null default 'reviewer_promoted',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists verifier_issues (
  id text primary key,
  run_id text references runs(id) on delete cascade,
  case_id text references cases(id) on delete cascade,
  evidence_record_id text references evidence_records(id) on delete cascade,
  severity text not null,
  issue_type text not null,
  message text not null,
  status text not null default 'open',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists reviewer_actions (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  case_id text references cases(id) on delete cascade,
  actor_user_id text references aculeus_users(id),
  action_type text not null,
  target_type text not null,
  target_id text not null,
  status text not null,
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists export_packets (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  export_type text not null,
  visibility text not null default 'private',
  status text not null default 'created',
  artifact_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists training_traces (
  id text primary key,
  run_id text references runs(id) on delete cascade,
  case_id text references cases(id) on delete cascade,
  trace_type text not null,
  payload jsonb not null default '{}'::jsonb,
  score_payload jsonb not null default '{}'::jsonb,
  reviewed boolean not null default false,
  public_safe boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_cases_workspace_id on cases(workspace_id);
create index if not exists idx_runs_case_id on runs(case_id);
create index if not exists idx_run_ledger_entries_run_id on run_ledger_entries(run_id);
create index if not exists idx_candidate_sources_run_id on candidate_sources(run_id);
create index if not exists idx_receipts_run_id on receipts(run_id);
create index if not exists idx_evidence_records_run_id on evidence_records(run_id);
create index if not exists idx_reviewer_actions_run_id on reviewer_actions(run_id);
create index if not exists idx_training_traces_run_id on training_traces(run_id);

alter table access_requests add column if not exists payload jsonb not null default '{}'::jsonb;
alter table cases add column if not exists workspace_id text references workspaces(id) on delete set null;
alter table cases add column if not exists jurisdiction text;
alter table cases add column if not exists case_spec jsonb not null default '{}'::jsonb;
alter table sources add column if not exists quality_score numeric(6, 3);
alter table sources add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table runs add column if not exists state text not null default 'submitted';
alter table runs add column if not exists run_payload jsonb not null default '{}'::jsonb;
alter table runs add column if not exists cost_summary jsonb not null default '{}'::jsonb;
alter table run_checkpoints add column if not exists payload jsonb not null default '{}'::jsonb;

-- Aculeus Salience / Media Layer (CYAN) — proposed next-stage schema.
--
-- Status: PROPOSED. Not yet implemented in code. Companion to docs/aculeus-product-schema.sql.
-- Design rule: BLUE binds claims to receipts; CYAN binds renders to claims.
-- A render may only ever consume promoted, receipt-backed evidence_records + citations.
-- Renderings vary in salience (frame, vocabulary, messenger, format) — never in substance.
--
-- Run topology: a render is its own media_run that references the approved source run.
-- Re-rendering or adding temperaments never mutates the original investigation run, and
-- amplification spend is tracked on the media_run, separate from investigation spend.
--
-- Substance-lock: HARD GATE. A render cannot reach status 'verified' (and therefore cannot
-- be approved or published) unless every rendered claim has a render_claim_binding to a
-- promoted evidence_record, the counter-case is present, and thin evidence is flagged.

-- The five (or N) audience definitions. Configuration, not generation.
-- Seeded from the deck framework: frame, asks, sounds-like lexicon, messengers, format prefs,
-- and forbidden moves per temperament. Versioned so a render records the profile it used.
create table if not exists temperament_profiles (
  id text primary key,
  profile_key text not null,                 -- far_left | left_of_center | center | right_of_center | far_right
  label text not null,
  frame text not null,                       -- e.g. "Power & exploitation"
  asks jsonb not null default '[]'::jsonb,    -- the questions this temperament asks
  lexicon jsonb not null default '{}'::jsonb, -- preferred / "sounds like" vocabulary
  messengers jsonb not null default '[]'::jsonb,
  format_prefs jsonb not null default '{}'::jsonb,
  forbidden jsonb not null default '[]'::jsonb, -- moves/words this temperament must never use
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_key, version)
);

-- A media run renders one approved source run's Read into temperament artifacts.
-- It references the BLUE run that produced the receipt-backed evidence; it never re-investigates.
create table if not exists media_runs (
  id text primary key,
  source_run_id text not null references runs(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  workspace_id text references workspaces(id) on delete set null,
  requested_by_user_id text references aculeus_users(id),
  status text not null default 'submitted',  -- submitted | mapping | rendering | review | approved | published | blocked
  profile_set jsonb not null default '[]'::jsonb, -- which temperament_profiles this run targets
  cost_summary jsonb not null default '{}'::jsonb, -- amplification/generation spend, separate from investigation
  adapter_mode text,
  model_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-temperament salience plan: WHAT is salient and the "door in" — emphasis, ordering, frame.
-- Selects and orders existing findings; it cannot add facts.
create table if not exists salience_maps (
  id text primary key,
  media_run_id text not null references media_runs(id) on delete cascade,
  source_run_id text not null references runs(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  profile_id text not null references temperament_profiles(id),
  plan jsonb not null default '{}'::jsonb,   -- selected_evidence_ids, emphasis order, door_in, frame
  status text not null default 'draft',      -- draft | ready
  created_at timestamptz not null default now(),
  unique (media_run_id, profile_id)
);

-- One rendered artifact per temperament. Substance-lock fields are gate-enforced.
create table if not exists render_variants (
  id text primary key,
  media_run_id text not null references media_runs(id) on delete cascade,
  source_run_id text not null references runs(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  profile_id text not null references temperament_profiles(id),
  salience_map_id text references salience_maps(id) on delete set null,
  format text not null default 'op_ed',      -- op_ed | script | social | newsletter | headline
  headline text,
  body jsonb not null default '{}'::jsonb,    -- structured render: blocks, each carrying claim binding refs
  status text not null default 'draft',       -- draft | verified | approved | published | rejected
  substance_lock_passed boolean not null default false,
  counter_case_included boolean not null default false,
  thin_evidence_flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_run_id, profile_id, format)
);

-- THE immutable-record enforcer. Every claim asserted in a render must bind to a promoted
-- evidence_record (and, where applicable, the underlying citation). No binding => no claim.
-- A render cannot pass substance-lock with any unbound claim.
create table if not exists render_claim_bindings (
  id text primary key,
  render_variant_id text not null references render_variants(id) on delete cascade,
  evidence_record_id text not null references evidence_records(id) on delete restrict,
  citation_id text references citations(id) on delete set null,
  rendered_span text not null,               -- the exact text in the render making the claim
  support_level text not null,               -- inherited from the bound evidence record
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cyan analog of verifier_issues: blocks publish on substance drift / missing counter-case / etc.
create table if not exists render_verifier_issues (
  id text primary key,
  render_variant_id text not null references render_variants(id) on delete cascade,
  media_run_id text references media_runs(id) on delete cascade,
  severity text not null,                    -- block | warn | info
  issue_type text not null,                  -- new_fact_introduced | substance_drift | missing_counter_case | thin_evidence_unflagged | forbidden_move | unbound_claim
  message text not null,
  status text not null default 'open',        -- open | resolved | waived
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Pre-publication review gate (open task LC-05). Both reviewer and customer approval are
-- required before a render can move to 'published'.
create table if not exists render_reviews (
  id text primary key,
  render_variant_id text not null references render_variants(id) on delete cascade,
  media_run_id text references media_runs(id) on delete cascade,
  actor_user_id text references aculeus_users(id),
  decision text not null,                    -- approve | reject | request_changes
  note text not null,
  customer_approval boolean not null default false,
  created_at timestamptz not null default now()
);

-- Packaged, approved renders ready for amplification across channels.
create table if not exists delivery_packages (
  id text primary key,
  render_variant_id text not null references render_variants(id) on delete cascade,
  media_run_id text references media_runs(id) on delete cascade,
  case_id text references cases(id) on delete cascade,
  channel text not null,                     -- newsletter | social | op_ed_pitch | broadcast | direct
  format text not null,
  artifact_url text,                         -- Vercel Blob, reuses export_packets storage pattern
  visibility text not null default 'private',
  status text not null default 'created',     -- created | scheduled | published
  published_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_runs_source_run_id on media_runs(source_run_id);
create index if not exists idx_salience_maps_media_run_id on salience_maps(media_run_id);
create index if not exists idx_render_variants_media_run_id on render_variants(media_run_id);
create index if not exists idx_render_claim_bindings_variant_id on render_claim_bindings(render_variant_id);
create index if not exists idx_render_claim_bindings_evidence_id on render_claim_bindings(evidence_record_id);
create index if not exists idx_render_verifier_issues_variant_id on render_verifier_issues(render_variant_id);
create index if not exists idx_render_reviews_variant_id on render_reviews(render_variant_id);
create index if not exists idx_delivery_packages_variant_id on delivery_packages(render_variant_id);

-- Aculeus Salience / Media Layer (CYAN) — proposed next-stage schema.
--
-- Status: PROPOSED. Not yet implemented in code. Companion to docs/aculeus-product-schema.sql
-- and docs/aculeus-salience-implementation-plan.html.
--
-- Design rule: BLUE binds claims to receipts; CYAN binds renders to claims.
-- A render may only ever consume promoted, receipt-backed evidence_records + citations,
-- frozen into an immutable read_snapshot. Renderings vary in salience (frame, vocabulary,
-- messenger, format) — never in substance.
--
-- Run topology: a render is its own media_run that references the approved source run AND a
-- pinned read_snapshot version. Re-rendering never mutates the investigation; amplification
-- spend is tracked on the media_run, separate from investigation spend.
--
-- Substance-lock: HARD GATE. A render cannot reach status 'verified' (and therefore cannot be
-- approved or published) unless every rendered claim binds to a promoted evidence_record, every
-- required_inclusion atom is present, the counter-case is present, no gestalt distortion is
-- detected (misleading implication / selective omission / unsupported causation), and every AP
-- citation resolves to its receipt. Sentence-level binding is necessary but NOT sufficient.

-- The five (or N) audience definitions. Configuration, not generation. Admin-governed,
-- versioned, and change-audited. A render records the profile version it used.
create table if not exists temperament_profiles (
  id text primary key,
  profile_key text not null,                 -- far_left | left_of_center | center | right_of_center | far_right
  label text not null,
  frame text not null,                       -- e.g. "Power & exploitation"
  asks jsonb not null default '[]'::jsonb,
  lexicon jsonb not null default '{}'::jsonb, -- preferred / "sounds like" vocabulary
  messengers jsonb not null default '[]'::jsonb,
  format_prefs jsonb not null default '{}'::jsonb,
  forbidden jsonb not null default '[]'::jsonb, -- per-temperament forbidden moves (on top of the global ethical floor)
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_key, version)
);

-- An immutable freeze of an approved Read. This is the substance boundary: everything the media
-- layer may ever say is fixed here. A corrected Read produces a NEW snapshot (new version),
-- never an in-place edit, so published renders can be detected as stale.
create table if not exists read_snapshots (
  id text primary key,
  source_run_id text not null references runs(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  snapshot_version integer not null default 1,
  bottom_line text,                          -- the Read's net claim; gestalt checks judge renders against this
  counter_case jsonb not null default '{}'::jsonb,
  thin_evidence jsonb not null default '[]'::jsonb,
  eligible boolean not null default false,   -- eligibility gate: false if the Read is too thin for a media run
  content_hash text not null,                -- hash of the frozen payload; renders pin this
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_run_id, snapshot_version)
);

-- Atomic, render-ready claim units derived from a read_snapshot. Each carries its bound evidence
-- record and a pre-built, immutable AP-style attribution string. The renderer inserts a marker;
-- a deterministic binder injects this ap_citation verbatim — the model never authors attributions.
create table if not exists claim_atoms (
  id text primary key,
  read_snapshot_id text not null references read_snapshots(id) on delete cascade,
  evidence_record_id text not null references evidence_records(id) on delete restrict,
  citation_id text references citations(id) on delete set null,
  claim_text text not null,                  -- neutral, assertable claim
  support_level text not null,               -- inherited from the evidence record
  ap_citation text not null,                 -- canonical AP-style attribution, built from receipt metadata
  locator jsonb not null default '{}'::jsonb, -- page/row/section/span + capture date for re-validation
  required_inclusion boolean not null default false, -- counter-case / qualifier atoms a render may NOT drop
  lead_eligible boolean not null default true,        -- thin atoms cannot be promoted to the lead
  created_at timestamptz not null default now()
);

-- A media run renders one approved source run's snapshot into temperament artifacts.
create table if not exists media_runs (
  id text primary key,
  source_run_id text not null references runs(id) on delete cascade,
  read_snapshot_id text not null references read_snapshots(id) on delete restrict,
  case_id text not null references cases(id) on delete cascade,
  workspace_id text references workspaces(id) on delete set null,
  requested_by_user_id text references aculeus_users(id),
  status text not null default 'submitted',  -- submitted | mapping | rendering | verifying | review | approved | published | blocked | needs_human
  profile_set jsonb not null default '[]'::jsonb,
  format_set jsonb not null default '[]'::jsonb, -- op_ed | social | newsletter | press_release
  cost_summary jsonb not null default '{}'::jsonb, -- amplification/generation spend, capped per run
  spend_cap_cents integer,
  adapter_mode text,
  model_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-temperament salience plan: WHAT is salient and the "door in" — emphasis, ordering, frame,
-- messenger, lexicon mapping, and the do-not-say list. Selects and orders existing atoms; the
-- required_inclusions list pins atoms the render must carry. It cannot add facts.
create table if not exists salience_maps (
  id text primary key,
  media_run_id text not null references media_runs(id) on delete cascade,
  read_snapshot_id text not null references read_snapshots(id) on delete cascade,
  case_id text not null references cases(id) on delete cascade,
  profile_id text not null references temperament_profiles(id),
  selected_atom_ids jsonb not null default '[]'::jsonb,
  required_inclusions jsonb not null default '[]'::jsonb, -- atom ids that may not be dropped (counter-case etc.)
  plan jsonb not null default '{}'::jsonb,    -- door_in, frame, messenger, lexicon map, emphasis order
  do_not_say jsonb not null default '[]'::jsonb,
  status text not null default 'draft',       -- draft | ready
  created_at timestamptz not null default now(),
  unique (media_run_id, profile_id)
);

-- One rendered artifact per temperament × format. Substance-lock fields are gate-enforced.
create table if not exists render_variants (
  id text primary key,
  media_run_id text not null references media_runs(id) on delete cascade,
  read_snapshot_id text not null references read_snapshots(id) on delete restrict,
  snapshot_version integer not null,          -- pinned; if the snapshot is superseded, render goes stale
  case_id text not null references cases(id) on delete cascade,
  profile_id text not null references temperament_profiles(id),
  salience_map_id text references salience_maps(id) on delete set null,
  format text not null default 'op_ed',       -- op_ed | social | newsletter | press_release
  headline text,
  body jsonb not null default '{}'::jsonb,     -- structured render: blocks, each carrying claim binding refs
  status text not null default 'draft',        -- draft | verified | approved | published | rejected | blocked
  substance_lock_passed boolean not null default false,
  counter_case_included boolean not null default false,
  thin_evidence_flagged boolean not null default false,
  retries integer not null default 0,          -- bounded repair attempts before escalation
  escalated_to text,                           -- null | frontier_renderer | human_review
  stale boolean not null default false,        -- true when a newer snapshot supersedes this render
  superseded_by text references render_variants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_run_id, profile_id, format)
);

-- THE immutable-record enforcer. Every claim asserted in a render must bind to a claim_atom
-- (and through it, a promoted evidence_record). No binding => no claim. A render cannot pass
-- substance-lock with any unbound (naked) assertion.
create table if not exists render_claim_bindings (
  id text primary key,
  render_variant_id text not null references render_variants(id) on delete cascade,
  claim_atom_id text not null references claim_atoms(id) on delete restrict,
  evidence_record_id text not null references evidence_records(id) on delete restrict,
  citation_id text references citations(id) on delete set null,
  rendered_span text not null,                -- the exact text in the render making the claim
  ap_citation_resolved boolean not null default false, -- attribution matches the receipt's source identity
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cyan analog of verifier_issues. Includes gestalt checks: sentence binding is not enough.
create table if not exists render_verifier_issues (
  id text primary key,
  render_variant_id text not null references render_variants(id) on delete cascade,
  media_run_id text references media_runs(id) on delete cascade,
  severity text not null,                     -- block | warn | info
  issue_type text not null,                   -- new_fact_introduced | substance_drift | unbound_claim
                                              -- | missing_counter_case | thin_evidence_unflagged | forbidden_move
                                              -- | attribution_mismatch | ethical_floor_violation
                                              -- | misleading_implication | selective_omission | unsupported_causation
  message text not null,
  status text not null default 'open',         -- open | resolved | waived
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Pre-publication review gate (open task LC-05). Reviewer AND customer approval required before
-- a render can move to 'published'. The cross-demographic diff is surfaced here as the
-- defensibility artifact: same receipts, different doors.
create table if not exists render_reviews (
  id text primary key,
  render_variant_id text not null references render_variants(id) on delete cascade,
  media_run_id text references media_runs(id) on delete cascade,
  actor_user_id text references aculeus_users(id),
  decision text not null,                     -- approve | reject | request_changes
  note text not null,
  customer_approval boolean not null default false,
  created_at timestamptz not null default now()
);

-- Packaged, approved renders ready for amplification. Receipts re-validated at deliver time.
create table if not exists delivery_packages (
  id text primary key,
  render_variant_id text not null references render_variants(id) on delete cascade,
  media_run_id text references media_runs(id) on delete cascade,
  case_id text references cases(id) on delete cascade,
  channel text not null,                      -- newsletter | social | op_ed_pitch | press_release | direct
  format text not null,
  artifact_url text,                          -- Vercel Blob, reuses export_packets storage pattern
  receipts_appendix_url text,                 -- resolvable citations file shipped with the piece
  receipts_revalidated_at timestamptz,        -- link-rot / freshness check at publish time
  visibility text not null default 'private',
  status text not null default 'created',      -- created | scheduled | published
  published_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_read_snapshots_source_run_id on read_snapshots(source_run_id);
create index if not exists idx_claim_atoms_snapshot_id on claim_atoms(read_snapshot_id);
create index if not exists idx_claim_atoms_evidence_id on claim_atoms(evidence_record_id);
create index if not exists idx_media_runs_source_run_id on media_runs(source_run_id);
create index if not exists idx_media_runs_snapshot_id on media_runs(read_snapshot_id);
create index if not exists idx_salience_maps_media_run_id on salience_maps(media_run_id);
create index if not exists idx_render_variants_media_run_id on render_variants(media_run_id);
create index if not exists idx_render_claim_bindings_variant_id on render_claim_bindings(render_variant_id);
create index if not exists idx_render_claim_bindings_atom_id on render_claim_bindings(claim_atom_id);
create index if not exists idx_render_verifier_issues_variant_id on render_verifier_issues(render_variant_id);
create index if not exists idx_render_reviews_variant_id on render_reviews(render_variant_id);
create index if not exists idx_delivery_packages_variant_id on delivery_packages(render_variant_id);

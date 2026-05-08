-- ─────────────────────────────────────────────────────────────────────────────
-- Discogs Collection Viewer — Supabase Schema
-- Run this in the Supabase SQL editor (Database → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Users: stores Discogs identity + OAuth tokens for each user who has logged in.
-- Tokens are used server-side to proxy Discogs API requests on the user's behalf.
create table if not exists users (
  username             text        primary key,
  discogs_id           integer     not null,
  access_token         text        not null,
  access_token_secret  text        not null,
  consumer_name        text,
  updated_at           timestamptz not null default now()
);

-- Queue items: an ordered, per-user list of albums to listen to.
-- Anyone (including unauthenticated visitors) can add to a user's queue.
-- Only the owner can remove / reorder items.
create table if not exists queue_items (
  id           uuid        primary key default gen_random_uuid(),
  username     text        not null references users(username) on delete cascade,
  queue_id     text        not null,            -- client-generated unique ID
  release_data jsonb       not null,            -- full DiscogsRelease snapshot
  folder_name  text,
  position     integer     not null default 0,  -- ascending order = queue position
  created_at   timestamptz not null default now(),

  constraint queue_items_username_queue_id_key unique (username, queue_id)
);

-- Fast ordered lookup for a user's queue
create index if not exists idx_queue_items_username_position
  on queue_items (username, position asc);

-- Fast lookup of users by access_token (used for auth verification)
create index if not exists idx_users_access_token
  on users (access_token);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- All writes go through our server-side API routes using the service role key,
-- which bypasses RLS. We only need a SELECT policy so the browser-side Supabase
-- client can subscribe to Realtime changes.

alter table users       enable row level security;
alter table queue_items enable row level security;

-- Users table: not directly accessible from the browser
create policy "users_no_direct_access"
  on users for select
  using (false);

-- Queue items: publicly readable so Realtime subscriptions work for all visitors
create policy "queue_items_public_read"
  on queue_items for select
  to anon, authenticated
  using (true);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Add queue_items to the Supabase Realtime publication so that postgres_changes
-- events are broadcast to browser subscribers.
-- (The supabase_realtime publication is created automatically by Supabase.)
alter publication supabase_realtime add table queue_items;

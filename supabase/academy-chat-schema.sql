-- CloudTweak Academy private student-to-admin chat.
-- Run this file in the Supabase SQL Editor before deploying the chat UI.

create table if not exists public.academy_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique
    references public.student_profiles(id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.academy_chat_conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('student', 'admin')),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists academy_chat_conversations_activity_idx
  on public.academy_chat_conversations(last_message_at desc);

create index if not exists academy_chat_messages_conversation_created_idx
  on public.academy_chat_messages(conversation_id, created_at asc);

alter table public.academy_chat_conversations enable row level security;
alter table public.academy_chat_messages enable row level security;

-- The application accesses these tables through authenticated server routes
-- using the Supabase service role. No direct browser table policies are added.
revoke all on public.academy_chat_conversations from anon, authenticated;
revoke all on public.academy_chat_messages from anon, authenticated;
grant all on public.academy_chat_conversations to service_role;
grant all on public.academy_chat_messages to service_role;

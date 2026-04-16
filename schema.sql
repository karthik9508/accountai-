-- ══════════════════════════════════════════
-- AccountAI Database Schema
-- ══════════════════════════════════════════

-- 1. Transactions table
create table if not exists public.transactions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  amount      numeric(12, 2) not null,
  type        text not null check (type in ('income', 'expense')),
  category    text not null,
  description text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- Row Level Security for transactions
alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Chat messages table (conversation history)
create table if not exists public.chat_messages (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- Row Level Security for chat_messages
alter table public.chat_messages enable row level security;

create policy "Users can manage own messages"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Indexes for performance
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(user_id, date desc);
create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id, created_at desc);

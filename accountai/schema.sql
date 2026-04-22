-- ══════════════════════════════════════════
-- AccountAI Database Schema
-- ══════════════════════════════════════════

-- 1. Transactions table
create table if not exists public.transactions (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  amount        numeric(12, 2) not null,
  type          text not null check (type in ('income', 'expense')),
  category      text not null,
  description   text,
  customer_name text,
  payment_status text default 'paid' check (payment_status in ('paid', 'unpaid', 'partial')),
  paid_amount   numeric(12, 2),
  date          date not null default current_date,
  created_at    timestamptz default now()
);

-- Row Level Security for transactions
alter table public.transactions enable row level security;

drop policy if exists "Users can manage own transactions" on public.transactions;
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

drop policy if exists "Users can manage own messages" on public.chat_messages;
create policy "Users can manage own messages"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Customers table (auto-created from transaction descriptions)
create table if not exists public.customers (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  phone       text,
  email       text,
  address     text,
  created_at  timestamptz default now(),
  unique(user_id, name)
);

-- Row Level Security for customers
alter table public.customers enable row level security;

drop policy if exists "Users manage own customers" on public.customers;
create policy "Users manage own customers"
  on public.customers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Invoices table
create table if not exists public.invoices (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  customer_id     uuid references public.customers(id),
  transaction_id  uuid references public.transactions(id),
  invoice_number  text not null,
  amount          numeric(12, 2) not null,
  tax_rate        numeric(5, 2) default 0,
  tax_amount      numeric(12, 2) default 0,
  total_amount    numeric(12, 2) not null,
  status          text not null default 'unpaid' check (status in ('paid', 'unpaid', 'partial')),
  due_date        date,
  notes           text,
  created_at      timestamptz default now()
);

-- Row Level Security for invoices
alter table public.invoices enable row level security;

drop policy if exists "Users manage own invoices" on public.invoices;
create policy "Users manage own invoices"
  on public.invoices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Indexes for performance
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_customer_idx on public.transactions(user_id, customer_name);
create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id, created_at desc);
create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);

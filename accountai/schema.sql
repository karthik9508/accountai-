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
  bill_number   text,
  gst_amount    numeric(12, 2) default 0,
  total_with_gst numeric(12, 2),
  date          date not null default current_date,
  created_at    timestamptz default now()
);

-- Sync older existing databases with the current transactions schema.
alter table public.transactions
  add column if not exists payment_status text,
  add column if not exists paid_amount numeric(12, 2),
  add column if not exists bill_number text,
  add column if not exists gst_amount numeric(12, 2) default 0,
  add column if not exists total_with_gst numeric(12, 2);

alter table public.transactions
  alter column payment_status set default 'paid';

update public.transactions
set payment_status = 'paid'
where payment_status is null;

alter table public.transactions
  drop constraint if exists transactions_payment_status_check;

alter table public.transactions
  add constraint transactions_payment_status_check
  check (payment_status in ('paid', 'unpaid', 'partial'));

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

-- 5. Products table (item catalog)
create table if not exists public.products (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  hsn_code    text,
  unit        text default 'pcs',
  unit_price  numeric(12, 2) not null default 0,
  gst_rate    numeric(5, 2) default 0,
  created_at  timestamptz default now(),
  unique(user_id, name)
);

alter table public.products enable row level security;

drop policy if exists "Users manage own products" on public.products;
create policy "Users manage own products"
  on public.products for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Transaction items (line items per sale/purchase)
create table if not exists public.transaction_items (
  id              uuid default gen_random_uuid() primary key,
  transaction_id  uuid references public.transactions(id) on delete cascade not null,
  product_id      uuid references public.products(id),
  item_name       text not null,
  hsn_code        text,
  quantity        numeric(10, 3) not null default 1,
  unit            text default 'pcs',
  rate            numeric(12, 2) not null,
  discount_pct    numeric(5, 2) default 0,
  gst_rate        numeric(5, 2) default 0,
  amount          numeric(12, 2) not null,
  gst_amount      numeric(12, 2) default 0,
  total           numeric(12, 2) not null,
  created_at      timestamptz default now()
);

alter table public.transaction_items enable row level security;

-- RLS via the parent transaction's user_id
drop policy if exists "Users manage own transaction items" on public.transaction_items;
create policy "Users manage own transaction items"
  on public.transaction_items for all
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

-- 7. Payments table (payment ledger per transaction)
create table if not exists public.payments (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  transaction_id  uuid references public.transactions(id) on delete cascade not null,
  amount          numeric(12, 2) not null,
  payment_mode    text default 'cash' check (payment_mode in ('cash', 'upi', 'bank', 'cheque', 'other')),
  reference       text,
  payment_date    date not null default current_date,
  notes           text,
  created_at      timestamptz default now()
);

alter table public.payments enable row level security;

drop policy if exists "Users manage own payments" on public.payments;
create policy "Users manage own payments"
  on public.payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8. Indexes for performance
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_customer_idx on public.transactions(user_id, customer_name);
create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id, created_at desc);
create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists transaction_items_tx_idx on public.transaction_items(transaction_id);
create index if not exists payments_tx_idx on public.payments(transaction_id);
create index if not exists payments_user_id_idx on public.payments(user_id);

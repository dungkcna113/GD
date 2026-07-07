-- GD COMPUTER - Supabase schema
-- Chay file nay trong Supabase SQL Editor sau khi tao project moi.
-- Luu y: file nay se xoa va tao lai cac bang du lieu cua app GD COMPUTER trong public schema.
-- Neu dang co du lieu ban hang that, hay backup truoc khi bam Run.

drop trigger if exists on_auth_user_created on auth.users;

drop view if exists public.v_low_stock;
drop view if exists public.v_best_sellers;
drop view if exists public.v_monthly_revenue;
drop view if exists public.v_daily_revenue;

drop table if exists public.repair_order_items cascade;
drop table if exists public.repair_orders cascade;
drop table if exists public.cash_entries cascade;
drop table if exists public.stock_movements cascade;
drop table if exists public.sales_order_items cascade;
drop table if exists public.sales_orders cascade;
drop table if exists public.purchase_order_items cascade;
drop table if exists public.purchase_orders cascade;
drop table if exists public.products cascade;
drop table if exists public.suppliers cascade;
drop table if exists public.customers cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;

drop function if exists public.create_repair_order(uuid, text, text, text, text, text, text, text, text, date, numeric, text, jsonb);
do $$
begin
  execute 'drop function if exists public.create_cash_entry(public.cash_entry_type, public.cash_account, date, text, text, numeric, text)';
exception
  when undefined_object then null;
end $$;
drop function if exists public.create_purchase_order(uuid, date, text, jsonb);
drop function if exists public.create_sale_order(uuid, text, text, text, text, jsonb);
drop function if exists public.handle_new_user();
drop function if exists public.is_owner();
drop function if exists public.is_active_user();
drop function if exists public.set_updated_at();

drop sequence if exists public.repair_order_number_seq;
drop sequence if exists public.purchase_order_number_seq;
drop sequence if exists public.sales_order_number_seq;
drop sequence if exists public.cash_entry_number_seq;

drop type if exists public.cash_account;
drop type if exists public.cash_entry_type;
drop type if exists public.sales_processing_status;
drop type if exists public.sales_payment_status;
drop type if exists public.repair_status;
drop type if exists public.stock_movement_type;
drop type if exists public.user_role;

create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('owner', 'staff');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_movement_type as enum ('in', 'out', 'adjustment');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sales_payment_status as enum ('unpaid', 'paid', 'refunded');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sales_processing_status as enum ('ordered', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.cash_entry_type as enum ('receipt', 'payment');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.cash_account as enum ('cash', 'bank');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.repair_status as enum (
    'received',
    'checking',
    'waiting_parts',
    'repairing',
    'done',
    'returned',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create sequence if not exists public.sales_order_number_seq start 1000;
create sequence if not exists public.purchase_order_number_seq start 1000;
create sequence if not exists public.repair_order_number_seq start 1000;
create sequence if not exists public.cash_entry_number_seq start 1000;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'Nhan vien',
  phone text,
  role public.user_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  barcode text unique,
  name text not null,
  unit text not null default 'cái',
  description text,
  category_id uuid references public.categories(id) on delete set null,
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14, 2) not null default 0 check (sale_price >= 0),
  image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  phone text unique,
  address text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  phone text,
  email text,
  address text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_date date not null default current_date,
  total_amount numeric(14, 2) not null default 0,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  line_total numeric(14, 2) generated always as (quantity * unit_cost) stored
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_address text,
  source text not null default 'Cửa hàng',
  payment_status public.sales_payment_status not null default 'paid',
  processing_status public.sales_processing_status not null default 'completed',
  order_date timestamptz not null default now(),
  subtotal numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  total_profit numeric(14, 2) not null default 0,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_sku text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  line_total numeric(14, 2) not null default 0,
  cost_total numeric(14, 2) not null default 0,
  profit numeric(14, 2) not null default 0
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type public.stock_movement_type not null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(14, 2) not null default 0,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  entry_type public.cash_entry_type not null,
  cash_account public.cash_account not null default 'cash',
  entry_date date not null default current_date,
  partner_name text,
  reason text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.repair_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  device_name text not null,
  serial_number text,
  issue_description text not null,
  diagnosis text,
  solution text,
  status public.repair_status not null default 'received',
  received_at timestamptz not null default now(),
  promised_date date,
  completed_at timestamptz,
  labor_fee numeric(14, 2) not null default 0 check (labor_fee >= 0),
  parts_total numeric(14, 2) not null default 0 check (parts_total >= 0),
  total_amount numeric(14, 2) generated always as (labor_fee + parts_total) stored,
  total_cost numeric(14, 2) not null default 0 check (total_cost >= 0),
  total_profit numeric(14, 2) not null default 0,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repair_order_items (
  id uuid primary key default gen_random_uuid(),
  repair_order_id uuid not null references public.repair_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_sku text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  line_total numeric(14, 2) not null default 0,
  cost_total numeric(14, 2) not null default 0,
  profit numeric(14, 2) not null default 0
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_products_stock on public.products(stock_quantity);
create index if not exists idx_customers_code on public.customers(code);
create index if not exists idx_suppliers_code on public.suppliers(code);
create index if not exists idx_sales_orders_date on public.sales_orders(order_date);
create index if not exists idx_sales_orders_payment on public.sales_orders(payment_status);
create index if not exists idx_sales_orders_processing on public.sales_orders(processing_status);
create index if not exists idx_sales_items_product on public.sales_order_items(product_id);
create index if not exists idx_purchase_orders_code on public.purchase_orders(code);
create index if not exists idx_purchase_orders_date on public.purchase_orders(purchase_date);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
create index if not exists idx_cash_entries_date on public.cash_entries(entry_date);
create index if not exists idx_cash_entries_type on public.cash_entries(entry_type);
create index if not exists idx_repair_orders_code on public.repair_orders(code);
create index if not exists idx_repair_orders_status on public.repair_orders(status);
create index if not exists idx_repair_orders_received_at on public.repair_orders(received_at);
create index if not exists idx_repair_items_order on public.repair_order_items(repair_order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists set_repair_orders_updated_at on public.repair_orders;
create trigger set_repair_orders_updated_at
before update on public.repair_orders
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Nhan vien'),
    'staff'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1), 'Nhan vien'),
  case
    when row_number() over (order by created_at, id) = 1 then 'owner'::public.user_role
    else 'staff'::public.user_role
  end
from auth.users
on conflict (id) do nothing;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and is_active = true
  );
$$;

grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_owner() to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.cash_entries enable row level security;
alter table public.repair_orders enable row level security;
alter table public.repair_order_items enable row level security;

drop policy if exists profiles_read_self_or_owner on public.profiles;
create policy profiles_read_self_or_owner
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_owner());

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update
on public.profiles for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
for select to authenticated
using (public.is_active_user());

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
for insert to authenticated
with check (public.is_active_user());

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
for update to authenticated
using (public.is_active_user())
with check (public.is_active_user());

drop policy if exists categories_delete_owner on public.categories;
create policy categories_delete_owner on public.categories
for delete to authenticated
using (public.is_owner());

drop policy if exists products_read on public.products;
create policy products_read on public.products
for select to authenticated
using (public.is_active_user());

drop policy if exists products_write on public.products;
create policy products_write on public.products
for insert to authenticated
with check (public.is_active_user());

drop policy if exists products_update on public.products;
create policy products_update on public.products
for update to authenticated
using (public.is_active_user())
with check (public.is_active_user());

drop policy if exists products_delete_owner on public.products;
create policy products_delete_owner on public.products
for delete to authenticated
using (public.is_owner());

drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers
for select to authenticated
using (public.is_active_user());

drop policy if exists customers_write on public.customers;
create policy customers_write on public.customers
for insert to authenticated
with check (public.is_active_user());

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
for update to authenticated
using (public.is_active_user())
with check (public.is_active_user());

drop policy if exists customers_delete_owner on public.customers;
create policy customers_delete_owner on public.customers
for delete to authenticated
using (public.is_owner());

drop policy if exists suppliers_read on public.suppliers;
create policy suppliers_read on public.suppliers
for select to authenticated
using (public.is_active_user());

drop policy if exists suppliers_write on public.suppliers;
create policy suppliers_write on public.suppliers
for insert to authenticated
with check (public.is_active_user());

drop policy if exists suppliers_update on public.suppliers;
create policy suppliers_update on public.suppliers
for update to authenticated
using (public.is_active_user())
with check (public.is_active_user());

drop policy if exists suppliers_delete_owner on public.suppliers;
create policy suppliers_delete_owner on public.suppliers
for delete to authenticated
using (public.is_owner());

drop policy if exists purchase_orders_read on public.purchase_orders;
create policy purchase_orders_read on public.purchase_orders
for select to authenticated
using (public.is_active_user());

drop policy if exists purchase_order_items_read on public.purchase_order_items;
create policy purchase_order_items_read on public.purchase_order_items
for select to authenticated
using (public.is_active_user());

drop policy if exists sales_orders_read on public.sales_orders;
create policy sales_orders_read on public.sales_orders
for select to authenticated
using (public.is_active_user());

drop policy if exists sales_orders_update on public.sales_orders;
create policy sales_orders_update on public.sales_orders
for update to authenticated
using (public.is_active_user())
with check (public.is_active_user());

drop policy if exists sales_order_items_read on public.sales_order_items;
create policy sales_order_items_read on public.sales_order_items
for select to authenticated
using (public.is_active_user());

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements
for select to authenticated
using (public.is_active_user());

drop policy if exists cash_entries_read on public.cash_entries;
create policy cash_entries_read on public.cash_entries
for select to authenticated
using (public.is_active_user());

drop policy if exists cash_entries_write on public.cash_entries;
create policy cash_entries_write on public.cash_entries
for insert to authenticated
with check (public.is_active_user());

drop policy if exists cash_entries_update_owner on public.cash_entries;
create policy cash_entries_update_owner on public.cash_entries
for update to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists cash_entries_delete_owner on public.cash_entries;
create policy cash_entries_delete_owner on public.cash_entries
for delete to authenticated
using (public.is_owner());

drop policy if exists repair_orders_read on public.repair_orders;
create policy repair_orders_read on public.repair_orders
for select to authenticated
using (public.is_active_user());

drop policy if exists repair_orders_write on public.repair_orders;
create policy repair_orders_write on public.repair_orders
for insert to authenticated
with check (public.is_active_user());

drop policy if exists repair_orders_update on public.repair_orders;
create policy repair_orders_update on public.repair_orders
for update to authenticated
using (public.is_active_user())
with check (public.is_active_user());

drop policy if exists repair_orders_delete_owner on public.repair_orders;
create policy repair_orders_delete_owner on public.repair_orders
for delete to authenticated
using (public.is_owner());

drop policy if exists repair_order_items_read on public.repair_order_items;
create policy repair_order_items_read on public.repair_order_items
for select to authenticated
using (public.is_active_user());

create or replace function public.create_purchase_order(
  p_supplier_id uuid,
  p_purchase_date date,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_code text;
  v_supplier_name text;
  v_total numeric(14, 2) := 0;
  v_item record;
  v_product record;
begin
  if not public.is_active_user() then
    raise exception 'Tai khoan khong co quyen nhap kho';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Phieu nhap phai co it nhat 1 san pham';
  end if;

  v_code := 'PN-' || to_char(coalesce(p_purchase_date, current_date), 'YYYYMMDD') || '-' ||
    lpad(nextval('public.purchase_order_number_seq')::text, 5, '0');

  select name into v_supplier_name
  from public.suppliers
  where id = p_supplier_id;

  insert into public.purchase_orders (code, supplier_id, purchase_date, note, created_by)
  values (v_code, p_supplier_id, coalesce(p_purchase_date, current_date), p_note, auth.uid())
  returning id into v_order_id;

  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer, unit_cost numeric)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'So luong nhap phai lon hon 0';
    end if;

    if v_item.unit_cost is null or v_item.unit_cost < 0 then
      raise exception 'Gia nhap khong hop le';
    end if;

    select *
    into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if v_product.id is null or v_product.is_active = false then
      raise exception 'San pham khong ton tai hoac da ngung ban';
    end if;

    insert into public.purchase_order_items (purchase_order_id, product_id, quantity, unit_cost)
    values (v_order_id, v_item.product_id, v_item.quantity, v_item.unit_cost);

    update public.products
    set stock_quantity = stock_quantity + v_item.quantity,
        cost_price = v_item.unit_cost
    where id = v_item.product_id;

    insert into public.stock_movements (
      product_id, movement_type, quantity, unit_cost, reference_type, reference_id, note, created_by
    )
    values (
      v_item.product_id, 'in', v_item.quantity, v_item.unit_cost, 'purchase_order', v_order_id, p_note, auth.uid()
    );

    v_total := v_total + (v_item.quantity * v_item.unit_cost);
  end loop;

  update public.purchase_orders
  set total_amount = v_total
  where id = v_order_id;

  if v_total > 0 then
    insert into public.cash_entries (
      code, entry_type, cash_account, entry_date, partner_name, reason,
      amount, reference_type, reference_id, note, created_by
    )
    values (
      'PC-' || to_char(coalesce(p_purchase_date, current_date), 'YYYYMMDD') || '-' ||
        lpad(nextval('public.cash_entry_number_seq')::text, 5, '0'),
      'payment',
      'cash',
      coalesce(p_purchase_date, current_date),
      v_supplier_name,
      'Chi nhập hàng',
      v_total,
      'purchase_order',
      v_order_id,
      p_note,
      auth.uid()
    );
  end if;

  return v_order_id;
end;
$$;

create or replace function public.create_sale_order(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_code text;
  v_partner_name text;
  v_subtotal numeric(14, 2) := 0;
  v_cost numeric(14, 2) := 0;
  v_profit numeric(14, 2) := 0;
  v_line_total numeric(14, 2);
  v_cost_total numeric(14, 2);
  v_line_profit numeric(14, 2);
  v_price numeric(14, 2);
  v_item record;
  v_product record;
begin
  if not public.is_active_user() then
    raise exception 'Tai khoan khong co quyen ban hang';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Don hang phai co it nhat 1 san pham';
  end if;

  v_code := 'GD-' || to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYYMMDD') || '-' || lpad(nextval('public.sales_order_number_seq')::text, 5, '0');

  insert into public.sales_orders (
    code, customer_id, customer_name, customer_phone, customer_address, note, created_by
  )
  values (
    v_code,
    p_customer_id,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(trim(coalesce(p_customer_address, '')), ''),
    p_note,
    auth.uid()
  )
  returning id into v_order_id;

  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer, unit_price numeric)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'So luong ban phai lon hon 0';
    end if;

    select *
    into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if v_product.id is null or v_product.is_active = false then
      raise exception 'San pham khong ton tai hoac da ngung ban';
    end if;

    if v_product.stock_quantity < v_item.quantity then
      raise exception 'San pham % chi con % trong kho, khong du de ban %',
        v_product.name, v_product.stock_quantity, v_item.quantity;
    end if;

    v_price := coalesce(nullif(v_item.unit_price, 0), v_product.sale_price);
    if v_price < 0 then
      raise exception 'Gia ban khong hop le';
    end if;

    v_line_total := v_item.quantity * v_price;
    v_cost_total := v_item.quantity * v_product.cost_price;
    v_line_profit := v_line_total - v_cost_total;

    insert into public.sales_order_items (
      sales_order_id, product_id, product_sku, product_name, quantity,
      unit_price, unit_cost, line_total, cost_total, profit
    )
    values (
      v_order_id, v_product.id, v_product.sku, v_product.name, v_item.quantity,
      v_price, v_product.cost_price, v_line_total, v_cost_total, v_line_profit
    );

    update public.products
    set stock_quantity = stock_quantity - v_item.quantity
    where id = v_product.id;

    insert into public.stock_movements (
      product_id, movement_type, quantity, unit_cost, reference_type, reference_id, note, created_by
    )
    values (
      v_product.id, 'out', v_item.quantity, v_product.cost_price, 'sales_order', v_order_id, p_note, auth.uid()
    );

    v_subtotal := v_subtotal + v_line_total;
    v_cost := v_cost + v_cost_total;
    v_profit := v_profit + v_line_profit;
  end loop;

  update public.sales_orders
  set subtotal = v_subtotal,
      total_amount = v_subtotal,
      total_cost = v_cost,
      total_profit = v_profit
  where id = v_order_id;

  v_partner_name := coalesce(nullif(trim(coalesce(p_customer_name, '')), ''), 'Khách lẻ');

  if v_subtotal > 0 then
    insert into public.cash_entries (
      code, entry_type, cash_account, entry_date, partner_name, reason,
      amount, reference_type, reference_id, note, created_by
    )
    values (
      'PT-' || to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYYMMDD') || '-' ||
        lpad(nextval('public.cash_entry_number_seq')::text, 5, '0'),
      'receipt',
      'cash',
      timezone('Asia/Ho_Chi_Minh', now())::date,
      v_partner_name,
      'Thu tiền bán hàng',
      v_subtotal,
      'sales_order',
      v_order_id,
      p_note,
      auth.uid()
    );
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.create_purchase_order(uuid, date, text, jsonb) to authenticated;
grant execute on function public.create_sale_order(uuid, text, text, text, text, jsonb) to authenticated;

create or replace function public.create_cash_entry(
  p_entry_type public.cash_entry_type,
  p_cash_account public.cash_account,
  p_entry_date date,
  p_partner_name text,
  p_reason text,
  p_amount numeric,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_prefix text;
  v_entry_date date;
begin
  if not public.is_active_user() then
    raise exception 'Tai khoan khong co quyen tao phieu thu chi';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'So tien phai lon hon 0';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Vui long nhap ly do thu chi';
  end if;

  v_prefix := case when p_entry_type = 'receipt' then 'PT' else 'PC' end;
  v_entry_date := coalesce(p_entry_date, current_date);

  insert into public.cash_entries (
    code, entry_type, cash_account, entry_date, partner_name,
    reason, amount, note, created_by
  )
  values (
    v_prefix || '-' || to_char(v_entry_date, 'YYYYMMDD') || '-' ||
      lpad(nextval('public.cash_entry_number_seq')::text, 5, '0'),
    p_entry_type,
    coalesce(p_cash_account, 'cash'),
    v_entry_date,
    nullif(trim(coalesce(p_partner_name, '')), ''),
    trim(p_reason),
    p_amount,
    p_note,
    auth.uid()
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

grant execute on function public.create_cash_entry(public.cash_entry_type, public.cash_account, date, text, text, numeric, text) to authenticated;

create or replace function public.create_repair_order(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_device_name text,
  p_serial_number text,
  p_issue_description text,
  p_diagnosis text,
  p_solution text,
  p_promised_date date,
  p_labor_fee numeric,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_code text;
  v_parts_total numeric(14, 2) := 0;
  v_cost numeric(14, 2) := 0;
  v_profit numeric(14, 2) := 0;
  v_line_total numeric(14, 2);
  v_cost_total numeric(14, 2);
  v_line_profit numeric(14, 2);
  v_price numeric(14, 2);
  v_item record;
  v_product record;
begin
  if not public.is_active_user() then
    raise exception 'Tai khoan khong co quyen tao phieu sua chua';
  end if;

  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'Vui long nhap ten khach hang';
  end if;

  if nullif(trim(coalesce(p_device_name, '')), '') is null then
    raise exception 'Vui long nhap thiet bi/linh kien can sua';
  end if;

  if nullif(trim(coalesce(p_issue_description, '')), '') is null then
    raise exception 'Vui long nhap tinh trang loi';
  end if;

  v_code := 'SC-' || to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYYYMMDD') || '-' ||
    lpad(nextval('public.repair_order_number_seq')::text, 5, '0');

  insert into public.repair_orders (
    code, customer_id, customer_name, customer_phone, customer_address,
    device_name, serial_number, issue_description, diagnosis, solution,
    promised_date, labor_fee, note, created_by
  )
  values (
    v_code,
    p_customer_id,
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(trim(coalesce(p_customer_address, '')), ''),
    trim(p_device_name),
    nullif(trim(coalesce(p_serial_number, '')), ''),
    trim(p_issue_description),
    nullif(trim(coalesce(p_diagnosis, '')), ''),
    nullif(trim(coalesce(p_solution, '')), ''),
    p_promised_date,
    coalesce(p_labor_fee, 0),
    p_note,
    auth.uid()
  )
  returning id into v_order_id;

  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    for v_item in
      select *
      from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer, unit_price numeric)
    loop
      if v_item.quantity is null or v_item.quantity <= 0 then
        raise exception 'So luong linh kien phai lon hon 0';
      end if;

      select *
      into v_product
      from public.products
      where id = v_item.product_id
      for update;

      if v_product.id is null or v_product.is_active = false then
        raise exception 'Linh kien khong ton tai hoac da ngung ban';
      end if;

      if v_product.stock_quantity < v_item.quantity then
        raise exception 'Linh kien % chi con %, khong du de dung %',
          v_product.name, v_product.stock_quantity, v_item.quantity;
      end if;

      v_price := coalesce(nullif(v_item.unit_price, 0), v_product.sale_price);
      v_line_total := v_item.quantity * v_price;
      v_cost_total := v_item.quantity * v_product.cost_price;
      v_line_profit := v_line_total - v_cost_total;

      insert into public.repair_order_items (
        repair_order_id, product_id, product_sku, product_name, quantity,
        unit_price, unit_cost, line_total, cost_total, profit
      )
      values (
        v_order_id, v_product.id, v_product.sku, v_product.name, v_item.quantity,
        v_price, v_product.cost_price, v_line_total, v_cost_total, v_line_profit
      );

      update public.products
      set stock_quantity = stock_quantity - v_item.quantity
      where id = v_product.id;

      insert into public.stock_movements (
        product_id, movement_type, quantity, unit_cost, reference_type, reference_id, note, created_by
      )
      values (
        v_product.id, 'out', v_item.quantity, v_product.cost_price, 'repair_order', v_order_id, p_note, auth.uid()
      );

      v_parts_total := v_parts_total + v_line_total;
      v_cost := v_cost + v_cost_total;
      v_profit := v_profit + v_line_profit;
    end loop;
  end if;

  update public.repair_orders
  set parts_total = v_parts_total,
      total_cost = v_cost,
      total_profit = coalesce(p_labor_fee, 0) + v_profit
  where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.create_repair_order(uuid, text, text, text, text, text, text, text, text, date, numeric, text, jsonb) to authenticated;

create or replace view public.v_daily_revenue
with (security_invoker = true)
as
select
  timezone('Asia/Ho_Chi_Minh', order_date)::date as revenue_date,
  count(*)::integer as order_count,
  coalesce(sum(total_amount), 0)::numeric(14, 2) as revenue,
  coalesce(sum(total_cost), 0)::numeric(14, 2) as cost,
  coalesce(sum(total_profit), 0)::numeric(14, 2) as profit
from public.sales_orders
group by timezone('Asia/Ho_Chi_Minh', order_date)::date
order by revenue_date desc;

create or replace view public.v_monthly_revenue
with (security_invoker = true)
as
select
  date_trunc('month', timezone('Asia/Ho_Chi_Minh', order_date))::date as revenue_month,
  count(*)::integer as order_count,
  coalesce(sum(total_amount), 0)::numeric(14, 2) as revenue,
  coalesce(sum(total_cost), 0)::numeric(14, 2) as cost,
  coalesce(sum(total_profit), 0)::numeric(14, 2) as profit
from public.sales_orders
group by date_trunc('month', timezone('Asia/Ho_Chi_Minh', order_date))::date
order by revenue_month desc;

create or replace view public.v_best_sellers
with (security_invoker = true)
as
select
  product_id,
  product_sku,
  product_name,
  sum(quantity)::integer as sold_quantity,
  coalesce(sum(line_total), 0)::numeric(14, 2) as revenue,
  coalesce(sum(profit), 0)::numeric(14, 2) as profit
from public.sales_order_items
group by product_id, product_sku, product_name
order by sold_quantity desc, revenue desc;

create or replace view public.v_low_stock
with (security_invoker = true)
as
select
  p.id,
  p.sku,
  p.name,
  c.name as category_name,
  p.stock_quantity,
  p.low_stock_threshold
from public.products p
left join public.categories c on c.id = p.category_id
where p.is_active = true
  and p.stock_quantity <= p.low_stock_threshold
order by p.stock_quantity asc, p.name asc;

grant select on public.v_daily_revenue to authenticated;
grant select on public.v_monthly_revenue to authenticated;
grant select on public.v_best_sellers to authenticated;
grant select on public.v_low_stock to authenticated;

insert into public.categories (name, slug, description)
values
  ('CPU', 'cpu', 'Bo xu ly may tinh'),
  ('RAM', 'ram', 'Bo nho trong'),
  ('SSD', 'ssd', 'O cung SSD'),
  ('VGA', 'vga', 'Card do hoa'),
  ('Mainboard', 'mainboard', 'Bo mach chu'),
  ('PSU', 'psu', 'Nguon may tinh'),
  ('Màn hình', 'man-hinh', 'Màn hình máy tính'),
  ('Laptop', 'laptop', 'May tinh xach tay'),
  ('Phụ kiện', 'phu-kien', 'Phụ kiện máy tính'),
  ('Dịch vụ', 'dich-vu', 'Dịch vụ sửa chữa/lắp đặt')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    is_active = true;

-- Luu y de dung Supabase Free lau hon:
-- App chi luu image_url dang text cho san pham, khong luu file anh trong database.
-- Khong tao bucket anh mac dinh. Neu can anh san pham, dung link anh da toi uu tu website/drive/CDN ben ngoai.
-- Hoa don PDF duoc tao bang tinh nang Print/Save as PDF cua trinh duyet, khong luu hang loat len Supabase.

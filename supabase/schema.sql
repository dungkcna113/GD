-- GD COMPUTER - Supabase schema
-- Chay file nay trong Supabase SQL Editor sau khi tao project moi.

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

create sequence if not exists public.sales_order_number_seq start 1000;

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
  name text not null,
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

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_stock on public.products(stock_quantity);
create index if not exists idx_sales_orders_date on public.sales_orders(order_date);
create index if not exists idx_sales_items_product on public.sales_order_items(product_id);
create index if not exists idx_purchase_orders_date on public.purchase_orders(purchase_date);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);

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

drop policy if exists sales_order_items_read on public.sales_order_items;
create policy sales_order_items_read on public.sales_order_items
for select to authenticated
using (public.is_active_user());

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements
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

  insert into public.purchase_orders (supplier_id, purchase_date, note, created_by)
  values (p_supplier_id, coalesce(p_purchase_date, current_date), p_note, auth.uid())
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

  return v_order_id;
end;
$$;

grant execute on function public.create_purchase_order(uuid, date, text, jsonb) to authenticated;
grant execute on function public.create_sale_order(uuid, text, text, text, text, jsonb) to authenticated;

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

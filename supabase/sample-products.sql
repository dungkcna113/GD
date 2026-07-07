-- GD COMPUTER - sample products
-- Chay file nay trong Supabase SQL Editor neu muon tao nhanh san pham mau.

insert into public.products (
  sku,
  name,
  category_id,
  cost_price,
  sale_price,
  image_url,
  stock_quantity,
  low_stock_threshold,
  is_active
)
values
  (
    'CPU-I5-4590',
    'Intel Core i5-4590',
    (select id from public.categories where slug = 'cpu' limit 1),
    350000,
    450000,
    null,
    10,
    3,
    true
  ),
  (
    'RAM-KIN-8G-3200',
    'RAM Kingston Fury Beast 8GB DDR4 3200',
    (select id from public.categories where slug = 'ram' limit 1),
    350000,
    450000,
    null,
    15,
    5,
    true
  ),
  (
    'SSD-KIN-A400-240',
    'SSD Kingston A400 240GB SATA',
    (select id from public.categories where slug = 'ssd' limit 1),
    330000,
    420000,
    null,
    12,
    4,
    true
  ),
  (
    'VGA-ASUS-GTX1650-4G',
    'VGA ASUS GTX 1650 4GB',
    (select id from public.categories where slug = 'vga' limit 1),
    2450000,
    2850000,
    null,
    4,
    2,
    true
  )
on conflict (sku) do update
set name = excluded.name,
    category_id = excluded.category_id,
    cost_price = excluded.cost_price,
    sale_price = excluded.sale_price,
    stock_quantity = excluded.stock_quantity,
    low_stock_threshold = excluded.low_stock_threshold,
    is_active = excluded.is_active;

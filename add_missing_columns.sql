-- ============================================================
-- MIGRATION: Add missing columns to the sales table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add missing columns to sales table (safe: uses IF NOT EXISTS equivalent)
alter table sales add column if not exists subtotal numeric not null default 0;
alter table sales add column if not exists tax_amount numeric default 0;
alter table sales add column if not exists rounding_adjustment numeric default 0;
alter table sales add column if not exists paid_amount numeric not null default 0;
alter table sales add column if not exists payment_method text not null default 'CASH';
alter table sales add column if not exists points_earned numeric default 0;
alter table sales add column if not exists points_redeemed numeric default 0;
alter table sales add column if not exists discount_amount numeric default 0;
alter table sales add column if not exists created_by text not null default 'system';

-- Backfill subtotal and paid_amount from total for existing rows
update sales set subtotal = total where subtotal = 0;
update sales set paid_amount = total where paid_amount = 0;

-- Ensure RLS allows public inserts on sales and sale_items
drop policy if exists "Allow all access to sales" on sales;
create policy "Allow all access to sales"
  on sales for all to public using (true) with check (true);

drop policy if exists "Allow all access to sale_items" on sale_items;
create policy "Allow all access to sale_items"
  on sale_items for all to public using (true) with check (true);

-- Done!
select 'Migration complete. Sales table now has all required columns.' as status;

-- Hotfix: ensure physical subtypes/customization columns exist for product inserts

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS physical_subtype TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS deal_data JSONB;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS customization_config JSONB;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customization_data JSONB;

-- Force PostgREST schema cache refresh so newly added columns are recognized immediately.
NOTIFY pgrst, 'reload schema';

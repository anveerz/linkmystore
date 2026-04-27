-- v2.1 product-mode and order customization support

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS physical_subtype TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS deal_data JSONB;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS customization_config JSONB;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customization_data JSONB;

UPDATE products
SET physical_subtype = 'standard'
WHERE type = 'physical'
  AND (physical_subtype IS NULL OR physical_subtype = '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_physical_subtype_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_physical_subtype_check
      CHECK (
        physical_subtype IS NULL
        OR physical_subtype IN (
          'standard',
          'creator_deal',
          'custom_photoframe',
          'portrait_canvas'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_physical_subtype ON products(physical_subtype);

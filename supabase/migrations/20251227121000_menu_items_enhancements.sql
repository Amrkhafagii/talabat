-- Enhance menu_items with category binding, scheduling, and options
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS available_start_time text,
ADD COLUMN IF NOT EXISTS available_end_time text,
ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS addons jsonb DEFAULT '[]';

-- Try to backfill category_id from existing category names
UPDATE menu_items mi
SET category_id = c.id
FROM categories c
WHERE mi.category_id IS NULL
  AND lower(mi.category) = lower(c.name);

-- Ensure sort order is non-null
UPDATE menu_items
SET sort_order = 0
WHERE sort_order IS NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

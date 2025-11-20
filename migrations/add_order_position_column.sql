-- Migracja: Dodanie kolumny order_position do order_item
-- Data: 2025-10-27
-- Cel: Umożliwienie sortowania pozycji w zamówieniu

-- Dodaj kolumnę order_position
ALTER TABLE order_item ADD COLUMN order_position INT DEFAULT 0;

-- Ustaw domyślne wartości order_position na podstawie id (aktualny porządek)
UPDATE order_item 
SET order_position = id 
WHERE order_position = 0;

-- Normalizuj order_position dla każdego zamówienia (1, 2, 3, ...)
SET @row_number = 0;
SET @prev_order_id = '';

UPDATE order_item o1
JOIN (
    SELECT 
        id,
        @row_number := CASE 
            WHEN @prev_order_id = order_id THEN @row_number + 1 
            ELSE 1 
        END AS new_position,
        @prev_order_id := order_id
    FROM order_item 
    ORDER BY order_id, id
) o2 ON o1.id = o2.id
SET o1.order_position = o2.new_position;

-- Dodaj indeks dla lepszej wydajności
CREATE INDEX idx_order_item_position ON order_item(order_id, order_position);
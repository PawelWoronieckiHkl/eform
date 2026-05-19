-- Migration: Add employee permissions columns
-- Date: 2025
-- Description: Adds can_send_orders, can_see_prices, can_see_all_orders columns to employee table
-- Requirements: 1.1, 1.2

-- Idempotent migration using conditional column addition (MySQL/MariaDB)

-- Add can_send_orders column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'employee';

SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'can_send_orders';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE employee ADD COLUMN can_send_orders TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add can_see_prices column if it doesn't exist
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'can_see_prices';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE employee ADD COLUMN can_see_prices TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add can_see_all_orders column if it doesn't exist
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'can_see_all_orders';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE employee ADD COLUMN can_see_all_orders TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

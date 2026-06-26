-- Migration: Order correction support (admin module)
-- Adds corrected_at audit column for tracking admin price corrections

SET @dbname = DATABASE();
SET @tablename = 'order';

SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'corrected_at';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE `order` ADD COLUMN corrected_at DATETIME NULL DEFAULT NULL AFTER sent_date',
  'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

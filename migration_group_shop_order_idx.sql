-- Migration: allow group_user order numbers like 1-1, 1-2, 2-1
-- The order_idx column must be textual, and the default trigger must not overwrite
-- an order_idx explicitly provided by application code.

ALTER TABLE `order`
  MODIFY COLUMN `order_idx` VARCHAR(32) DEFAULT NULL;

UPDATE `order`
SET `order_idx` = REPLACE(`order_idx`, '_', '-')
WHERE `group_user_id` IS NOT NULL
  AND `order_idx` REGEXP '^[0-9]+_[0-9]+$';

DROP TRIGGER IF EXISTS `before_insert_order`;

DELIMITER //
CREATE TRIGGER `before_insert_order`
BEFORE INSERT ON `order`
FOR EACH ROW
BEGIN
  DECLARE max_idx INT DEFAULT 0;

  IF NEW.order_idx IS NULL OR NEW.order_idx = '' THEN
    SELECT COALESCE(MAX(CAST(order_idx AS UNSIGNED)), 0)
      INTO max_idx
      FROM `order`
      WHERE user_id = NEW.user_id
        AND group_user_id IS NULL
        AND order_idx REGEXP '^[0-9]+$';

    SET NEW.order_idx = CAST(max_idx + 1 AS CHAR);
  END IF;
END//
DELIMITER ;
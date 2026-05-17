-- Migration: widen phone fields that store international phone numbers.
-- Example valid value: 00494504205022

ALTER TABLE `send_address`
  MODIFY COLUMN `phone` VARCHAR(50);

ALTER TABLE `order_address`
  MODIFY COLUMN `phone` VARCHAR(50);

-- Migration: Add permission columns to employee table
-- Adds three independent permission flags for employee access control:
--   can_send_orders - controls ability to send/submit orders
--   can_see_prices - controls visibility of product prices and order totals
--   can_see_all_orders - controls whether employee sees all owner's orders or only their own
-- All default to 0 (disabled) for new and existing employees

ALTER TABLE `employee`
    ADD COLUMN `can_send_orders` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN `can_see_prices` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN `can_see_all_orders` TINYINT(1) NOT NULL DEFAULT 0;

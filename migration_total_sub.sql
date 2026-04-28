-- Migration: add total_price_sub column to store SUB___ parameter price totals
-- Applies to: order_item and order tables

ALTER TABLE `order_item`
  ADD COLUMN `total_price_sub` DECIMAL(10,2) DEFAULT 0 AFTER `total_price`;

ALTER TABLE `order`
  ADD COLUMN `total_price_sub` DECIMAL(10,2) DEFAULT 0 AFTER `total_price_hidden`;

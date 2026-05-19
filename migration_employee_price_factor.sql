-- Migration: Add price_factor column to employee table
-- price_factor is a multiplier applied to displayed prices for the employee (visual only).
-- Default 1.00 means no change. Values like 1.10 = +10%, 0.90 = -10%.
-- This factor is NEVER applied to saved/sent order data — only to what the employee sees on screen.

ALTER TABLE `employee`
    ADD COLUMN `price_factor` DECIMAL(4,2) NOT NULL DEFAULT 1.00;

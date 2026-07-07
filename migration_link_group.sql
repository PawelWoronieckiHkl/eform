-- Migration: add link_group to order_item
-- Positions sharing the same link_group UUID are treated as "hanging together"
ALTER TABLE order_item ADD COLUMN link_group VARCHAR(36) DEFAULT NULL;

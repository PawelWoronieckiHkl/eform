-- Migration: add max_prod_days column to order table
ALTER TABLE `order` ADD COLUMN `max_prod_days` INT DEFAULT NULL;

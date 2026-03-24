-- Migration to add spedition_numbers field to order table
-- This field stores unique parcel tracking codes as JSON array
-- Run this before using the new tracking numbers feature

ALTER TABLE `order` 
ADD COLUMN `spedition_numbers` JSON DEFAULT NULL 
COMMENT 'Stores unique parcel tracking codes as JSON array';

-- Example data format:
-- ["DPD 123456789", "UPS 987654321", "DHL AB123456789CD"]

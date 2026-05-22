-- Migration: Create client_aliases table
-- Stores VALUE/ALIAS/DESCRIPTION from paramdict-<PARAM>-<COLLECTION>.txt files

CREATE TABLE IF NOT EXISTS client_aliases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  value_col VARCHAR(191) NOT NULL,
  alias VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  parameter VARCHAR(100) NOT NULL,
  collection VARCHAR(100) NOT NULL,
  group_number VARCHAR(10) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_value_group (value_col, group_number, parameter, collection)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

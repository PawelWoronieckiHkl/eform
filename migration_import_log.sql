-- Migration: Create import_log table for tracking order import results

CREATE TABLE IF NOT EXISTS import_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  status ENUM('success', 'error', 'partial') NOT NULL DEFAULT 'success',
  order_id INT DEFAULT NULL,
  user_ident VARCHAR(100) DEFAULT NULL,
  items_count INT DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  error_details TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_user (user_ident)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

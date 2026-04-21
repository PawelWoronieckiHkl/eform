-- Add recent_clients column to user table (JSON array of recently selected clients)
ALTER TABLE `user` ADD COLUMN `recent_clients` JSON DEFAULT NULL;

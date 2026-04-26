-- ═══════════════════════════════════════════════════════════════════
-- EFORM — migracja modułu Group Users (sklepy podpięte pod group-user)
-- Bezpieczna do wielokrotnego uruchomienia.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS group_user (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  parent_user_id INT NOT NULL
    COMMENT 'FK do user.id — użytkownik z role=group, który jest właścicielem sklepu',
  ident          VARCHAR(50)  NOT NULL UNIQUE
    COMMENT 'Identyfikator sklepu (np. TCNShop1)',
  client_name    VARCHAR(100) NOT NULL
    COMMENT 'Nazwa sklepu / kontrahenta',
  login          VARCHAR(50)  NOT NULL UNIQUE
    COMMENT 'Login do logowania w eFor',
  password       VARCHAR(255) NOT NULL
    COMMENT 'Hasło bcrypt',
  street         VARCHAR(200) NOT NULL DEFAULT '',
  zip            VARCHAR(20)  NOT NULL DEFAULT '',
  city           VARCHAR(100) NOT NULL DEFAULT '',
  phone          VARCHAR(50)  NOT NULL DEFAULT '',
  email          VARCHAR(100) NOT NULL DEFAULT '',
  shop_number    INT          NOT NULL DEFAULT 0
    COMMENT 'Numer sklepu używany w numeracji zamówień (np. 7-32)',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_group_user_parent
    FOREIGN KEY (parent_user_id) REFERENCES `user`(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Kolumna łącząca zamówienie z konkretnym sklepem grupy
-- UWAGA: Uruchom tylko raz. MySQL 9.x nie obsługuje ADD COLUMN IF NOT EXISTS.
ALTER TABLE `order`
  ADD COLUMN `group_user_id` INT DEFAULT NULL
    COMMENT 'FK do group_user.id — sklep, ktory zlozyl zamowienie';

-- Opisowa nazwa sklepu (np. "Sklep Centrum Warszawa") — wyświetlana w panelu grupy
-- UWAGA: Uruchom tylko raz. Jeśli kolumna już istnieje, zignoruj błąd "Duplicate column".
ALTER TABLE `group_user`
  ADD COLUMN `name` VARCHAR(150) NOT NULL DEFAULT ''
    COMMENT 'Nazwa opisowa sklepu, wyświetlana w panelu grupy';

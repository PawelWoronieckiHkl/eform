-- Migration: Create department, product_group, and group_delivery_mapping tables
-- Run this migration to set up the delivery-time lookup infrastructure.

CREATE TABLE IF NOT EXISTS department (
  id INT PRIMARY KEY,
  name_pl VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_de VARCHAR(100) NOT NULL,
  name_nl VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_group (
  group_number VARCHAR(10) PRIMARY KEY,
  department_id INT NOT NULL,
  name_pl VARCHAR(100),
  name_en VARCHAR(100),
  name_de VARCHAR(100),
  name_nl VARCHAR(100),
  name_fr VARCHAR(100),
  FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_delivery_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_number VARCHAR(10) NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  is_slope TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (group_number) REFERENCES product_group(group_number) ON DELETE CASCADE,
  UNIQUE KEY uq_group_product (group_number, product_code)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Initial department data (from grupy.xlsx)
INSERT INTO department (id, name_pl, name_en, name_de, name_nl, name_fr) VALUES
  (1, 'PLISY',              'PLEATED BLINDS',    'PLISSEE',           'PLISSÉGORDIJNEN',   'STORES PLISSÉE'),
  (2, 'ŻALUZJE',            'VENETIAN BLINDS',   'JALOUSIEN',         'JALOEZIEËN',        'STORES VÉNITIENS'),
  (3, 'ROLETY',             'ROLLER BLINDS',     'ROLLOS',            'ROLGORDIJNEN',      'STORES ENROULEURS'),
  (4, 'VERTIKAL',           'VERTIKAL',          'VERTIKAL',          'VERTIKAL',          'VERTIKAL'),
  (5, 'KOMPONENTY',         'KOMPONENTS',        'KOMPONENTEN',       'COMPONENTEN',       'COMPOSANTS'),
  (6, 'RAMKA MAGNETYCZNA',  'MAGNETIC FRAME',    'MAGNETRAHMEN',      'MAGNETISCH FRAME',  'CADRE MAGNÉTIQUE'),
  (7, 'RZYMSKIE',           'ROMANSHADES',       'RAFFROLLO',         'VOUW-GARDIJNEN',    'STORES ROMAINS'),
  (8, 'ZASŁONY',            'CURTAINS',          'VORHÄNGE',          'GORDIJNEN',         'RIDEAUX'),
  (9, 'MOSKITIERY',         'MOSKITIERY',        'MOSKITIERY',        'MOSKITIERY',        'MOSKITIERY')
ON DUPLICATE KEY UPDATE
  name_pl=VALUES(name_pl), name_en=VALUES(name_en), name_de=VALUES(name_de),
  name_nl=VALUES(name_nl), name_fr=VALUES(name_fr);

-- Initial product_group data (from Excel config files)
INSERT INTO product_group (group_number, department_id, name_pl, name_en, name_de, name_nl, name_fr) VALUES
  ('71', 1, 'EOS',                          'EOS',                    'EOS',                    'EOS',                          'EOS'),
  ('43', 1, 'COSIFLOR',                     'COSIFLOR',               'COSIFLOR',               'COSIFLOR',                     'COSIFLOR'),
  ('20', 1, 'BASIC',                        'BASIC',                  'BASIC',                  'BASIC',                        'BASIC'),
  ('39', 2, 'ŻALUZJA ALUMINIOWA 16/25',     'VENETIAN BLINDS 16/25',  'ALUJALOUSIE 16/25',      'ALUMINIUM JALOEZIEËN 16/25',   'STORES VÉNITIENS EN ALU 16/25'),
  ('02', 2, 'ALUMINIOWA 35/50',             'VENETIANBLINDS 35/50',   'ALUMINIUM 35/50',        'ALUMINIUM 35/50',              'STORES VÉNITIENS EN ALU 35/50'),
  ('59', 2, 'ŻALUZJA DREWNIANA',            'WOOD BLINDS',            'HOLZJALOUSIEN',          'HOUTENJALOEZIEËN',              'STORES VÉNITIENS BOIS'),
  ('04', 2, 'ŻALUZJA ALUMINIOWA 25 BASIC',  'VENETIAN BLINDS 25 Basic','ALUJALOUSIE 25 basic',  'ALUMINIUM JALOEZIEËN 25 BASIC', 'STORES VÉNITIENS EN ALU 25 bas'),
  ('75', 3, 'COULISSE',                     'ABSOLUUT',               'ABSOLUTE',               'ABSOLUUT',                     'COULISSE'),
  ('76', 3, 'NOWY STYL',                    'NOWY STYL',              'NOWY STYL',              'NOWY STYL',                    'NOWY STYL'),
  ('14', 4, 'VERTIKAL',                     'VERTICAL BLIND',         'VERTIKALJALOUSIE',       'VERTICALE JALOEZIE',           'VERTICAL'),
  ('01', 5, 'KOMPONENTY',                   'COMPONENTS',             'EINZELTEILE',            'COMPONENTEN',                  'COMPOSANTS'),
  ('80', 6, 'MFPlus',                       'MFPlus',                 'MFPlus',                 'MFPlus',                       'MFPlus'),
  ('24', 7, 'RZYMSKIE',                     'ROMANSHADES',            'RAFFROLLO',              'VOUW-GARDIJNEN',               'STORES ROMAINS'),
  ('73', 8, 'ZASŁONY',                      'CURTAINS',               'VORHÄNGE',               'GORDIJNEN',                    'RIDEAUX'),
  ('11', 9, 'MOSKITIERY',                   'MOSKITIERY',             'MOSKITIERY',             'MOSKITIERY',                   'MOSKITIERY')
ON DUPLICATE KEY UPDATE
  department_id=VALUES(department_id),
  name_pl=VALUES(name_pl), name_en=VALUES(name_en), name_de=VALUES(name_de),
  name_nl=VALUES(name_nl), name_fr=VALUES(name_fr);

-- Mapping: group_number → product_code(s) from organization_delivery_terms
-- Based on grupy.xlsx "DANE Z DAT DOSTAW" rows, translated via data.js timesObj

-- Dept 1: PLISY (Plisses / Duette System EOS + AU,AB,AL; Cosiflor)
INSERT IGNORE INTO group_delivery_mapping (group_number, product_code) VALUES
  ('71', 'termin.PBEOS'),
  ('71', 'termin.PBEOSCHR'),
  ('43', 'termin.PBCOSI');

-- Dept 2: ŻALUZJE
INSERT IGNORE INTO group_delivery_mapping (group_number, product_code) VALUES
  ('39', 'termin.VB25ULTIMATE'),
  ('02', 'termin.VB50'),
  ('02', 'termin.VB35'),
  ('59', 'termin.VBWOOD'),
  ('04', 'termin.VB25EUR');

-- Dept 3: ROLETY (Rollos Modell 1,2,3,4,5,6)
INSERT IGNORE INTO group_delivery_mapping (group_number, product_code) VALUES
  ('75', 'termin.RM1');

-- Dept 4: VERTIKAL
INSERT IGNORE INTO group_delivery_mapping (group_number, product_code) VALUES
  ('14', 'termin.VERTIKAL');

-- Dept 6: RAMKA MAGNETYCZNA (Jalousien Perfect Fit)
INSERT IGNORE INTO group_delivery_mapping (group_number, product_code) VALUES
  ('80', 'termin.VB25DUOPF'),
  ('80', 'termin.VB25DUOPFVS');

-- Dept 7: RZYMSKIE (Raffrollos)
INSERT IGNORE INTO group_delivery_mapping (group_number, product_code) VALUES
  ('24', 'termin.RR');

-- SLOPE mappings (extended production times for slope products)
INSERT IGNORE INTO group_delivery_mapping (group_number, product_code, is_slope) VALUES
  ('39', 'termin.VB25SLOPE', 1),
  ('04', 'termin.VB25SLOPE', 1),
  ('02', 'termin.VB50SLOPE', 1),
  ('59', 'termin.VBWOODSLOPE', 1),
  ('71', 'termin.PBSLOPE', 1),
  ('43', 'termin.PBSLOPE', 1);

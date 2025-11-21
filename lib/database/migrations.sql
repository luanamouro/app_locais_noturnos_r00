-- ============================================
-- MySQL Schema para Locais Noturnos
-- ============================================
-- Requisitos: MySQL 8.0+
-- Encoding: utf8mb4 (suporta emojis e caracteres especiais)

CREATE DATABASE IF NOT EXISTS locais_noturnos_dev 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE locais_noturnos_dev;

-- ============================================
-- Tabela: users
-- Armazena dados dos usuários do app
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB COMMENT='Usuários do aplicativo';

-- ============================================
-- Tabela: venues
-- Locais sincronizados com Google Places
-- ============================================
CREATE TABLE IF NOT EXISTS venues (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  google_place_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'ID do Google Places',
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8) COMMENT 'Latitude (-90 a 90)',
  longitude DECIMAL(11, 8) COMMENT 'Longitude (-180 a 180)',
  types JSON COMMENT 'Array de tipos do Google Places',
  rating DECIMAL(2, 1) COMMENT 'Rating médio do Google (0.0 a 5.0)',
  user_ratings_total INT DEFAULT 0 COMMENT 'Total de avaliações no Google',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_google_place_id (google_place_id),
  INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB COMMENT='Locais noturnos do Google Places';

-- ============================================
-- Tabela: reviews
-- Avaliações dos usuários sobre locais
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  venue_id CHAR(36) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
  INDEX idx_venue_id (venue_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='Avaliações de usuários';

-- ============================================
-- Tabela: favorites
-- Locais favoritados pelos usuários
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  venue_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_venue (user_id, venue_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='Favoritos dos usuários';

-- ============================================
-- Tabela: check_ins (opcional)
-- Registra visitas dos usuários aos locais
-- ============================================
CREATE TABLE IF NOT EXISTS check_ins (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  venue_id CHAR(36) NOT NULL,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_venue_id (venue_id),
  INDEX idx_checked_at (checked_at)
) ENGINE=InnoDB COMMENT='Check-ins de usuários';

-- ============================================
-- Dados de Teste (opcional)
-- ============================================
-- Descomente para inserir dados de exemplo

-- INSERT INTO users (email, name) VALUES
--   ('usuario@exemplo.com', 'Usuário Teste'),
--   ('admin@exemplo.com', 'Admin Teste');

-- INSERT INTO venues (google_place_id, name, address, latitude, longitude, types, rating, user_ratings_total) VALUES
--   ('ChIJ0WGkg4FEzpQRrlsz_whLqZs', 'Bar Exemplo', 'Rua Exemplo, 123 - São Paulo', -23.550520, -46.633308, '["bar", "restaurant"]', 4.5, 150);

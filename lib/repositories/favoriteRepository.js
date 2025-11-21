/**
 * Favorite Repository
 * Gerencia locais favoritos dos usuários.
 */
import { query, queryOne } from '../database/client.js';

/**
 * Adiciona um local aos favoritos do usuário.
 * @param {string} userId
 * @param {string} venueId
 * @returns {Promise<Object>}
 */
export async function addFavorite(userId, venueId) {
  await query(
    `INSERT INTO favorites (id, user_id, venue_id)
     VALUES (UUID(), ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [userId, venueId]
  );
  const row = await queryOne(
    `SELECT f.id as favorite_id,
            f.created_at,
            v.id as venue_id,
            v.google_place_id,
            v.name as venue_name,
            v.address as venue_address,
            v.latitude,
            v.longitude,
            v.types,
            v.rating,
            v.user_ratings_total
     FROM favorites f
     JOIN venues v ON f.venue_id = v.id
     WHERE f.user_id = ? AND f.id = (SELECT id FROM favorites WHERE user_id = ? AND venue_id = ? LIMIT 1)`,
    [userId, userId, venueId]
  );
  if (row && row.types) {
    try {
      const t = row.types.trim();
      if (t.startsWith('[') || t.startsWith('{')) {
        row.types = JSON.parse(t);
      } else {
        row.types = t.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch (_) {
      row.types = [];
    }
  } else if (row) {
    row.types = [];
  }
  return row;
}

/**
 * Remove um local dos favoritos do usuário.
 * @param {string} userId
 * @param {string} venueId
 */
export async function removeFavorite(userId, venueId) {
  await query(
    'DELETE FROM favorites WHERE user_id = ? AND venue_id = ?',
    [userId, venueId]
  );
}

/**
 * Verifica se um local está nos favoritos do usuário.
 * @param {string} userId
 * @param {string} venueId
 * @returns {Promise<boolean>}
 */
export async function isFavorite(userId, venueId) {
  const result = await queryOne(
    'SELECT 1 FROM favorites WHERE user_id = ? AND venue_id = ?',
    [userId, venueId]
  );
  return !!result;
}

/**
 * Busca todos os favoritos de um usuário.
 * @param {string} userId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
export async function findFavoritesByUser(userId, limit = 50, offset = 0) {
  const lim = Number.isFinite(limit) ? Math.max(0, parseInt(limit, 10)) : 50;
  const off = Number.isFinite(offset) ? Math.max(0, parseInt(offset, 10)) : 0;

  const sql = `SELECT 
            f.id as favorite_id,
            f.user_id,
            f.venue_id,
            f.created_at,
            v.google_place_id,
            v.name as venue_name, 
            v.address as venue_address,
            v.latitude,
            v.longitude,
            v.types,
            v.rating,
            v.user_ratings_total
     FROM favorites f
     JOIN venues v ON f.venue_id = v.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC
     LIMIT ${lim} OFFSET ${off}`;

  const favorites = await query(sql, [userId]);

  return favorites.map(fav => {
    if (fav.types) {
      // Tenta fazer parse como JSON; se falhar, tenta split por vírgula
      try {
        if (typeof fav.types === 'string') {
          const trimmed = fav.types.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            fav.types = JSON.parse(trimmed);
          } else {
            fav.types = trimmed
              .split(',')
              .map(t => t.trim())
              .filter(Boolean);
          }
        }
      } catch (_) {
        fav.types = [];
      }
    } else {
      fav.types = [];
    }
    return fav;
  });
}

/**
 * Conta quantos favoritos um local possui.
 * @param {string} venueId
 * @returns {Promise<number>}
 */
export async function countVenueFavorites(venueId) {
  const result = await queryOne(
    'SELECT COUNT(*) as total FROM favorites WHERE venue_id = ?',
    [venueId]
  );
  return result.total;
}

/**
 * Busca os locais mais favoritados.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function findMostFavoritedVenues(limit = 10) {
  const venues = await query(
    `SELECT v.*, COUNT(f.id) as favorites_count
     FROM venues v
     LEFT JOIN favorites f ON v.id = f.venue_id
     GROUP BY v.id
     ORDER BY favorites_count DESC
     LIMIT ?`,
    [limit]
  );

  return venues.map(v => {
    if (v.types) v.types = JSON.parse(v.types);
    return v;
  });
}

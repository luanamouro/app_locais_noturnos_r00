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

  return await queryOne(
    `SELECT f.*, v.name as venue_name, v.address as venue_address, v.latitude, v.longitude
     FROM favorites f
     JOIN venues v ON f.venue_id = v.id
     WHERE f.user_id = ? AND f.venue_id = ?`,
    [userId, venueId]
  );
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
  const favorites = await query(
    `SELECT f.*, 
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
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return favorites.map(fav => {
    if (fav.types) {
      fav.types = JSON.parse(fav.types);
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

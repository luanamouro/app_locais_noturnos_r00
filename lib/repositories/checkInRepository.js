/**
 * Check-in Repository
 * Gerencia check-ins dos usuários em locais.
 */
import { query, queryOne } from '../database/client.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Registra um check-in do usuário em um local.
 * @param {string} userId
 * @param {string} venueId
 * @returns {Promise<Object>}
 */
export async function createCheckIn(userId, venueId) {
  await query(
    `INSERT INTO check_ins (id, user_id, venue_id)
     VALUES (UUID(), ?, ?)`,
    [userId, venueId]
  );

  const checkIn = await queryOne(
    `SELECT c.*, v.name as venue_name, v.address as venue_address
     FROM check_ins c
     JOIN venues v ON c.venue_id = v.id
     WHERE c.user_id = ? AND c.venue_id = ?
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [userId, venueId]
  );

  return checkIn;
}

/**
 * Busca todos os check-ins de um usuário.
 * @param {string} userId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
export async function findCheckInsByUser(userId, limit = 50, offset = 0) {
  const checkIns = await query(
    `SELECT c.*, 
            v.name as venue_name, 
            v.address as venue_address,
            v.latitude,
            v.longitude,
            v.types
     FROM check_ins c
     JOIN venues v ON c.venue_id = v.id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return checkIns.map(ci => {
    if (ci.types) ci.types = JSON.parse(ci.types);
    return ci;
  });
}

/**
 * Busca todos os check-ins de um local.
 * @param {string} venueId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
export async function findCheckInsByVenue(venueId, limit = 50, offset = 0) {
  const checkIns = await query(
    `SELECT c.*, 
            u.name as user_name, 
            u.photo_url as user_photo_url
     FROM check_ins c
     JOIN users u ON c.user_id = u.id
     WHERE c.venue_id = ?
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [venueId, limit, offset]
  );

  return checkIns;
}

/**
 * Conta quantos check-ins um local possui.
 * @param {string} venueId
 * @returns {Promise<number>}
 */
export async function countVenueCheckIns(venueId) {
  const result = await queryOne(
    'SELECT COUNT(*) as total FROM check_ins WHERE venue_id = ?',
    [venueId]
  );
  return result.total;
}

/**
 * Conta quantos check-ins um usuário possui.
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function countUserCheckIns(userId) {
  const result = await queryOne(
    'SELECT COUNT(*) as total FROM check_ins WHERE user_id = ?',
    [userId]
  );
  return result.total;
}

/**
 * Busca o último check-in do usuário.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function findLatestCheckIn(userId) {
  const checkIn = await queryOne(
    `SELECT c.*, 
            v.name as venue_name, 
            v.address as venue_address,
            v.latitude,
            v.longitude
     FROM check_ins c
     JOIN venues v ON c.venue_id = v.id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [userId]
  );

  return checkIn;
}

/**
 * Deleta um check-in específico.
 * @param {string} id
 */
export async function deleteCheckIn(id) {
  const result = await query('DELETE FROM check_ins WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    throw new NotFoundError('Check-in não encontrado');
  }
}

/**
 * Busca os locais mais visitados (com mais check-ins).
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function findMostVisitedVenues(limit = 10) {
  const venues = await query(
    `SELECT v.*, COUNT(c.id) as check_ins_count
     FROM venues v
     LEFT JOIN check_ins c ON v.id = c.venue_id
     GROUP BY v.id
     ORDER BY check_ins_count DESC
     LIMIT ?`,
    [limit]
  );

  return venues.map(v => {
    if (v.types) v.types = JSON.parse(v.types);
    return v;
  });
}

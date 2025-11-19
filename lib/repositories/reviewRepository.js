/**
 * Review Repository
 * Gerencia avaliações de usuários sobre locais.
 */
import { query, queryOne } from '../database/client.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Busca review por ID.
 * @param {string} id - UUID do review
 * @returns {Promise<Object>}
 * @throws {NotFoundError}
 */
export async function findReviewById(id) {
  const review = await queryOne('SELECT * FROM reviews WHERE id = ?', [id]);
  if (!review) {
    throw new NotFoundError('Review não encontrado');
  }
  return review;
}

/**
 * Cria uma nova avaliação.
 * @param {Object} reviewData - { user_id, venue_id, rating, comment? }
 * @returns {Promise<Object>}
 */
export async function createReview(reviewData) {
  const { user_id, venue_id, rating, comment } = reviewData;

  const result = await query(
    `INSERT INTO reviews (id, user_id, venue_id, rating, comment)
     VALUES (UUID(), ?, ?, ?, ?)`,
    [user_id, venue_id, rating, comment || null]
  );

  // MySQL não tem RETURNING, buscar o registro inserido
  const newReview = await queryOne(
    'SELECT * FROM reviews WHERE user_id = ? AND venue_id = ? ORDER BY created_at DESC LIMIT 1',
    [user_id, venue_id]
  );

  return newReview;
}

/**
 * Busca todas as avaliações de um local.
 * @param {string} venueId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
export async function findReviewsByVenue(venueId, limit = 50, offset = 0) {
  const reviews = await query(
    `SELECT r.*, u.name as user_name, u.photo_url as user_photo_url
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.venue_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [venueId, limit, offset]
  );
  return reviews;
}

/**
 * Busca todas as avaliações de um usuário.
 * @param {string} userId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
export async function findReviewsByUser(userId, limit = 50, offset = 0) {
  const reviews = await query(
    `SELECT r.*, v.name as venue_name, v.address as venue_address
     FROM reviews r
     JOIN venues v ON r.venue_id = v.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return reviews;
}

/**
 * Atualiza uma avaliação existente.
 * @param {string} id
 * @param {Object} updates - { rating?, comment? }
 * @returns {Promise<Object>}
 */
export async function updateReview(id, updates) {
  const { rating, comment } = updates;
  
  const fields = [];
  const values = [];
  
  if (rating !== undefined) {
    fields.push('rating = ?');
    values.push(rating);
  }
  if (comment !== undefined) {
    fields.push('comment = ?');
    values.push(comment);
  }

  if (fields.length === 0) {
    return await findReviewById(id);
  }

  values.push(id);

  await query(
    `UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return await findReviewById(id);
}

/**
 * Deleta uma avaliação.
 * @param {string} id
 */
export async function deleteReview(id) {
  const result = await query('DELETE FROM reviews WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    throw new NotFoundError('Review não encontrado');
  }
}

/**
 * Calcula a média de avaliações de um local.
 * @param {string} venueId
 * @returns {Promise<Object>} { average: number, total: number }
 */
export async function getVenueRatingStats(venueId) {
  const stats = await queryOne(
    `SELECT 
      COALESCE(AVG(rating), 0) as average,
      COUNT(*) as total
     FROM reviews
     WHERE venue_id = ?`,
    [venueId]
  );
  return {
    average: parseFloat(stats.average),
    total: stats.total
  };
}

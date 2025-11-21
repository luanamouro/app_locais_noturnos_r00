/**
 * User Repository
 * Gerencia operações CRUD de usuários no MySQL.
 */
import { query, queryOne } from '../database/client.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Busca usuário por ID.
 * @param {string} id - UUID do usuário
 * @returns {Promise<Object|null>}
 */
export async function findUserById(id) {
  return await queryOne('SELECT * FROM users WHERE id = ?', [id]);
}

/**
 * Busca usuário por email.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function findUserByEmail(email) {
  return await queryOne('SELECT * FROM users WHERE email = ?', [email]);
}

/**
 * Cria um novo usuário.
 * @param {Object} userData - { email, name, password_hash, avatar_url? }
 * @returns {Promise<Object>} Usuário criado (com password_hash removido ref no service)
 */
export async function createUser(userData) {
  const { email, name, avatar_url, password_hash } = userData;

  await query(
    'INSERT INTO users (id, email, name, avatar_url, password_hash) VALUES (UUID(), ?, ?, ?, ?)',
    [email, name, avatar_url || null, password_hash]
  );

  // Busca pelo email (UUID() impede uso de LAST_INSERT_ID())
  const user = await findUserByEmail(email);
  return user;
}

/**
 * Atualiza dados de um usuário.
 * @param {string} id - UUID do usuário
 * @param {Object} updates - { name?, avatar_url? }
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function updateUser(id, updates) {
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.avatar_url !== undefined) {
    fields.push('avatar_url = ?');
    values.push(updates.avatar_url);
  }
  
  if (fields.length === 0) {
    return await findUserById(id);
  }
  
  values.push(id);
  await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  const user = await findUserById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  return user;
}

/**
 * Deleta um usuário (e cascateia para reviews, favorites, check-ins).
 * @param {string} id - UUID do usuário
 */
export async function deleteUser(id) {
  const result = await query('DELETE FROM users WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    throw new NotFoundError('User not found');
  }
}

/**
 * Lista usuários com paginação.
 * @param {number} limit 
 * @param {number} offset 
 * @returns {Promise<Array>}
 */
export async function listUsers(limit = 50, offset = 0) {
  return await query(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
}

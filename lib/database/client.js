/**
 * Query wrapper com logging e error handling.
 * Fornece métodos para executar queries, transações e queries únicas.
 */
import pool from './pool.js';
import logger from '../utils/logger.js';

/**
 * Executa uma query SQL com placeholders ?.
 * @param {string} sql - Query SQL com placeholders ?
 * @param {Array} params - Parâmetros da query
 * @returns {Promise<Array>} Resultado da query
 */
export async function query(sql, params = []) {
  const start = Date.now();
  try {
    const [rows] = await pool.execute(sql, params);
    const duration = Date.now() - start;
    logger.info({ 
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''), 
      duration, 
      rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows 
    });
    return rows;
  } catch (error) {
    logger.error({ 
      sql: sql.substring(0, 100), 
      error: error.message,
      code: error.code 
    });
    throw error;
  }
}

/**
 * Executa múltiplas queries em uma transação.
 * Se alguma query falhar, faz rollback automático.
 * @param {Function} callback - Função async que recebe a connection
 * @returns {Promise} Resultado do callback
 */
export async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    logger.info({ transaction: 'committed' });
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error({ transaction: 'rollback', error: error.message });
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Retorna uma única linha (primeira) ou null.
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Object|null>}
 */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

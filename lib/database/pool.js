/**
 * MySQL Connection Pool
 * Gerencia um pool de conexões reutilizáveis ao MySQL usando mysql2/promise.
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Garante que variáveis do .env estejam carregadas antes de ler process.env
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'locais_noturnos_dev',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: 'Z', // UTC
});

// Testa a conexão ao iniciar
pool.getConnection()
  .then(connection => {
    console.log('✓ MySQL connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('✗ MySQL connection error:', err.message);
    console.error('  Check your .env database credentials');
  });

export default pool;

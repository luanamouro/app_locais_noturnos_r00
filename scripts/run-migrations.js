#!/usr/bin/env node
/**
 * Script de execução de migrações MySQL a partir de migrations.sql
 * Ignora erros benignos (ex: tabela já existe) e continua.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const MIGRATIONS_FILE = path.resolve('lib', 'database', 'migrations.sql');

async function loadSQLStatements(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Remove comentários de linha começando com --
  const cleaned = raw
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  // Quebra por ponto e vírgula mantendo blocos
  const statements = [];
  let buffer = '';
  for (const line of cleaned.split('\n')) {
    buffer += line + '\n';
    if (line.trim().endsWith(';')) {
      const stmt = buffer.trim();
      if (stmt.length > 1) {
        statements.push(stmt);
      }
      buffer = '';
    }
  }
  return statements;
}

async function run() {
  console.log('🔧 Iniciando migrações...');
  const {
    DB_HOST = 'localhost',
    DB_PORT = 3306,
    DB_USER = 'root',
    DB_PASSWORD = '',
  } = process.env;

  // Conecta sem selecionar DB para permitir CREATE DATABASE
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    const statements = await loadSQLStatements(MIGRATIONS_FILE);
    let executed = 0;
    for (const sql of statements) {
      try {
        await connection.query(sql);
        executed++;
        if (executed % 5 === 0) {
          console.log(`➡️  Executadas ${executed} statements...`);
        }
      } catch (err) {
        // Erros toleráveis (tabela já existe etc.)
        const benignErrors = ['ER_TABLE_EXISTS_ERROR', 'ER_DUP_FIELDNAME'];
        if (benignErrors.includes(err.code)) {
          console.warn(`⚠️  Ignorando erro benigno (${err.code}): ${err.message}`);
          continue;
        }
        console.error(`❌ Erro na statement: ${sql.substring(0, 80)}...`);
        throw err;
      }
    }
    console.log(`✅ Migrações concluídas. Total statements: ${executed}`);
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Falha nas migrações:', err.message);
  process.exit(1);
});

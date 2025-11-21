/**
 * Authentication Service
 * Gerencia autenticação, hash de senha e validações de usuário.
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByEmail, createUser, findUserById } from '../repositories/userRepository.js';
import logger from '../utils/logger.js';
import { ValidationError, EmailAlreadyExistsError, UserNotFoundError, InvalidPasswordError } from '../utils/errors.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expira em 7 dias

/**
 * Hash de senha usando bcrypt.
 * @param {string} password - Senha em texto plano
 * @returns {Promise<string>} Hash da senha
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara senha em texto plano com hash.
 * @param {string} password - Senha em texto plano
 * @param {string} hash - Hash armazenado
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Gera JWT token para usuário.
 * @param {Object} user - Objeto do usuário
 * @returns {string} JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verifica e decodifica JWT token.
 * @param {string} token - JWT token
 * @returns {Object|null} Payload do token ou null se inválido
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.warn({ message: 'Invalid token', error: error.message });
    return null;
  }
}

/**
 * Registra um novo usuário.
 * @param {Object} userData - { email, password, name }
 * @returns {Promise<Object>} { user, token }
 */
export async function registerUser(userData) {
  const { email, password, name } = userData;
  
  // Validações
  if (!email || !password || !name) {
    throw new ValidationError('Email, senha e nome são obrigatórios');
  }
  if (password.length < 6) {
    throw new ValidationError('Senha deve ter no mínimo 6 caracteres');
  }
  
  // Verifica se email já existe
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new EmailAlreadyExistsError();
  }
  
  // Hash da senha
  const password_hash = await hashPassword(password);
  
  // Cria usuário
  const user = await createUser({
    email,
    name,
    password_hash,
    avatar_url: null
  });
  
  // Remove password_hash do objeto retornado
  delete user.password_hash;
  
  // Gera token
  const token = generateToken(user);
  
  logger.info({ message: 'User registered', userId: user.id });
  
  return { user, token };
}

/**
 * Autentica usuário (login).
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} { user, token }
 */
export async function authenticateUser(credentials) {
  const { email, password } = credentials;
  
  if (!email || !password) {
    throw new ValidationError('Email e senha são obrigatórios');
  }
  
  // Busca usuário
  const user = await findUserByEmail(email);
  if (!user) {
    throw new UserNotFoundError();
  }
  
  // Verifica senha
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new InvalidPasswordError();
  }
  
  // Remove password_hash do objeto retornado
  delete user.password_hash;
  
  // Gera token
  const token = generateToken(user);
  
  logger.info({ message: 'User authenticated', userId: user.id });
  
  return { user, token };
}

/**
 * Busca usuário autenticado pelo token.
 * @param {string} token - JWT token
 * @returns {Promise<Object|null>} Usuário ou null
 */
export async function getUserFromToken(token) {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }
  
  const user = await findUserById(payload.id);
  if (!user) {
    return null;
  }
  
  // Remove password_hash do objeto retornado
  delete user.password_hash;
  
  return user;
}

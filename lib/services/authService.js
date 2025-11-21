/** Lógica de autenticação: registro, login, JWT, bcrypt - lança erros customizados com codes */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByEmail, createUser, findUserById } from '../repositories/userRepository.js';
import logger from '../utils/logger.js';
import { ValidationError, EmailAlreadyExistsError, UserNotFoundError, InvalidPasswordError } from '../utils/errors.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/** Gera hash bcrypt da senha */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/** Compara senha plana com hash bcrypt */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/** Gera JWT (7 dias de validade) com id, email, name */
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

/** Verifica e decodifica JWT - retorna payload ou null se inválido */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.warn({ message: 'Invalid token', error: error.message });
    return null;
  }
}

/** Cria nova conta com validações - retorna { user, token } ou lança erro com code */
export async function registerUser(userData) {
  const { email, password, name } = userData;
  
  if (!email || !password || !name) {
    throw new ValidationError('Email, senha e nome são obrigatórios');
  }
  if (password.length < 6) {
    throw new ValidationError('Senha deve ter no mínimo 6 caracteres');
  }
  
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new EmailAlreadyExistsError();
  }
  
  const password_hash = await hashPassword(password);
  
  const user = await createUser({
    email,
    name,
    password_hash,
    avatar_url: null
  });
  
  delete user.password_hash;
  const token = generateToken(user);
  
  logger.info({ message: 'User registered', userId: user.id });
  
  return { user, token };
}

/** Autentica usuário - retorna { user, token } ou lança UserNotFoundError/InvalidPasswordError */
export async function authenticateUser(credentials) {
  const { email, password } = credentials;
  
  if (!email || !password) {
    throw new ValidationError('Email e senha são obrigatórios');
  }
  
  const user = await findUserByEmail(email);
  if (!user) {
    throw new UserNotFoundError();
  }
  
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new InvalidPasswordError();
  }
  
  delete user.password_hash;
  const token = generateToken(user);
  
  logger.info({ message: 'User authenticated', userId: user.id });
  
  return { user, token };
}

/** Extrai e valida usuário do JWT - retorna user ou null */
export async function getUserFromToken(token) {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }
  
  const user = await findUserById(payload.id);
  if (!user) {
    return null;
  }
  
  delete user.password_hash;
  
  return user;
}

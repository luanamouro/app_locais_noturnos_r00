/**
 * User Routes (API)
 * Endpoints para autenticação e gestão de perfil do usuário.
 */
import express from 'express';
import { registerUser, authenticateUser, getUserFromToken } from '../services/authService.js';
import { updateUser } from '../repositories/userRepository.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/users/register
 * Registra novo usuário
 * Body: { email, password, name }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const result = await registerUser({ email, password, name });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ endpoint: '/register', error: error.message });
    res.status(error.statusCode || 400).json({
      success: false,
      error: error.message,
      code: error.code || null
    });
  }
});

/**
 * POST /api/users/login
 * Autentica usuário
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await authenticateUser({ email, password });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ endpoint: '/login', error: error.message });
    res.status(error.statusCode || 401).json({
      success: false,
      error: error.message,
      code: error.code || null
    });
  }
});

/**
 * GET /api/users/profile
 * Retorna perfil do usuário autenticado
 * Header: Authorization: Bearer <token>
 */
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
    }
    
    const token = authHeader.substring(7); // Remove "Bearer "
    const user = await getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error({ endpoint: '/profile', error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar perfil'
    });
  }
});

/**
 * PUT /api/users/profile
 * Atualiza perfil do usuário autenticado
 * Header: Authorization: Bearer <token>
 * Body: { name?, avatar_url? }
 */
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
    }
    
    const token = authHeader.substring(7);
    const currentUser = await getUserFromToken(token);
    
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }
    
    const { name, avatar_url } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    
    const updatedUser = await updateUser(currentUser.id, updates);
    
    // Remove password_hash se existir
    delete updatedUser.password_hash;
    
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    logger.error({ endpoint: '/profile PUT', error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar perfil'
    });
  }
});

/**
 * GET /api/users/validate
 * Valida se o token é válido
 * Header: Authorization: Bearer <token>
 */
router.get('/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        valid: false
      });
    }
    
    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);
    
    res.status(200).json({
      success: true,
      valid: !!user
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      valid: false
    });
  }
});

export default router;

/**
 * Favorite Routes
 * Endpoints para gerenciar favoritos dos usuários
 */
import { Router } from 'express';
import * as favoriteRepository from '../repositories/favoriteRepository.js';
import * as venueRepository from '../repositories/venueRepository.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

/**
 * Middleware de autenticação
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
};

/**
 * POST /api/favorites
 * Adiciona um local aos favoritos
 * Body: { googlePlaceId: string, name?: string, address?: string, latitude?: number, longitude?: number }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { googlePlaceId, name, address, latitude, longitude, types, rating, userRatingsTotal } = req.body;

    if (!googlePlaceId) {
      return res.status(400).json({
        success: false,
        error: 'googlePlaceId é obrigatório'
      });
    }

    // Buscar ou criar venue
    let venue = await venueRepository.findVenueByGooglePlaceId(googlePlaceId);

    if (!venue) {
      // Inserir/atualizar venue com dados fornecidos (normaliza chaves e nulls)
      venue = await venueRepository.upsertVenue({
        google_place_id: googlePlaceId,
        name: name || 'Local sem nome',
        address: address ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        types: Array.isArray(types) ? types : [],
        rating: rating ?? null,
        user_ratings_total: userRatingsTotal ?? 0,
      });
    }

    // Adicionar aos favoritos
    const favorite = await favoriteRepository.addFavorite(req.userId, venue.id);
    console.log('[POST /favorites] raw favorite row:', favorite);

    // Normaliza resposta garantindo array em types
    const responseFavorite = favorite ? {
      favorite_id: favorite.favorite_id,
      favorited_at: favorite.created_at,
      place_id: favorite.google_place_id,
      name: favorite.venue_name,
      address: favorite.venue_address,
      latitude: favorite.latitude,
      longitude: favorite.longitude,
      types: Array.isArray(favorite.types) ? favorite.types : [],
      rating: favorite.rating,
      user_ratings_total: favorite.user_ratings_total
    } : null;

    console.log('[POST /favorites] normalized response:', responseFavorite);
    res.status(201).json({
      success: true,
      data: responseFavorite
    });
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao adicionar favorito'
    });
  }
});

/**
 * DELETE /api/favorites/:googlePlaceId
 * Remove um local dos favoritos
 */
router.delete('/:googlePlaceId', authenticate, async (req, res) => {
  try {
    const { googlePlaceId } = req.params;

    // Buscar venue
    const venue = await venueRepository.findVenueByGooglePlaceId(googlePlaceId);
    
    if (!venue) {
      return res.status(404).json({
        success: false,
        error: 'Local não encontrado'
      });
    }

    await favoriteRepository.removeFavorite(req.userId, venue.id);

    res.json({
      success: true,
      message: 'Favorito removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao remover favorito'
    });
  }
});

/**
 * GET /api/favorites
 * Lista todos os favoritos do usuário (ordenados do mais recente ao mais antigo)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const parsedLimit = parseInt(req.query.limit, 10);
    const parsedOffset = parseInt(req.query.offset, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const favorites = await favoriteRepository.findFavoritesByUser(req.userId, limit, offset);

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar favoritos'
    });
  }
});

/**
 * GET /api/favorites/check/:googlePlaceId
 * Verifica se um local está nos favoritos
 */
router.get('/check/:googlePlaceId', authenticate, async (req, res) => {
  try {
    const { googlePlaceId } = req.params;

    // Buscar venue
    const venue = await venueRepository.findVenueByGooglePlaceId(googlePlaceId);
    
    if (!venue) {
      return res.json({
        success: true,
        data: { isFavorite: false }
      });
    }

    const isFav = await favoriteRepository.isFavorite(req.userId, venue.id);

    res.json({
      success: true,
      data: { isFavorite: isFav }
    });
  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao verificar favorito'
    });
  }
});

export default router;

/**
 * @typedef {Object} User
 * @property {string} id - UUID do usuário
 * @property {string} name - Nome completo
 * @property {string} email - Email único
 * @property {string|null} photo_url - URL da foto de perfil
 * @property {Date} created_at - Data de criação
 * @property {Date} updated_at - Data da última atualização
 */

/**
 * @typedef {Object} Venue
 * @property {string} id - UUID do local
 * @property {string} google_place_id - Place ID do Google (único)
 * @property {string} name - Nome do estabelecimento
 * @property {string|null} address - Endereço completo
 * @property {number} latitude - Coordenada latitude
 * @property {number} longitude - Coordenada longitude
 * @property {string[]} types - Tipos do Google Places (JSON)
 * @property {number|null} rating - Avaliação média (0-5)
 * @property {number} user_ratings_total - Total de avaliações no Google
 * @property {Date} created_at - Data de sincronização inicial
 * @property {Date} updated_at - Data da última sincronização
 */

/**
 * @typedef {Object} Review
 * @property {string} id - UUID da avaliação
 * @property {string} user_id - UUID do usuário (FK)
 * @property {string} venue_id - UUID do local (FK)
 * @property {number} rating - Nota (1-5)
 * @property {string|null} comment - Comentário opcional
 * @property {Date} created_at - Data da avaliação
 * @property {Date} updated_at - Data da última edição
 */

/**
 * @typedef {Object} Favorite
 * @property {string} id - UUID do favorito
 * @property {string} user_id - UUID do usuário (FK)
 * @property {string} venue_id - UUID do local (FK)
 * @property {Date} created_at - Data em que foi favoritado
 */

/**
 * @typedef {Object} CheckIn
 * @property {string} id - UUID do check-in
 * @property {string} user_id - UUID do usuário (FK)
 * @property {string} venue_id - UUID do local (FK)
 * @property {Date} created_at - Data/hora do check-in
 */

export {};

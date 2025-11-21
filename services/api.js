/**
 * API Client
 * Cliente HTTP para comunicação com o backend.
 */

// URL base da API - detecta ambiente (localhost não funciona no dispositivo físico iOS/Android)
// Para testar em iPhone físico você deve usar o IP da sua máquina na mesma rede (ex: 192.168.0.5)
// Opcional: usar variável de ambiente EXPO_PUBLIC_API_BASE_URL configurada em .env
const resolveBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, ''); // remove barra final se houver
  }

  if (__DEV__) {
    // Tenta pegar IP dinamicamente a partir do manifest do Expo (em runtime web/native)
    try {
      // eslint-disable-next-line no-undef
      const expoManifest = global?.Expo?.manifest || global?.manifest || {};
      const debuggerHost = expoManifest.debuggerHost; // ex: '192.168.0.5:8081'
      if (debuggerHost) {
        const host = debuggerHost.split(':')[0];
        return `http://${host}:3000/api`; // assume backend rodando na porta 3000
      }
    } catch (_) {}
    // Fallback: ajustar manualmente para seu IP local se necessário
    return 'http://192.168.0.5:3000/api'; // ALTERE este IP para o da sua máquina
  }
  return 'https://your-production-api.com/api';
};

const API_BASE_URL = resolveBaseUrl();

/**
 * Faz uma requisição HTTP genérica.
 * @param {string} endpoint - Endpoint da API
 * @param {Object} options - Opções da requisição (method, body, headers, etc)
 * @returns {Promise<Object>} Resposta da API
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }
  
  try {
    const response = await fetch(url, config);
    const raw = await response.text();
    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch (parseErr) {
      console.warn('[API PARSE FALHOU]', { url, snippet: raw.substring(0,200) });
      // Fallback: se corpo parecer lista de tipos (ex: "establishment,bar") retornamos objeto embrulhado
      const trimmed = raw.trim();
      if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return { success: false, raw, message: 'Resposta não JSON' };
      }
      throw new Error(`Falha ao parsear JSON: ${parseErr.message}. Corpo bruto: ${raw.substring(0,200)}`);
    }

    if (!response.ok) {
      throw new Error(parsed.error || `Erro na requisição (${response.status})`);
    }
    return parsed;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * API de usuários.
 */
export const userAPI = {
  /**
   * Registra um novo usuário.
   * @param {Object} userData - { email, password, name }
   * @returns {Promise<Object>} { user, token }
   */
  async register(userData) {
    const response = await request('/users/register', {
      method: 'POST',
      body: userData,
    });
    return response.data;
  },

  /**
   * Faz login de um usuário.
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} { user, token }
   */
  async login(credentials) {
    const response = await request('/users/login', {
      method: 'POST',
      body: credentials,
    });
    return response.data;
  },

  /**
   * Busca perfil do usuário autenticado.
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Dados do usuário
   */
  async getProfile(token) {
    const response = await request('/users/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Atualiza perfil do usuário autenticado.
   * @param {string} token - JWT token
   * @param {Object} updates - { name?, avatar_url? }
   * @returns {Promise<Object>} Usuário atualizado
   */
  async updateProfile(token, updates) {
    const response = await request('/users/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: updates,
    });
    return response.data;
  },

  /**
   * Valida se o token é válido.
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} true se válido
   */
  async validateToken(token) {
    try {
      const response = await request('/users/validate', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.valid;
    } catch (error) {
      return false;
    }
  },
};

/**
 * API de favoritos.
 */
export const favoriteAPI = {
  /**
   * Adiciona um local aos favoritos.
   * @param {string} token - JWT token
   * @param {Object} venueData - { googlePlaceId, name?, address?, latitude?, longitude?, types?, rating?, userRatingsTotal? }
   * @returns {Promise<Object>} Favorito criado
   */
  async addFavorite(token, venueData) {
    const response = await request('/favorites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: venueData,
    });
    return response.data;
  },

  /**
   * Remove um local dos favoritos.
   * @param {string} token - JWT token
   * @param {string} googlePlaceId - Place ID do Google Maps
   * @returns {Promise<Object>} Confirmação
   */
  async removeFavorite(token, googlePlaceId) {
    const response = await request(`/favorites/${googlePlaceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  },

  /**
   * Lista todos os favoritos do usuário (ordenados do mais recente ao mais antigo).
   * @param {string} token - JWT token
   * @param {number} limit - Limite de resultados (padrão: 50)
   * @param {number} offset - Offset para paginação (padrão: 0)
   * @returns {Promise<Array>} Lista de favoritos
   */
  async getFavorites(token, limit = 50, offset = 0) {
    const response = await request(`/favorites?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Verifica se um local está nos favoritos.
   * @param {string} token - JWT token
   * @param {string} googlePlaceId - Place ID do Google Maps
   * @returns {Promise<boolean>} true se favorito
   */
  async checkFavorite(token, googlePlaceId) {
    const response = await request(`/favorites/check/${googlePlaceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.isFavorite;
  },
};

export default { userAPI, favoriteAPI };

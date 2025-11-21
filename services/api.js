/** Cliente HTTP para comunicação com backend - endpoints de usuários e favoritos */

/** Resolve URL base da API: variável de ambiente, IP dinâmico do Expo, ou fallback manual */
const resolveBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, '');
  }

  if (__DEV__) {
    try {
      const expoManifest = global?.Expo?.manifest || global?.manifest || {};
      const debuggerHost = expoManifest.debuggerHost;
      if (debuggerHost) {
        const host = debuggerHost.split(':')[0];
        return `http://${host}:3000/api`;
      }
    } catch (_) {}
    return 'http://192.168.0.5:3000/api';
  }
  return 'https://your-production-api.com/api';
};

const API_BASE_URL = resolveBaseUrl();

/** Requisição HTTP genérica com parse JSON, extração de error.code e tratamento de falhas */
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
      const trimmed = raw.trim();
      if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return { success: false, raw, message: 'Resposta não JSON' };
      }
      throw new Error(`Falha ao parsear JSON: ${parseErr.message}. Corpo bruto: ${raw.substring(0,200)}`);
    }

    if (!response.ok) {
      const errMsg = parsed.error?.message || parsed.error || parsed.message || `Erro na requisição (${response.status})`;
      const err = new Error(errMsg);
      if (parsed.error?.code) err.code = parsed.error.code;
      else if (parsed.code) err.code = parsed.code;
      else if (parsed.error?.name === 'UserNotFoundError') err.code = 'USER_NOT_FOUND';
      throw err;
    }
    return parsed;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/** Endpoints de autenticação e perfil */
export const userAPI = {
  /** Cria nova conta - retorna { user, token } */
  async register(userData) {
    const response = await request('/users/register', {
      method: 'POST',
      body: userData,
    });
    return response.data;
  },

  /** Autentica usuário - retorna { user, token } ou erro com code */
  async login(credentials) {
    const response = await request('/users/login', {
      method: 'POST',
      body: credentials,
    });
    return response.data;
  },

  /** Busca dados do perfil autenticado */
  async getProfile(token) {
    const response = await request('/users/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /** Atualiza dados do perfil (name, avatar_url) */
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

  /** Valida token JWT - retorna boolean */
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

/** Endpoints de favoritos (CRUD completo) */
export const favoriteAPI = {
  /** Adiciona local aos favoritos com metadados opcionais */
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

  /** Remove local dos favoritos por googlePlaceId */
  async removeFavorite(token, googlePlaceId) {
    const response = await request(`/favorites/${googlePlaceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  },

  /** Lista todos os favoritos (ordenados do mais recente ao mais antigo) com paginação */
  async getFavorites(token, limit = 50, offset = 0) {
    const response = await request(`/favorites?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /** Verifica se local está nos favoritos (retorna boolean) */
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

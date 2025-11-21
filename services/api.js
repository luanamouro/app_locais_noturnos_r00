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
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }
    
    return data;
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

export default { userAPI };

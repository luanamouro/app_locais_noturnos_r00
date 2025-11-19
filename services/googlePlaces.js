/**
 * Serviço para integração com Google Places API.
 * Observação: A Nearby Search retorna até 20 resultados por requisição.
 * Este serviço agrega tipos quando necessário e filtra duplicados.
 */
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
export const DEFAULT_RADIUS_METERS = 2000;
export const kmToMeters = (km) => Math.max(0, Math.round(km * 1000));

const MAX_PAGES = 3; // Google Places retorna no máximo 60 resultados (3 páginas de 20)

/** Promessa utilitária para aguardar entre as chamadas paginadas. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Monta a URL de Nearby Search levando em conta paginação e tipo. */
const buildNearbyUrl = ({ latitude, longitude, type, radius, pageToken }) => {
  const base = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  const params = new URLSearchParams();
  params.set('key', GOOGLE_MAPS_API_KEY);

  if (pageToken) {
    params.set('pagetoken', pageToken);
  } else {
    params.set('location', `${latitude},${longitude}`);
    params.set('radius', radius.toString());
    if (type) params.set('type', type);
  }

  return `${base}?${params.toString()}`;
};

/** Executa a paginação completa da Nearby Search respeitando limites do Google. */
async function fetchNearbyPages({ latitude, longitude, type, radius }) {
  let pageToken;
  const allResults = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = buildNearbyUrl({ latitude, longitude, type, radius, pageToken });
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && Array.isArray(data.results)) {
      allResults.push(...data.results);
    } else if (data.status === 'ZERO_RESULTS') {
      break;
    } else if (data.status === 'INVALID_REQUEST' && pageToken) {
      // Quando o next_page_token ainda não está pronto, aguardar e tentar de novo
      await sleep(1500);
      page--;
      continue;
    } else {
      console.error('Erro ao buscar lugares:', data.status);
      break;
    }

    if (!data.next_page_token) {
      break;
    }

    pageToken = data.next_page_token;
    await sleep(2000); // Google exige pequena espera antes da próxima página
  }

  return allResults;
}

/**
 * Busca lugares próximos com base na localização atual
 * @param {number} latitude - Latitude da localização atual
 * @param {number} longitude - Longitude da localização atual
 * @param {string} type - Tipo de lugar (bar, restaurant, night_club, etc)
 * @param {number} radius - Raio de busca em metros (padrão: 5000m = 5km)
 * @returns {Promise<Array>} Lista de lugares encontrados
 */
/**
 * Nearby Search por tipo
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} [type="restaurant"] - Tipo do Places (bar, restaurant, etc)
 * @param {number} [radius=DEFAULT_RADIUS_METERS] - Raio em metros
 * @returns {Promise<Array>} Resultados da busca
 */
export const buscarLugaresProximos = async (
  latitude,
  longitude,
  type = 'restaurant',
  radius = DEFAULT_RADIUS_METERS
) => {
  try {
    return await fetchNearbyPages({ latitude, longitude, type, radius });
  } catch (error) {
    console.error('Erro na requisição:', error);
    return [];
  }
};

/**
 * Busca múltiplos tipos de estabelecimentos de uma vez
 * @param {number} latitude - Latitude da localização atual
 * @param {number} longitude - Longitude da localização atual
 * @param {Array<string>} types - Array com tipos de lugares
 * @param {number} radius - Raio de busca em metros
 * @returns {Promise<Array>} Lista combinada de todos os lugares encontrados
 */
/**
 * Busca agregada de estabelecimentos noturnos (múltiplos tipos)
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} [radius=DEFAULT_RADIUS_METERS]
 * @returns {Promise<Array>} Resultados únicos combinados
 */
export const buscarEstabelecimentosNoturnos = async (
  latitude,
  longitude,
  radius = DEFAULT_RADIUS_METERS,
  onProgress
) => {
  const tipos = ['bar', 'restaurant', 'night_club', 'cafe', 'meal_takeaway', 'liquor_store'];
  
  try {
    const todosLugares = [];
    const total = tipos.length;
    for (let index = 0; index < total; index++) {
      const tipo = tipos[index];
      const resultadosTipo = await fetchNearbyPages({ latitude, longitude, type: tipo, radius });
      todosLugares.push(...resultadosTipo);
      if (typeof onProgress === 'function') {
        onProgress((index + 1) / total);
      }
    }
    
    const lugaresUnicos = todosLugares.filter((lugar, index, self) =>
      index === self.findIndex((l) => l.place_id === lugar.place_id)
    );
    
    return lugaresUnicos;
  } catch (error) {
    console.error('Erro ao buscar estabelecimentos:', error);
    return [];
  }
};

/**
 * Busca detalhes de um lugar específico
 * @param {string} placeId - ID do lugar no Google Places
 * @returns {Promise<Object>} Detalhes do lugar
 */
/**
 * Detalhes de um lugar específico
 * @param {string} placeId
 * @returns {Promise<Object|null>} Detalhes do lugar
 */
export const buscarDetalhesLugar = async (placeId) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.result;
    } else {
      console.error('Erro ao buscar detalhes:', data.status);
      return null;
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    return null;
  }
};

/**
 * Busca lugares com base em uma query de texto
 * @param {string} query - Texto da busca
 * @param {number} latitude - Latitude da localização atual
 * @param {number} longitude - Longitude da localização atual
 * @param {number} radius - Raio de busca em metros
 * @returns {Promise<Array>} Lista de lugares encontrados
 */
/**
 * Text Search (busca por texto livre)
 * @param {string} query
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} [radius=DEFAULT_RADIUS_METERS]
 * @returns {Promise<Array>} Resultados encontrados
 */
/** Monta a URL de Text Search com suporte a paginação. */
const buildTextSearchUrl = ({ query, latitude, longitude, radius, pageToken }) => {
  const base = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  const params = new URLSearchParams();
  params.set('key', GOOGLE_MAPS_API_KEY);

  if (pageToken) {
    params.set('pagetoken', pageToken);
  } else {
    params.set('query', query);
    params.set('location', `${latitude},${longitude}`);
    params.set('radius', radius.toString());
  }

  return `${base}?${params.toString()}`;
};

/** Faz paginação de Text Search com esperas automáticas para next_page_token. */
async function fetchTextSearchPages({ query, latitude, longitude, radius }) {
  let pageToken;
  const allResults = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = buildTextSearchUrl({ query, latitude, longitude, radius, pageToken });
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && Array.isArray(data.results)) {
      allResults.push(...data.results);
    } else if (data.status === 'ZERO_RESULTS') {
      break;
    } else if (data.status === 'INVALID_REQUEST' && pageToken) {
      await sleep(1500);
      page--;
      continue;
    } else {
      console.error('Erro ao buscar por texto:', data.status);
      break;
    }

    if (!data.next_page_token) {
      break;
    }

    pageToken = data.next_page_token;
    await sleep(2000);
  }

  return allResults;
}

export const buscarPorTexto = async (
  query,
  latitude,
  longitude,
  radius = DEFAULT_RADIUS_METERS
) => {
  try {
    return await fetchTextSearchPages({ query, latitude, longitude, radius });
  } catch (error) {
    console.error('Erro na requisição:', error);
    return [];
  }
};

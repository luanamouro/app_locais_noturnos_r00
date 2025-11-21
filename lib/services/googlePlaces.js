/** Google Places API: Nearby Search, Text Search, Details - com paginação e dedu plicação */
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
export const DEFAULT_RADIUS_METERS = 2000;
export const kmToMeters = (km) => Math.max(0, Math.round(km * 1000));

const MAX_PAGES = 3;

/** Delay entre paginações (Google exige espera para next_page_token) */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Monta URL de Nearby Search com suporte a pageToken */
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

/** Paginação completa de Nearby Search (até 3 páginas/60 resultados) */
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
    await sleep(2000);
  }

  return allResults;
}

/** Busca lugares próximos por tipo (com paginação automática) */
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

/** Busca agregada de múltiplos tipos (bar, restaurant, night_club, etc) com deduplicaçao */
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

/** Busca detalhes completos de um lugar por place_id (fotos, horários, avaliações) */
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

/** Text Search por query livre (ex: "pizza", "bar aberto") com paginação */
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

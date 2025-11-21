/**
 * Venue Repository
 * Gerencia locais sincronizados com Google Places.
 */
import { query, queryOne } from '../database/client.js';

/**
 * Busca local por ID interno.
 * @param {string} id - UUID do venue
 * @returns {Promise<Object|null>}
 */
export async function findVenueById(id) {
  const venue = await queryOne('SELECT * FROM venues WHERE id = ?', [id]);
  if (venue && venue.types) {
    venue.types = safeParseTypes(venue.types);
  }
  return venue;
}

/**
 * Busca local por Google Place ID.
 * @param {string} googlePlaceId
 * @returns {Promise<Object|null>}
 */
export async function findVenueByGooglePlaceId(googlePlaceId) {
  const venue = await queryOne(
    'SELECT * FROM venues WHERE google_place_id = ?',
    [googlePlaceId]
  );
  if (venue && venue.types) {
    venue.types = safeParseTypes(venue.types);
  }
  return venue;
}

/**
 * Insere ou atualiza um local (sincroniza com Google Places).
 * @param {Object} venueData - { google_place_id, name, address?, latitude, longitude, types?, rating?, user_ratings_total? }
 * @returns {Promise<Object>} Venue inserido/atualizado
 */
export async function upsertVenue(venueData) {
  const {
    google_place_id,
    name,
    address,
    latitude,
    longitude,
    types,
    rating,
    user_ratings_total
  } = venueData;

  const typesJson = JSON.stringify(types || []);
  const lat = latitude == null ? null : Number(latitude);
  const lng = longitude == null ? null : Number(longitude);

  await query(
    `INSERT INTO venues (
      id, google_place_id, name, address, latitude, longitude, types, rating, user_ratings_total
    ) VALUES (
      UUID(), ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      address = VALUES(address),
      latitude = VALUES(latitude),
      longitude = VALUES(longitude),
      types = VALUES(types),
      rating = VALUES(rating),
      user_ratings_total = VALUES(user_ratings_total)`,
    [
      google_place_id,
      name,
      address ?? null,
      lat,
      lng,
      typesJson,
      rating ?? null,
      user_ratings_total ?? 0
    ]
  );

  return await findVenueByGooglePlaceId(google_place_id);
}

/**
 * Faz parsing resiliente de campo types.
 * Aceita JSON válido ou lista simples separada por vírgulas.
 */
function safeParseTypes(raw) {
  try {
    if (typeof raw !== 'string') return Array.isArray(raw) ? raw : [];
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }
    return trimmed.split(',').map(t => t.trim()).filter(Boolean);
  } catch (_) {
    return [];
  }
}

/**
 * Busca locais próximos usando fórmula de Haversine.
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusKm - Raio em quilômetros
 * @param {number} limit - Máximo de resultados
 * @returns {Promise<Array>}
 */
export async function findVenuesNearby(latitude, longitude, radiusKm, limit = 100) {
  // Fórmula de Haversine adaptada para MySQL
  const sql = `
    SELECT *,
      (6371 * acos(
        cos(radians(?)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(latitude))
      )) AS distance_km
    FROM venues
    HAVING distance_km <= ?
    ORDER BY distance_km
    LIMIT ?
  `;
  
  const venues = await query(sql, [latitude, longitude, latitude, radiusKm, limit]);
  
  return venues.map(v => {
    if (v.types) v.types = safeParseTypes(v.types);
    return v;
  });
}

/**
 * Busca locais por tipo (do Google Places).
 * @param {string} type - Ex: 'bar', 'restaurant', 'night_club'
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function findVenuesByType(type, limit = 50) {
  const venues = await query(
    `SELECT * FROM venues WHERE JSON_CONTAINS(types, ?) LIMIT ?`,
    [JSON.stringify(type), limit]
  );
  
  return venues.map(v => {
    if (v.types) v.types = safeParseTypes(v.types);
    return v;
  });
}

/**
 * Lista todos os locais com paginação.
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
export async function listVenues(limit = 50, offset = 0) {
  const venues = await query(
    'SELECT * FROM venues ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  
  return venues.map(v => {
    if (v.types) v.types = safeParseTypes(v.types);
    return v;
  });
}

/**
 * Deleta um local (cascateia para reviews, favorites, check-ins).
 * @param {string} id
 */
export async function deleteVenue(id) {
  await query('DELETE FROM venues WHERE id = ?', [id]);
}

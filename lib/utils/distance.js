/** Raio da Terra: 6371 km (6.371.000 metros) */
export const EARTH_RADIUS_METERS = 6371000;

/** Calcula distância entre duas coordenadas usando fórmula de Haversine (retorna metros) */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/** Filtra lugares mantendo apenas os dentro do raio especificado */
export function filterPlacesWithinRadius(places = [], origin, radiusMeters) {
  if (!origin || typeof origin.latitude !== 'number' || typeof origin.longitude !== 'number') {
    return places;
  }

  return places.filter((place) => {
    const lat = place?.geometry?.location?.lat;
    const lng = place?.geometry?.location?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }

    const distance = haversineDistanceMeters(
      origin.latitude,
      origin.longitude,
      lat,
      lng
    );

    return distance <= radiusMeters;
  });
}

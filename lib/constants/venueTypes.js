/** Mapeamento de tipos de estabelecimentos: rótulos em PT-BR → Google Places types + ícones/cores */
export const VENUE_TYPES = {
  Bares: {
    id: "Bares",
    label: "Bares",
    googleType: "bar",
    icon: "beer",
    color: "#FF6B6B",
  },
  Restaurantes: {
    id: "Restaurantes",
    label: "Restaurantes",
    googleType: "restaurant",
    icon: "restaurant",
    color: "#FFB347",
  },
  Baladas: {
    id: "Baladas",
    label: "Baladas",
    googleType: "night_club",
    icon: "musical-notes",
    color: "#9C27B0",
  },
  "Cafés": {
    id: "Cafés",
    label: "Cafés",
    googleType: "cafe",
    icon: "cafe",
    color: "#FF7043",
  },
  Lanchonetes: {
    id: "Lanchonetes",
    label: "Lanchonetes",
    googleType: "meal_takeaway",
    icon: "fast-food",
    color: "#4CAF50",
  },
  Adegas: {
    id: "Adegas",
    label: "Adegas",
    googleType: "liquor_store",
    icon: "wine",
    color: "#795548",
  },
  "Food Trucks": {
    id: "Food Trucks",
    label: "Food Trucks",
    googleType: "meal_takeaway",
    icon: "bus",
    color: "#03A9F4",
  },
};

/** Array de tipos para iteração em listas de filtros */
export const VENUE_TYPE_LIST = Object.values(VENUE_TYPES);

/** Lookup reverso: googleType (bar, restaurant) → config */
export const googleTypeToVenue = Object.values(VENUE_TYPES).reduce((acc, config) => {
  acc[config.googleType] = config;
  return acc;
}, {});

/** Retorna config do primeiro tipo compatível ou fallback para Bares */
export function getVenueConfigByTypes(types = []) {
  if (!Array.isArray(types)) {
    return VENUE_TYPES.Bares;
  }

  for (const placeType of types) {
    const match = googleTypeToVenue[placeType];
    if (match) {
      return match;
    }
  }

  return VENUE_TYPES.Bares;
}

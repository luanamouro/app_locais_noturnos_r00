# 🌐 Services - Integrações Externas

Esta pasta contém os wrappers e clientes para integração com APIs externas e o backend.

## Arquivos

### `api.js` - Cliente HTTP do Backend
Cliente HTTP para comunicação com o backend Express.

#### Configuração
- Detecta automaticamente o IP da máquina via Expo manifest
- Suporta variável de ambiente `EXPO_PUBLIC_API_BASE_URL`
- Fallback para IP padrão em desenvolvimento

#### userAPI
```javascript
import { userAPI } from '../services/api';

// Registrar usuário
const { user, token } = await userAPI.register({
  email: 'user@example.com',
  password: 'senha123',
  name: 'João Silva'
});

// Login
const { user, token } = await userAPI.login({
  email: 'user@example.com',
  password: 'senha123'
});

// Buscar perfil
const user = await userAPI.getProfile(token);

// Atualizar perfil
const updatedUser = await userAPI.updateProfile(token, {
  name: 'João Pedro Silva',
  avatar_url: 'https://...'
});

// Validar token
const isValid = await userAPI.validateToken(token);
```

#### favoriteAPI
```javascript
import { favoriteAPI } from '../services/api';

// Adicionar favorito
await favoriteAPI.addFavorite(token, {
  googlePlaceId: 'ChIJ...',
  name: 'Bar Exemplo',
  address: 'Rua Exemplo, 123',
  latitude: -23.5505,
  longitude: -46.6333,
  types: ['bar', 'restaurant'],
  rating: 4.5
});

// Remover favorito
await favoriteAPI.removeFavorite(token, 'ChIJ...');

// Listar favoritos
const favorites = await favoriteAPI.getFavorites(token, limit, offset);

// Verificar se é favorito
const isFavorite = await favoriteAPI.checkFavorite(token, 'ChIJ...');
```

#### Tratamento de Erros
- Propaga `error.code` do backend para o frontend
- Loga respostas não-JSON automaticamente
- Fallback para erro genérico quando parsing falha

---

### `googlePlaces.js` - Google Places API Wrapper
Integração completa com Google Places API.

#### Configuração
Requer `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` no `.env`.

#### Funções Principais

##### `buscarEstabelecimentosNoturnos(lat, lng, radiusMeters, onProgress)`
Busca todos os tipos de estabelecimentos noturnos:
```javascript
const results = await buscarEstabelecimentosNoturnos(
  -23.5505,
  -46.6333,
  2000, // 2km
  (progress) => console.log(`${progress * 100}% concluído`)
);
```

Busca por tipos:
- `bar`
- `night_club`
- `restaurant`
- `cafe`

##### `buscarLugaresProximos(lat, lng, type, radiusMeters)`
Busca por tipo específico:
```javascript
const bares = await buscarLugaresProximos(
  -23.5505,
  -46.6333,
  'bar',
  1500
);
```

##### `buscarPorTexto(query, lat, lng, radiusMeters)`
Busca textual (independente de filtros):
```javascript
const results = await buscarPorTexto(
  'pizzaria',
  -23.5505,
  -46.6333,
  5000
);
```

##### `buscarDetalhesLugar(placeId)`
Detalhes completos de um estabelecimento:
```javascript
const details = await buscarDetalhesLugar('ChIJ...');

// Retorna:
// - name, formatted_address, formatted_phone_number
// - geometry (location: lat/lng)
// - rating, user_ratings_total
// - opening_hours (weekday_text, open_now)
// - types, photos, reviews
// - website, url (Google Maps)
```

#### Otimizações
- **Paginação automática**: Suporta `next_page_token` com delays
- **Rate limiting**: Delay de 2s entre páginas
- **Retry logic**: Tenta novamente se `INVALID_REQUEST` com pageToken
- **Limite de páginas**: Máximo 3 páginas por busca (60 resultados)
- **Cache de tipos**: Combina múltiplos tipos e remove duplicatas

#### Estrutura de Resposta (Nearby Search)
```javascript
{
  place_id: "ChIJ...",
  name: "Bar Exemplo",
  vicinity: "Rua Exemplo, 123",
  geometry: {
    location: { lat: -23.5505, lng: -46.6333 }
  },
  types: ["bar", "food", "point_of_interest"],
  rating: 4.5,
  user_ratings_total: 234,
  opening_hours: {
    open_now: true
  }
}
```

#### Estrutura de Resposta (Details)
```javascript
{
  name: "Bar Exemplo",
  formatted_address: "Rua Exemplo, 123 - São Paulo, SP",
  formatted_phone_number: "(11) 1234-5678",
  geometry: { location: { lat, lng } },
  rating: 4.5,
  user_ratings_total: 234,
  opening_hours: {
    open_now: true,
    weekday_text: [
      "Segunda-feira: 18:00 – 02:00",
      ...
    ]
  },
  photos: [
    { photo_reference: "...", height: 1200, width: 1600 }
  ],
  reviews: [
    {
      author_name: "João Silva",
      rating: 5,
      text: "Ótimo lugar!",
      time: 1234567890
    }
  ],
  website: "https://...",
  url: "https://maps.google.com/..."
}
```

---

## Boas Práticas

### Tratamento de Erros
```javascript
try {
  const data = await buscarDetalhesLugar(placeId);
  setDetalhes(data);
} catch (error) {
  console.error('Erro ao buscar detalhes:', error);
  Alert.alert('Erro', 'Não foi possível carregar os detalhes');
}
```

### Performance
- Use `buscarPorTexto` com raio generoso (50km) para buscas textuais
- Limite buscas automáticas com debounce (300-500ms)
- Aplique gating de zoom (mín. 12) antes de buscar
- Filtre localmente por raio sempre que possível

### Quotas do Google
- **Nearby Search**: $32/1000 requests
- **Text Search**: $32/1000 requests
- **Place Details**: $17/1000 requests
- **Cota gratuita**: $200/mês (~6.250 buscas nearby)

**Dica**: Implemente cache para reduzir custos.

---

## Constantes e Helpers

### Conversões
```javascript
import { kmToMeters } from '../services/googlePlaces';

const radiusMeters = kmToMeters(2.5); // 2500
```

### Delays
```javascript
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
await sleep(2000); // Aguarda 2 segundos
```

---

## Troubleshooting

### Erro: `ZERO_RESULTS`
- Região sem estabelecimentos do tipo buscado
- Raio muito pequeno
- Tipos incorretos

**Solução**: Aumente o raio ou teste com coordenadas conhecidas.

### Erro: `INVALID_REQUEST`
- Parâmetros inválidos
- pageToken expirado (comum)

**Solução**: Script já trata com retry automático.

### Erro: `OVER_QUERY_LIMIT`
- Quota excedida

**Solução**:
1. Verifique faturamento no Google Cloud Console
2. Implemente cache
3. Limite frequência de buscas

### Erro: `REQUEST_DENIED`
- Chave API inválida
- APIs não habilitadas
- Restrições de API bloqueando request

**Solução**:
1. Verifique `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Habilite Places API no console
3. Ajuste restrições (IPs, HTTP referrers)

---

## Próximos Passos

- [ ] Implementar cache de resultados
- [ ] Adicionar filtro por preço (price_level)
- [ ] Suporte a fotos (photo_reference → URL)
- [ ] Autocomplete para busca textual
- [ ] Geocoding reverso (coordenadas → endereço)

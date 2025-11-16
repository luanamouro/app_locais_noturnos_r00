# Database Layer (MySQL)

Esta pasta contém a camada de banco de dados MySQL do projeto, incluindo conexão, queries, repositórios e migrations. É projetada para ser utilizada pelo backend da aplicação.

---

## 📁 Estrutura

```
lib/
├── database/
│   ├── pool.js          # Pool de conexões MySQL (mysql2/promise)
│   ├── client.js        # Wrapper de queries com logging e transactions
│   └── migrations.sql   # Schema completo (CREATE TABLE + indexes)
├── repositories/
│   ├── userRepository.js      # CRUD de usuários
│   ├── venueRepository.js     # Gerenciamento de locais
│   ├── reviewRepository.js    # Avaliações de usuários
│   ├── favoriteRepository.js  # Favoritos dos usuários
│   └── checkInRepository.js   # Check-ins em locais
├── models/
│   └── types.js         # Definições JSDoc para TypeScript
└── utils/
    ├── logger.js        # Sistema de logging
    └── errors.js        # Erros customizados (NotFoundError, ValidationError, etc)
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as credenciais do banco:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=locais_noturnos
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

### 2. Criar o Banco de Dados

Execute o script de migrations para criar as tabelas:

```bash
mysql -u root -p < lib/database/migrations.sql
```

Ou via conexão MySQL:

```sql
SOURCE lib/database/migrations.sql;
```

---

## 🗄️ Schema

O banco possui 5 tabelas principais:

- **users**: Usuários da aplicação (id, name, email, photo_url)
- **venues**: Locais sincronizados com Google Places (google_place_id, name, lat/lng, types, rating)
- **reviews**: Avaliações de usuários sobre locais (rating 1-5, comment)
- **favorites**: Relação de favoritos usuário-local
- **check_ins**: Registro de visitas dos usuários aos locais

Todas as chaves primárias usam UUIDs (`CHAR(36)`) gerados por `UUID()` do MySQL 8+.

---

## 📖 Uso dos Repositórios

### User Repository

```javascript
import * as userRepo from './lib/repositories/userRepository.js';

// Buscar usuário por ID
const user = await userRepo.findUserById('uuid-aqui');

// Buscar por email
const user = await userRepo.findUserByEmail('email@exemplo.com');

// Criar usuário
const newUser = await userRepo.createUser({
  name: 'João Silva',
  email: 'joao@exemplo.com',
  photo_url: 'https://...'
});

// Atualizar usuário
const updated = await userRepo.updateUser('uuid-aqui', {
  name: 'João Santos'
});

// Listar usuários com paginação
const users = await userRepo.listUsers(20, 0);

// Deletar usuário
await userRepo.deleteUser('uuid-aqui');
```

### Venue Repository

```javascript
import * as venueRepo from './lib/repositories/venueRepository.js';

// Buscar por Place ID do Google
const venue = await venueRepo.findVenueByGooglePlaceId('ChIJ...');

// Inserir ou atualizar local (sincronizar com Google Places)
const venue = await venueRepo.upsertVenue({
  google_place_id: 'ChIJ...',
  name: 'Bar do Zé',
  address: 'Rua X, 123',
  latitude: -23.5505,
  longitude: -46.6333,
  types: ['bar', 'night_club'],
  rating: 4.5,
  user_ratings_total: 120
});

// Buscar locais próximos (Haversine)
const nearbyVenues = await venueRepo.findVenuesNearby(
  -23.5505, // latitude
  -46.6333, // longitude
  5,        // raio em km
  50        // limite de resultados
);

// Buscar por tipo
const bars = await venueRepo.findVenuesByType('bar', 30);
```

### Review Repository

```javascript
import * as reviewRepo from './lib/repositories/reviewRepository.js';

// Criar avaliação
const review = await reviewRepo.createReview({
  user_id: 'uuid-usuario',
  venue_id: 'uuid-local',
  rating: 5,
  comment: 'Excelente ambiente!'
});

// Buscar avaliações de um local
const reviews = await reviewRepo.findReviewsByVenue('uuid-local', 20, 0);

// Buscar avaliações de um usuário
const userReviews = await reviewRepo.findReviewsByUser('uuid-usuario');

// Atualizar avaliação
const updated = await reviewRepo.updateReview('uuid-review', {
  rating: 4,
  comment: 'Mudei de ideia, 4 estrelas'
});

// Obter estatísticas de avaliação de um local
const stats = await reviewRepo.getVenueRatingStats('uuid-local');
// { average: 4.2, total: 15 }

// Deletar avaliação
await reviewRepo.deleteReview('uuid-review');
```

### Favorite Repository

```javascript
import * as favRepo from './lib/repositories/favoriteRepository.js';

// Adicionar aos favoritos
await favRepo.addFavorite('uuid-usuario', 'uuid-local');

// Remover dos favoritos
await favRepo.removeFavorite('uuid-usuario', 'uuid-local');

// Verificar se é favorito
const isFav = await favRepo.isFavorite('uuid-usuario', 'uuid-local');

// Listar favoritos do usuário
const favorites = await favRepo.findFavoritesByUser('uuid-usuario');

// Contar favoritos de um local
const count = await favRepo.countVenueFavorites('uuid-local');

// Locais mais favoritados
const topVenues = await favRepo.findMostFavoritedVenues(10);
```

### Check-in Repository

```javascript
import * as checkInRepo from './lib/repositories/checkInRepository.js';

// Registrar check-in
const checkIn = await checkInRepo.createCheckIn('uuid-usuario', 'uuid-local');

// Buscar check-ins do usuário
const userCheckIns = await checkInRepo.findCheckInsByUser('uuid-usuario');

// Buscar check-ins de um local
const venueCheckIns = await checkInRepo.findCheckInsByVenue('uuid-local');

// Contar check-ins
const totalCheckIns = await checkInRepo.countVenueCheckIns('uuid-local');

// Último check-in do usuário
const latest = await checkInRepo.findLatestCheckIn('uuid-usuario');

// Locais mais visitados
const popular = await checkInRepo.findMostVisitedVenues(10);

// Deletar check-in
await checkInRepo.deleteCheckIn('uuid-checkin');
```

---

## 🔄 Transactions

Use o método `transaction` do client para operações atômicas:

```javascript
import { transaction } from './lib/database/client.js';
import * as userRepo from './lib/repositories/userRepository.js';
import * as venueRepo from './lib/repositories/venueRepository.js';

await transaction(async (conn) => {
  // Todas as queries aqui usarão a mesma conexão transacional
  const user = await userRepo.createUser({
    name: 'Maria',
    email: 'maria@exemplo.com'
  });

  const venue = await venueRepo.upsertVenue({
    google_place_id: 'ChIJ...',
    name: 'Novo Bar',
    latitude: -23.5505,
    longitude: -46.6333
  });

  // Se qualquer query falhar, rollback automático
});
```

---

## 🛡️ Tratamento de Erros

O sistema usa erros customizados da pasta `utils/errors.js`:

```javascript
import { NotFoundError, ValidationError } from './lib/utils/errors.js';

try {
  const user = await userRepo.findUserById('uuid-inexistente');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Usuário não encontrado:', error.message);
  }
}
```

Erros disponíveis:
- `NotFoundError` (404)
- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `DatabaseError` (500)

---

## 📊 Logging

Todas as queries são automaticamente logadas com:
- Query SQL executada
- Parâmetros
- Duração (ms)
- Número de linhas afetadas/retornadas

Configure o nível de log via `LOG_LEVEL` no `.env`:
- `ERROR` - apenas erros
- `WARN` - warnings e erros
- `INFO` - queries + warnings + erros (padrão)
- `DEBUG` - tudo

---

## 🚀 Integração com Backend

Este módulo deve ser importado pelo backend (API REST, GraphQL, etc). Exemplo com Express:

```javascript
import express from 'express';
import * as userRepo from './lib/repositories/userRepository.js';

const app = express();

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userRepo.findUserById(req.params.id);
    res.json(user);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 🔍 Requisitos

- **MySQL 8.0+** (usa `UUID()` nativo e type `JSON`)
- **Node.js 18+**
- **mysql2** v3.11+ (já instalado via `npm install mysql2`)

---

## 📝 Notas Técnicas

- **Placeholders**: MySQL usa `?` ao invés de `$1, $2` (PostgreSQL)
- **JSON Type**: Usa `JSON` ao invés de `JSONB` (PostgreSQL)
- **UUIDs**: Gerados via `UUID()` do MySQL 8+, armazenados como `CHAR(36)`
- **Spatial Indexes**: Criados em `latitude` e `longitude` para buscas geoespaciais eficientes
- **Cascading Deletes**: Deletar um usuário ou local cascateia para todas as tabelas relacionadas
- **ON DUPLICATE KEY UPDATE**: Usado em `upsertVenue` para sincronização idempotente com Google Places

---

## ❓ Suporte

Para dúvidas sobre este módulo, consulte:
- Código dos repositórios em `lib/repositories/`
- Schema completo em `lib/database/migrations.sql`
- Definições de tipos em `lib/models/types.js`

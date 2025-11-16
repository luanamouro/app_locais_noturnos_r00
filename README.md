# Bora Sair – Locais Noturnos

Aplicativo Expo (Android, iOS e Web) para descobrir bares, restaurantes e baladas próximos, com filtros por categoria e controle de raio de busca.

## Requisitos

- Node.js 20.19+ recomendado (npm 10+). Versões mais antigas podem emitir avisos.
- Chave da API do Google Maps (Places + Maps SDKs). Veja `GOOGLE_MAPS_SETUP.md`.

## Instalação

```powershell
npm install
```

Crie um arquivo `.env` na raiz com suas chaves e credenciais do banco:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=SUACHAVEAQUI

# MySQL Database (para backend)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=locais_noturnos
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

## Executando

```powershell
# Dev server (escolha a plataforma no menu)
npx expo start

# Web direto
npm run web

# Android (com emulador/dispositivo)
npm run android

# iOS (apenas no macOS com Xcode)
npm run ios
```

## Arquitetura

- Web: `@react-google-maps/api` para renderização do mapa.
- Android/iOS: `react-native-maps` (PROVIDER_GOOGLE).
- Buscas: Google Places API via `services/googlePlaces.js`.
- Filtros: mapeados em `constants/venueTypes.js`.
- Utilidades de distância/raio: `utils/distance.js`.

## Funcionalidades

- Localização do usuário e centralização do mapa.
- Busca automática por locais próximos (com tipos combinados) e por texto.
- Filtros por categoria com contagem e badge no botão.
- Controle de raio (1–10 km) com modal e aplicação explícita.
- Lista de resultados com navegação para detalhes do local.

## Estrutura

```
app_locais_noturnos/
├─ app/                    # Rotas (Expo Router) e telas
│  ├─ map.js               # Mapa Web
│  ├─ map.native.js        # Mapa nativo (Android/iOS)
│  ├─ filtros.js           # Tela de filtros
│  └─ ...
├─ lib/                    # Camada de banco de dados MySQL
│  ├─ database/            # Pool de conexões e migrations
│  ├─ repositories/        # CRUD para usuários, locais, reviews, favoritos, check-ins
│  ├─ models/              # Definições de tipos JSDoc
│  └─ utils/               # Logger e erros customizados
├─ constants/              # Metadados de tipos de locais
│  └─ venueTypes.js
├─ services/
│  └─ googlePlaces.js      # Integração com Google Places
├─ utils/
│  └─ distance.js          # Haversine e filtro por raio
├─ assets/
├─ app.config.js           # Configuração dinâmica do Expo
├─ GOOGLE_MAPS_SETUP.md
└─ README.md
```

## Notas

- A Nearby Search do Places retorna até 20 resultados por requisição. Como buscamos múltiplos tipos, o app combina resultados e remove duplicados.
- Para reduzir avisos de engine, prefira Node 20.19+
- **Banco de Dados MySQL**: A pasta `lib/` contém toda a infraestrutura de banco (pools, repositórios, migrations). Consulte `lib/README.md` para instruções completas de setup e uso.

## Licença

Uso acadêmico/demonstrativo.

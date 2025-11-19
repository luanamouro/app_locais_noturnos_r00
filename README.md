# Bora Sair – Locais Noturnos

Aplicativo Expo (Android, iOS e Web) para descobrir bares, restaurantes e baladas próximos, com filtros por categoria, controle de raio e otimizações de desempenho em dispositivos móveis.

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

# Dev server com tunneling (útil em redes restritas)
npx expo start --tunnel

# Web direto
npm run web

# Android (com emulador/dispositivo)
npm run android

# iOS (apenas no macOS com Xcode)
npm run ios
```

## Arquitetura

- Web: `@react-google-maps/api` para renderização do mapa.
- Android/iOS: `react-native-maps` (PROVIDER_GOOGLE) com gating de zoom/raio e debounces.
- Buscas: Google Places API via `services/googlePlaces.js`.
- Filtros: mapeados em `constants/venueTypes.js`.
- Utilidades de distância/raio: `utils/distance.js`.
- Banco: camada MySQL em `lib/` pronta para uso por um backend Node.

## Funcionalidades

- Localização do usuário e centralização do mapa.
- Busca automática por locais próximos (com tipos combinados) e por texto.
- Filtros por categoria com contagem e badge no botão.
- Controle de raio (0.5–5 km) com modal e aplicação explícita.
- Gating de busca: apenas dispara requisições quando zoom ≥ 12 e raio ≤ 5 km, evitando cargas pesadas.
- Overlay de progresso exibindo o percentual concluído e a mensagem “buscando locais incríveis para você...”.
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

- A Nearby Search do Places retorna até 20 resultados por requisição. Como buscamos múltiplos tipos e mostramos o progresso, o app combina resultados, remove duplicados e informa o usuário durante o carregamento.
- Filtros de zoom/raio são aplicados antes de chamar a API para manter o app responsivo em dispositivos Android/iOS.
- Para reduzir avisos de engine, prefira Node 20.19+.
- **Banco de Dados MySQL**: A pasta `lib/` contém toda a infraestrutura de banco (pools, repositórios, migrations). Consulte `lib/README.md` para instruções completas de setup e uso.

## Integração com o backend (pendências)

Há uma camada completa de acesso MySQL em `lib/`, mas o app ainda não conversa com ela diretamente. Para que o time de backend conecte tudo ao banco, faltam:

1. **Autenticação real** – implementar endpoints/serviços que usem `userRepository` para login/registro e devolver tokens seguros (o app hoje apenas navega entre telas).
2. **Persistência dos locais** – criar jobs ou APIs que usem `googlePlaces.js` + `venueRepository` para salvar resultados no banco, gerando cache e histórico para futuras consultas offline.
3. **Interações do usuário** – expor rotas para reviews, favoritos e check-ins (repos `reviewRepository`, `favoriteRepository`, `checkInRepository`) e plugar as telas `Fotos`, `Perfil` e `Recompensas` nesses endpoints.
4. **Camada HTTP** – disponibilizar um serviço (Express/Fastify/etc.) que carregue as variáveis `DB_*`, injete os repositórios e forneça respostas que o app possa consumir via fetch.
5. **Orquestração de secrets** – padronizar `.env`/CI para que a mesma configuração de banco seja reutilizada em desenvolvimento, homologação e produção.

Com esses itens entregues, o front-end poderá abandonar dependências diretas do Google/estado local e operar sobre dados persistidos no MySQL.

## Licença

Uso acadêmico/demonstrativo.

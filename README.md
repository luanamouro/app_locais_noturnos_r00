# 🌙 Bora Sair – Locais Noturnos

> Aplicativo completo para descobrir e explorar estabelecimentos noturnos próximos.

Plataforma cross-platform (Android, iOS) que integra Google Maps API, autenticação de usuários, sistema de favoritos e filtros avançados para descoberta de bares, restaurantes, baladas e outros locais noturnos.

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Requisitos](#-requisitos)
- [Configuração Inicial](#%EF%B8%8F-configuração-inicial)
- [Instalação](#-instalação)
- [Executando o Projeto](#-executando-o-projeto)
- [Arquitetura](#-arquitetura)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Troubleshooting](#-troubleshooting)
- [Tecnologias](#-tecnologias)

---

## ✨ Funcionalidades

### Mapa Interativo
- 📍 Localização automática do usuário
- 🗺️ Mapa Google Maps (web) e react-native-maps (mobile)
- 🔍 Busca por texto (independente de filtros)
- 📏 Controle de raio de busca (0.5km - 5km)
- 🎯 Marcadores personalizados por tipo de estabelecimento

### Filtros e Descoberta
- 🍺 Filtros por categoria: Bares, Restaurantes, Baladas, Cafés, Lanchonetes, Adegas, Food Trucks
- ⭐ Filtro por nota mínima (rating)
- 🔄 Busca automática com otimização de zoom
- 📊 Indicador de progresso durante carregamento

### Autenticação e Perfil
- 🔐 Sistema completo de login/registro
- 🔑 Autenticação JWT com tokens seguros
- 👤 Perfil de usuário editável
- 🚪 Integração com Google OAuth (UI preparada)

### Favoritos e Engajamento
- ❤️ Sistema de favoritos com persistência
- 📝 Detalhes completos dos estabelecimentos
- 📸 Galeria de fotos (preparado para integração)
- 🎁 Sistema de recompensas (preparado para integração)

### Backend Robusto
- 🗄️ MySQL com pool de conexões otimizado
- 🔒 Autenticação segura com bcrypt + JWT
- 📡 API RESTful com Express
- 📋 Migrations e seed data
- 🐛 Tratamento de erros estruturado

---

## 🛠️ Requisitos

### Software Necessário
- **Node.js**: 20.19+ (recomendado)
- **npm**: 10+
- **MySQL**: 8.0+
- **Expo CLI**: Instalado globalmente ou via npx

### APIs Externas
- **Google Maps API**: Places API + Maps JavaScript API + Maps SDK
  - Consulte `GOOGLE_MAPS_SETUP.md` para instruções detalhadas

### Dispositivos para Teste
- **Web**: Qualquer navegador moderno
- **iOS**: Xcode (apenas macOS) ou Expo Go
- **Android**: Android Studio ou Expo Go

---

## ⚙️ Configuração Inicial

### 1. Configurar Banco de Dados

```sql
-- No MySQL
CREATE DATABASE locais_noturnos_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Google Maps API
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_aqui

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=locais_noturnos_dev
DB_USER=root
DB_PASSWORD=sua_senha

# JWT Secret (gere uma chave segura)
JWT_SECRET=sua_chave_jwt_segura_aqui

# Backend URL (ajuste o IP para seu dispositivo físico)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.37:3000/api

# Logging
LOG_LEVEL=INFO
```

**⚠️ Importante para dispositivos físicos:**
- Use o IP da sua máquina na rede local (não `localhost`)
- Garanta que firewall permite conexões na porta 3000

---

## 📦 Instalação

```powershell
# Instalar dependências
npm install

# Executar migrations do banco
node scripts/run-migrations.js
```

---

## 🚀 Executando o Projeto

### Backend (Terminal 1)

```powershell
# Iniciar servidor backend
node server.js

# Servidor rodará em http://localhost:3000
# Health check: http://localhost:3000/health
```

### Frontend (Terminal 2)

```powershell
# Iniciar Expo Dev Server
npx expo start

# Ou limpar cache e reiniciar
npx expo start -c

# Opções no menu interativo:
# - w: Abrir no navegador (web)
# - a: Android (emulador ou dispositivo)
# - i: iOS (apenas macOS)
```

### Comandos Alternativos

```powershell
# Web direto
npm run web

# Android
npm run android

# iOS (apenas macOS)
npm run ios

# Com tunneling (redes restritas)
npx expo start --tunnel
```

---

## 🏗️ Arquitetura

### Frontend
- **Framework**: React Native (Expo)
- **Roteamento**: Expo Router (file-based)
- **Mapas Web**: `@react-google-maps/api`
- **Mapas Mobile**: `react-native-maps` (PROVIDER_GOOGLE)
- **Estado**: React Context API (AuthContext)
- **Persistência**: AsyncStorage

### Backend
- **Framework**: Express 5.x
- **Banco de Dados**: MySQL 8.0 com mysql2
- **Autenticação**: bcrypt + JWT
- **Validação**: Custom error classes
- **Logging**: Winston-style logger

### Integrações
- **Google Places API**: Busca e detalhes de estabelecimentos
- **Google Maps**: Renderização de mapas e geocoding

### Otimizações
- Debounce em buscas automáticas
- Gating de zoom (mín. level 12)
- Limite de raio (máx. 5km)
- Filtro local por distância haversine
- Remoção de duplicatas em buscas multi-tipo

---

## 📁 Estrutura de Pastas

```
app_locais_noturnos/
├── app/                    # Telas e rotas (Expo Router)
│   ├── _layout.js          # Layout raiz com AuthProvider
│   ├── index.js            # Redirect para login
│   ├── login.js            # Tela de login
│   ├── register.js         # Registro de usuário
│   ├── inicio.js           # Menu principal
│   ├── map.js              # Mapa web
│   ├── map.native.js       # Mapa nativo (iOS/Android)
│   ├── filtros.js          # Seleção de filtros
│   ├── localDetails.js     # Detalhes do estabelecimento
│   ├── favoritos.js        # Lista de favoritos
│   ├── perfil.js           # Perfil do usuário
│   ├── fotos.js            # Galeria de fotos
│   └── recompensas.js      # Sistema de recompensas
│
├── lib/                    # Backend e camada de dados
│   ├── api/                # Rotas da API REST
│   │   ├── userRoutes.js
│   │   └── favoriteRoutes.js
│   ├── database/           # Configuração do banco
│   │   ├── client.js       # Cliente de queries
│   │   ├── pool.js         # Pool de conexões
│   │   └── migrations.sql  # Schema e migrations
│   ├── repositories/       # Camada de acesso a dados
│   │   ├── userRepository.js
│   │   ├── venueRepository.js
│   │   ├── favoriteRepository.js
│   │   ├── reviewRepository.js
│   │   └── checkInRepository.js
│   ├── services/           # Lógica de negócio e integrações
│   │   ├── authService.js  # Autenticação e JWT
│   │   └── googlePlaces.js # Google Places API wrapper
│   ├── constants/          # Constantes e mapeamentos
│   │   └── venueTypes.js   # Tipos de estabelecimentos
│   ├── utils/              # Utilitários backend
│   │   ├── errors.js       # Classes de erro customizadas
│   │   ├── logger.js       # Sistema de logs
│   │   └── distance.js     # Cálculos geográficos (Haversine)
│   └── models/             # Definições de tipos (JSDoc)
│       └── types.js
│
├── services/               # Cliente HTTP frontend
│   └── api.js              # Comunicação com backend
│
├── contexts/               # React Context
│   └── AuthContext.js      # Estado global de autenticação
│
├── scripts/                # Scripts utilitários
│   ├── run-migrations.js   # Executar migrations
│   └── sanitize-types.js   # Normalizar dados
│
├── assets/                 # Recursos estáticos
│   └── images/
│
├── server.js               # Entry point do backend
├── app.config.js           # Configuração do Expo
├── package.json
├── .env                    # Variáveis de ambiente (não versionado)
├── .env.example            # Template de variáveis
└── README.md
```

---

## 🔧 Troubleshooting

### Problema: Servidor não inicia

**Erro**: `Error: ER_ACCESS_DENIED_ERROR`

**Solução**:
1. Verifique credenciais do MySQL no `.env`
2. Confirme que o banco `locais_noturnos_dev` existe
3. Teste conexão: `mysql -u root -p`

---

### Problema: App não conecta ao backend

**Erro**: `Network request failed`

**Solução**:
1. Em dispositivos físicos, use IP da máquina (não localhost)
2. Verifique firewall: `New-NetFirewallRule -DisplayName "Node" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000`
3. Confirme que `EXPO_PUBLIC_API_BASE_URL` está correto no `.env`
4. Teste: `curl http://SEU_IP:3000/health`

---

### Problema: Google Maps não carrega

**Erro**: `InvalidKeyMapError` ou mapa cinza

**Solução**:
1. Verifique se a chave está no `.env`: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
2. No Google Cloud Console, habilite:
   - Maps JavaScript API
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
3. Configure restrições de API apropriadamente
4. Aguarde 5-10 minutos após ativar APIs

Consulte `GOOGLE_MAPS_SETUP.md` para guia completo.

---

### Problema: Expo apresenta warnings

**Warning**: `npm warn EBADENGINE`

**Solução**:
- Atualize para Node.js 20.19+
- Ou ignore com: `npm install --legacy-peer-deps`

---

### Problema: Dados não aparecem no mapa

**Sintomas**: Mapa carrega mas sem marcadores

**Checklist**:
1. ✅ Permissão de localização concedida?
2. ✅ Zoom >= 12?
3. ✅ Raio <= 5km?
4. ✅ Há estabelecimentos na região?
5. ✅ Console mostra erros da API?
6. ✅ Quota da Google Places não excedida?

**Dica**: Mensagem helper aparece quando zoom < 12 ou raio > 5km

---

### Problema: Migrations falham

**Erro**: `ER_PARSE_ERROR` em migrations

**Solução**:
```powershell
# Recriar banco
mysql -u root -p -e "DROP DATABASE IF EXISTS locais_noturnos_dev; CREATE DATABASE locais_noturnos_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Executar migrations novamente
node scripts/run-migrations.js
```

---

### Problema: Favoritos não salvam

**Sintomas**: Erro ao favoritar local

**Checklist**:
1. ✅ Usuário está logado?
2. ✅ Token JWT válido?
3. ✅ Backend rodando?
4. ✅ Tabelas `favorites` e `venues` existem?

**Debug**:
```powershell
# Verificar logs do servidor
# Procurar por erros nos endpoints /api/favorites
```

---

## 🛠️ Tecnologias

### Frontend
- React Native 0.81.5
- Expo SDK 54
- Expo Router 6
- React Navigation 7
- Google Maps (react-native-maps 1.20 / @react-google-maps/api 2.20)
- AsyncStorage 2.2
- Ionicons (Expo Vector Icons)

### Backend
- Node.js 20+
- Express 5.1
- MySQL 8.0 (mysql2 3.15)
- bcrypt 6.0
- jsonwebtoken 9.0
- dotenv 17.2
- cors 2.8

### Ferramentas
- ESLint (Expo config)
- TypeScript (definições de tipos)
- Git

---

## 📄 Licença

Projeto acadêmico desenvolvido para o curso de Desenvolvimento de Sistemas do SENAC.

---

**Feito com carinho pelo Grupo 47 para o Projeto Integrador SENAC! 🎓✨**

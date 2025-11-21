# 📱 App - Telas e Rotas

Esta pasta contém todas as telas do aplicativo, organizadas usando **Expo Router** (file-based routing).

## Estrutura

### 🔐 Autenticação
- **`_layout.js`**: Layout raiz que envolve toda a aplicação com `AuthProvider`
- **`index.js`**: Rota raiz que redireciona para `/login`
- **`login.js`**: Tela de login com email/senha e botão Google (UI)
- **`register.js`**: Formulário de registro de novos usuários

### 🗺️ Mapa e Descoberta
- **`inicio.js`**: Menu principal com acesso às funcionalidades
- **`map.js`**: Implementação do mapa para **web** usando `@react-google-maps/api`
- **`map.native.js`**: Implementação do mapa para **iOS/Android** usando `react-native-maps`
  - Otimizações específicas para mobile (debounce, gating de zoom)
  - Controle de raio via modal
  - Indicador de progresso de busca
- **`filtros.js`**: Seleção de filtros por tipo de estabelecimento e nota mínima
- **`localDetails.js`**: Detalhes completos do estabelecimento selecionado
  - Informações (endereço, horário, rating)
  - Botão de favoritar
  - Integração com Google Places Details API

### ❤️ Favoritos e Perfil
- **`favoritos.js`**: Lista de estabelecimentos favoritados pelo usuário
  - Ordenação por mais recentes
  - Navegação para detalhes
- **`perfil.js`**: Perfil do usuário com opções de navegação
  - Fotos
  - Recompensas
  - Logout

### 🎁 Funcionalidades Futuras
- **`fotos.js`**: Galeria de fotos (preparado para implementação)
- **`recompensas.js`**: Sistema de gamificação (preparado para implementação)

## Padrões de Código

### Navegação
```javascript
import { router } from 'expo-router';

// Navegar para rota
router.push('/perfil');

// Navegar com parâmetros
router.push({
  pathname: '/localDetails',
  params: { placeId: '123', name: 'Bar Exemplo' }
});

// Substituir navegação (sem volta)
router.replace('/inicio');
```

### Autenticação
```javascript
import { useAuth } from '../contexts/AuthContext';

const { user, token, signIn, signOut } = useAuth();

// Verificar se está logado
if (!user) {
  router.replace('/login');
}
```

### Estilos
- Todas as telas usam `StyleSheet.create()` para performance
- Paleta de cores consistente:
  - Background: `#0a0a0a` / `#FAFAFA`
  - Primary: `#4285F4` (azul)
  - Success: `#34A853` (verde)
  - Danger: `#DB4437` (vermelho)
  - Text: `#fff` / `#222`

## Diferenças Web vs Native

| Recurso | Web (`map.js`) | Native (`map.native.js`) |
|---------|----------------|-------------------------|
| Biblioteca de Mapa | `@react-google-maps/api` | `react-native-maps` |
| Provider | Google Maps JS | `PROVIDER_GOOGLE` |
| Marcadores | `<Marker>` direto | `<Marker>` com optimizações |
| Eventos | `onClick` | `onPress` |
| Zoom Control | Nativo do Google | `MapView` props |
| Performance | Navegador otimiza | Requer debounce/gating |

## Fluxo de Navegação

```
index.js → login.js → inicio.js ┬→ map.native.js → localDetails.js
                                 ├→ filtros.js ↩ map.native.js
                                 ├→ favoritos.js → localDetails.js
                                 └→ perfil.js ┬→ fotos.js
                                              ├→ recompensas.js
                                              └→ logout → login.js
```

## Boas Práticas

1. **Performance**: Use `useMemo` e `useCallback` em componentes pesados (mapas)
2. **Loading States**: Sempre mostre indicadores durante requisições
3. **Error Handling**: Use `try/catch` e exiba `Alert.alert()` para erros
4. **Acessibilidade**: Inclua `accessibilityLabel` em botões importantes
5. **Responsividade**: Use porcentagens e `Dimensions` para layouts flexíveis

## Próximos Passos

- [ ] Implementar upload de fotos em `fotos.js`
- [ ] Sistema de pontos e recompensas em `recompensas.js`
- [ ] Integração real do Google OAuth em `login.js`
- [ ] Review/rating system em `localDetails.js`
- [ ] Check-in system nos locais visitados

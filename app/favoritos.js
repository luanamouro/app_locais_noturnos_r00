import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { favoriteAPI } from '../services/api';

/** Lista de locais favoritados pelo usuário com remoção e navegação para detalhes */
export default function Favoritos() {
  const { user, token } = useAuth();
  const [favoritos, setFavoritos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /** Busca favoritos do backend (ordenados do mais recente ao mais antigo) */
  const carregarFavoritos = useCallback(async () => {
    if (!user || !token) {
      setCarregando(false);
      return;
    }

    try {
      const dados = await favoriteAPI.getFavorites(token);
      setFavoritos(dados);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os favoritos');
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    carregarFavoritos();
  }, [carregarFavoritos]);

  /** Atualiza lista com gesto de pull-to-refresh */
  const onRefresh = () => {
    setRefreshing(true);
    carregarFavoritos();
  };

  /** Navega para detalhes do local com todos os parâmetros necessários */
  const abrirDetalhes = (favorito) => {
    router.push({
      pathname: '/localDetails',
      params: {
        placeId: favorito.google_place_id,
        name: favorito.venue_name,
        address: favorito.venue_address,
        latitude: favorito.latitude,
        longitude: favorito.longitude,
        rating: favorito.rating,
      },
    });
  };

  /** Remove favorito com confirmação via alert e atualiza lista local */
  const removerFavorito = async (favorito) => {
    Alert.alert(
      'Remover favorito',
      `Deseja remover "${favorito.venue_name}" dos favoritos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await favoriteAPI.removeFavorite(token, favorito.google_place_id);
              setFavoritos((prev) =>
                prev.filter((f) => f.favorite_id !== favorito.favorite_id)
              );
            } catch (error) {
              console.error('Erro ao remover favorito:', error);
              Alert.alert('Erro', 'Não foi possível remover o favorito');
            }
          },
        },
      ]
    );
  };

  /** Renderiza card com nome, tipo, endereço, rating e botão de remover */
  const renderFavorito = ({ item }) => {
    let tipos = [];
    if (Array.isArray(item.types)) {
      tipos = item.types;
    } else if (typeof item.types === 'string') {
      const t = item.types.trim();
      if (t) {
        try {
          if (t.startsWith('[') || t.startsWith('{')) {
            tipos = JSON.parse(t);
          } else {
            tipos = t.split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch (_) {
          tipos = [];
        }
      }
    }
    const tipoFormatado = (tipos[0] || '').replace(/_/g, ' ') || 'Estabelecimento';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => abrirDetalhes(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.venue_name}
              </Text>
              <Text style={styles.cardType} numberOfLines={1}>
                {tipoFormatado}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removerFavorito(item)}
            >
              <Ionicons name="heart" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>

          {item.venue_address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.venue_address}
              </Text>
            </View>
          )}

          {item.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>
                {parseFloat(item.rating).toFixed(1)}
              </Text>
              {item.user_ratings_total > 0 && (
                <Text style={styles.ratingsCount}>
                  ({item.user_ratings_total})
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (carregando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6C47FF" />
        <Text style={styles.loadingText}>Carregando favoritos...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="heart-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Login necessário</Text>
        <Text style={styles.emptyText}>
          Faça login para favoritar locais e visualizá-los aqui
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (favoritos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="heart-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
        <Text style={styles.emptyText}>
          Comece a explorar e favoritar seus locais preferidos!
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => router.push('/map')}
        >
          <Text style={styles.exploreButtonText}>Explorar Mapa</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Favoritos</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={favoritos}
        renderItem={renderFavorito}
        keyExtractor={(item) => item.favorite_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C47FF"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#6C47FF',
    borderRadius: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  exploreButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#6C47FF',
    borderRadius: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  removeButton: {
    padding: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  ratingsCount: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
});

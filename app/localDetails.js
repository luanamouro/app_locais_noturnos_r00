import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  Modal,
  Pressable,
  Share,
  TouchableWithoutFeedback
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { buscarDetalhesLugar } from '../lib/services/googlePlaces';
import { useAuth } from '../contexts/AuthContext';
import { favoriteAPI } from '../services/api';

/** Detalhes completos do local: fotos, avaliações, horários, favoritos e compartilhamento multi-plataforma */
export default function LocalDetails() {
  const params = useLocalSearchParams();
  const { user, token } = useAuth();
  const [detalhes, setDetalhes] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  /** Busca detalhes completos do local via Places Details API */
  const carregarDetalhes = useCallback(async () => {
    try {
      if (params.placeId) {
        const dados = await buscarDetalhesLugar(params.placeId);
        setDetalhes(dados);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
    setCarregando(false);
  }, [params.placeId]);

  useEffect(() => {
    carregarDetalhes();
  }, [carregarDetalhes]);

  /** Verifica se local está favoritado pelo usuário autenticado */
  const verificarFavorito = useCallback(async () => {
    if (!user || !token || !params.placeId) return;
    
    try {
      const favorito = await favoriteAPI.checkFavorite(token, params.placeId);
      setIsFavorite(favorito);
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
    }
  }, [user, token, params.placeId]);

  useEffect(() => {
    verificarFavorito();
  }, [verificarFavorito]);

  /** Adiciona/remove local dos favoritos com validação de login */
  const toggleFavorito = async () => {
    if (!user) {
      Alert.alert('Login necessário', 'Faça login para favoritar locais');
      return;
    }

    if (!token || !params.placeId) return;

    setLoadingFavorite(true);
    try {
      if (isFavorite) {
        await favoriteAPI.removeFavorite(token, params.placeId);
        setIsFavorite(false);
        Alert.alert('✓', 'Removido dos favoritos');
      } else {
        await favoriteAPI.addFavorite(token, {
          googlePlaceId: params.placeId,
          name: params.name || detalhes?.name || 'Local',
          address: params.address || detalhes?.formatted_address,
          latitude: params.latitude || detalhes?.geometry?.location?.lat,
          longitude: params.longitude || detalhes?.geometry?.location?.lng,
          types: detalhes?.types || [],
          rating: params.rating || detalhes?.rating,
          userRatingsTotal: detalhes?.user_ratings_total
        });
        setIsFavorite(true);
        Alert.alert('✓', 'Adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      Alert.alert('Erro', error.message || 'Erro ao atualizar favorito');
    } finally {
      setLoadingFavorite(false);
    }
  };

  /** Abre app de mapas nativo (Apple Maps, Google Maps ou web) para navegação */
  const abrirMaps = () => {
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${params.latitude},${params.longitude}`,
      android: `geo:${params.latitude},${params.longitude}?q=${params.latitude},${params.longitude}`,
      web: `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`
    });
    Linking.openURL(url);
  };

  /** URL do Google Maps para compartilhamento (lat/lng ou place_id) */
  const shareLink = useMemo(() => {
    if (params.latitude && params.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}&query_place_id=${params.placeId || ''}`;
    }
    if (params.placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${params.placeId}`;
    }
    return 'https://maps.google.com';
  }, [params.latitude, params.longitude, params.placeId]);

  /** Mensagem formatada: nome + endereço + link */
  const shareMessage = useMemo(() => {
    const nomeLocal = params.name || 'Local imperdível';
    const enderecoLocal = params.address ? ` - ${params.address}` : '';
    return `${nomeLocal}${enderecoLocal}\n${shareLink}`;
  }, [params.name, params.address, shareLink]);

  const encodedMessage = useMemo(() => encodeURIComponent(shareMessage), [shareMessage]);
  const encodedLink = useMemo(() => encodeURIComponent(shareLink), [shareLink]);

  /** Opções de compartilhamento: WhatsApp, Instagram, X, Mensagens, Facebook */
  const shareOptions = useMemo(() => ([
    { id: 'whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp' },
    { id: 'instagram', icon: 'logo-instagram', label: 'Instagram' },
    { id: 'x', customIcon: 'X', label: 'X' },
    { id: 'mensagens', icon: 'chatbubble-ellipses-outline', label: 'Mensagens' },
    { id: 'facebook', icon: 'logo-facebook', label: 'Facebook' },
  ]), []);

  const closeShareModal = () => setShareModalVisible(false);

  const compartilhar = () => {
    setShareModalVisible(true);
  };

  /** Tenta deep link primário, fallback web, ou alerta se indisponível */
  const openUrl = useCallback(async (primary, fallback) => {
    try {
      if (primary) {
        const canOpenPrimary = await Linking.canOpenURL(primary);
        if (canOpenPrimary) {
          await Linking.openURL(primary);
          return true;
        }
      }
      if (fallback) {
        await Linking.openURL(fallback);
        return true;
      }
      throw new Error('UNAVAILABLE');
    } catch (error) {
      Alert.alert('Compartilhamento indisponível', 'Não foi possível abrir o app selecionado.');
      return false;
    } finally {
      closeShareModal();
    }
  }, []);

  /** Executa ação de compartilhamento via deep link ou Share API */
  const handleShareOption = useCallback(async (optionId) => {
    switch (optionId) {
      case 'whatsapp': {
        const deepLink = `whatsapp://send?text=${encodedMessage}`;
        const webLink = `https://wa.me/?text=${encodedMessage}`;
        await openUrl(deepLink, webLink);
        break;
      }
      case 'instagram': {
        try {
          await Share.share({ message: shareMessage });
        } catch (error) {
          Alert.alert('Compartilhamento indisponível', 'Não foi possível abrir o compartilhamento agora.');
        } finally {
          closeShareModal();
        }
        break;
      }
      case 'x': {
        const tweetLink = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
        await openUrl(tweetLink);
        break;
      }
      case 'mensagens': {
        const smsParam = Platform.OS === 'ios' ? '&' : '?';
        const smsLink = `sms:${smsParam}body=${encodedMessage}`;
        await openUrl(smsLink);
        break;
      }
      case 'facebook': {
        const fbLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodedMessage}`;
        await openUrl(fbLink);
        break;
      }
      default:
        closeShareModal();
    }
  }, [encodedMessage, encodedLink, openUrl, shareMessage]);

  /** Traduz tipos do Google Places (bar, restaurant, night_club) para português */
  const traduzirTipo = (tipo) => {
    const traducoes = {
      'bar': 'Bar',
      'restaurant': 'Restaurante',
      'night_club': 'Balada',
      'cafe': 'Café',
      'meal_takeaway': 'Lanchonete',
      'liquor_store': 'Adega',
      'food': 'Comida'
    };
    return traducoes[tipo] || tipo;
  };

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C47FF" />
        <Text style={styles.loadingText}>Carregando detalhes...</Text>
      </View>
    );
  }

  const nome = params.name || 'Local';
  const endereco = params.address || 'Endereço não disponível';
  const rating = parseFloat(params.rating) || 0;
  const totalRatings = parseInt(params.totalRatings) || 0;
  const tipos = params.types ? JSON.parse(params.types) : [];
  const tiposFormatados = tipos
    .slice(0, 3)
    .map(traduzirTipo)
    .join(' • ');
  const estaAberto = params.isOpen === 'true';

  const fotos = detalhes?.photos?.slice(0, 5).map((photo, index) => ({
    id: index.toString(),
    url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
  })) || [];

  const avaliacoes = detalhes?.reviews?.map((review, index) => ({
    id: index.toString(),
    usuario: review.author_name,
    estrelas: review.rating,
    comentario: review.text,
    tempo: review.relative_time_description
  })) || [];

  return (
    <View style={styles.overlayContainer}>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.favoriteButton} 
          onPress={toggleFavorito}
          disabled={loadingFavorite}
        >
          {loadingFavorite ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={28} 
              color="#fff" 
            />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.shareButton} onPress={compartilhar}>
          <Ionicons name="share-social-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          
          {estaAberto !== undefined && (
            <View style={[styles.statusBadge, { backgroundColor: estaAberto ? '#4CAF50' : '#F44336' }]}>
              <Text style={styles.statusText}>
                {estaAberto ? '🟢 Aberto agora' : '🔴 Fechado'}
              </Text>
            </View>
          )}

          <Text style={styles.title}>{nome}</Text>
          <Text style={styles.subtitle}>{tiposFormatados || 'Estabelecimento'}</Text>

          <TouchableOpacity style={styles.addressRow} onPress={abrirMaps}>
            <Ionicons name="location" size={20} color="#6C47FF" />
            <Text style={styles.addressText}>{endereco}</Text>
            <Ionicons name="chevron-forward" size={20} color="#6C47FF" />
          </TouchableOpacity>

          {rating > 0 && (
            <View style={styles.scoreRow}>
              <Ionicons name="star" size={22} color="#FFD700" />
              <Text style={styles.scoreText}>
                {rating.toFixed(1)} {totalRatings > 0 && `• ${totalRatings} avaliações`}
              </Text>
            </View>
          )}

          {fotos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Fotos</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.fotosScroll}
              >
                {fotos.map((foto) => (
                  <Image 
                    key={foto.id} 
                    source={{ uri: foto.url }} 
                    style={styles.carouselImage} 
                  />
                ))}
              </ScrollView>
            </>
          )}

          {detalhes && (
            <>
              {detalhes.formatted_phone_number && (
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={20} color="#6C47FF" />
                  <Text style={styles.infoText}>{detalhes.formatted_phone_number}</Text>
                </View>
              )}

              {detalhes.website && (
                <TouchableOpacity 
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(detalhes.website)}
                >
                  <Ionicons name="globe" size={20} color="#6C47FF" />
                  <Text style={[styles.infoText, styles.linkText]}>Ver website</Text>
                  <Ionicons name="open-outline" size={16} color="#6C47FF" />
                </TouchableOpacity>
              )}

              {detalhes.opening_hours?.weekday_text && (
                <>
                  <Text style={styles.sectionTitle}>Horários</Text>
                  {detalhes.opening_hours.weekday_text.map((dia, index) => (
                    <Text key={index} style={styles.horarioText}>{dia}</Text>
                  ))}
                </>
              )}
            </>
          )}

          {avaliacoes.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Avaliações</Text>
              {avaliacoes.map((item) => (
                <View key={item.id} style={styles.commentBox}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{item.usuario}</Text>
                    <Text style={styles.commentTime}>{item.tempo}</Text>
                  </View>
                  <View style={styles.commentStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons 
                        key={star}
                        name="star" 
                        size={14} 
                        color={star <= item.estrelas ? "#FFD700" : "#333"} 
                      />
                    ))}
                  </View>
                  <Text style={styles.commentText}>{item.comentario}</Text>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 100 }}></View>
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeShareModal}
      >
        <Pressable style={styles.shareModalBackdrop} onPress={closeShareModal}>
          <TouchableWithoutFeedback>
            <View style={styles.shareModalContent}>
              <Text style={styles.shareModalTitle}>Compartilhar</Text>
              <View style={styles.shareOptionsRow}>
                {shareOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.shareOptionButton}
                    onPress={() => handleShareOption(option.id)}
                  >
                    <View style={styles.shareOptionIconWrapper}>
                      {option.customIcon ? (
                        <Text style={styles.shareOptionCustomIcon}>{option.customIcon}</Text>
                      ) : (
                        <Ionicons name={option.icon} size={26} color="#111" />
                      )}
                    </View>
                    <Text style={styles.shareOptionLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  sheet: {
    backgroundColor: "#0a0a0a",
    padding: 20,
    height: "85%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    marginLeft: 8,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 18,
    color: "#fff",
    marginLeft: 8,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 20,
  },
  fotosScroll: {
    marginBottom: 10,
  },
  carouselImage: {
    width: 250,
    height: 180,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    marginLeft: 8,
  },
  linkText: {
    color: '#6C47FF',
  },
  horarioText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
    paddingLeft: 8,
  },
  commentBox: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  commentTime: {
    color: '#666',
    fontSize: 12,
  },
  commentStarsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  commentText: {
    color: "#ccc",
    lineHeight: 20,
    fontSize: 14,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 12,
    borderRadius: 50,
  },
  actionButtons: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 5,
  },
  favoriteButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 12,
    borderRadius: 50,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 12,
    borderRadius: 50,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 24,
  },
  shareModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#f2f2f2',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  shareModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  shareOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  shareOptionButton: {
    flex: 1,
    alignItems: 'center',
  },
  shareOptionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  shareOptionLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  shareOptionCustomIcon: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111',
  },
});

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { buscarDetalhesLugar } from '../services/googlePlaces';

/**
 * Sheet de detalhes que mostra dados ricos do lugar selecionado.
 */
export default function LocalDetails() {
  const params = useLocalSearchParams();
  const [detalhes, setDetalhes] = useState(null);
  const [carregando, setCarregando] = useState(true);

  /**
   * Recupera os detalhes completos do Place ID recebido por parâmetro.
   */
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

  /** Abre o aplicativo de mapas nativo para navegação até o local. */
  const abrirMaps = () => {
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${params.latitude},${params.longitude}`,
      android: `geo:${params.latitude},${params.longitude}?q=${params.latitude},${params.longitude}`,
      web: `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`
    });
    Linking.openURL(url);
  };

  /** Dispara o fluxo de compartilhamento padrão com os dados do local. */
  const compartilhar = () => {
    // Implementar compartilhamento
    const texto = `Confira ${params.name} - ${params.address}`;
    if (Platform.OS === 'web') {
      navigator.share?.({ title: params.name, text: texto });
    }
  };

  /** Traduz tipos padrão do Google Places para rótulos em português. */
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

  // Fotos do Google Places
  const fotos = detalhes?.photos?.slice(0, 5).map((photo, index) => ({
    id: index.toString(),
    url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
  })) || [];

  // Avaliações do Google Places
  const avaliacoes = detalhes?.reviews?.map((review, index) => ({
    id: index.toString(),
    usuario: review.author_name,
    estrelas: review.rating,
    comentario: review.text,
    tempo: review.relative_time_description
  })) || [];

  return (
    <View style={styles.overlayContainer}>
      {/* Botão Compartilhar */}
      <TouchableOpacity style={styles.shareButton} onPress={compartilhar}>
        <Ionicons name="share-social-outline" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Conteúdo principal */}
      <View style={styles.sheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          
          {/* Status Aberto/Fechado */}
          {estaAberto !== undefined && (
            <View style={[styles.statusBadge, { backgroundColor: estaAberto ? '#4CAF50' : '#F44336' }]}>
              <Text style={styles.statusText}>
                {estaAberto ? '🟢 Aberto agora' : '🔴 Fechado'}
              </Text>
            </View>
          )}

          {/* Título */}
          <Text style={styles.title}>{nome}</Text>
          <Text style={styles.subtitle}>{tiposFormatados || 'Estabelecimento'}</Text>

          {/* Endereço */}
          <TouchableOpacity style={styles.addressRow} onPress={abrirMaps}>
            <Ionicons name="location" size={20} color="#6C47FF" />
            <Text style={styles.addressText}>{endereco}</Text>
            <Ionicons name="chevron-forward" size={20} color="#6C47FF" />
          </TouchableOpacity>

          {/* Score */}
          {rating > 0 && (
            <View style={styles.scoreRow}>
              <Ionicons name="star" size={22} color="#FFD700" />
              <Text style={styles.scoreText}>
                {rating.toFixed(1)} {totalRatings > 0 && `• ${totalRatings} avaliações`}
              </Text>
            </View>
          )}

          {/* Fotos */}
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

          {/* Informações Adicionais */}
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

          {/* Avaliações */}
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

      {/* Botão Voltar */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>
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
  shareButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 12,
    borderRadius: 50,
    zIndex: 5,
  },
});

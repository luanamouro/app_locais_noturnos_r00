/**
 * Mapa (iOS/Android)
 * - Renderiza Google Maps via react-native-maps (PROVIDER_GOOGLE).
 * - Integra com Places API para buscar lugares conforme filtros e raio.
 * - Inclui busca por texto, lista, centralização, e controle de raio em modal.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import {
  buscarEstabelecimentosNoturnos,
  buscarPorTexto,
  buscarLugaresProximos as buscarLugaresPorTipo,
  kmToMeters,
} from '../lib/services/googlePlaces';
import { VENUE_TYPES, getVenueConfigByTypes } from '../lib/constants/venueTypes';
import { filterPlacesWithinRadius } from '../lib/utils/distance';

const MAX_RADIUS_KM = 5;
const MIN_ZOOM_LEVEL = 12;

/**
 * Componente principal do mapa nativo.
 */
export default function Map() {
  const params = useLocalSearchParams();
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [lugares, setLugares] = useState([]);
  const [buscaTexto, setBuscaTexto] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [filtrosAtivos, setFiltrosAtivos] = useState([]);
  const [notaMinima, setNotaMinima] = useState(0);
  const [radiusKm, setRadiusKm] = useState(0.5);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [radiusDraft, setRadiusDraft] = useState(0.5);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [helperMessage, setHelperMessage] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showFetchProgress, setShowFetchProgress] = useState(false);
  const mapRef = useRef(null);
  const requestSeqRef = useRef(0);
  const zoomLevelRef = useRef(15);
  const radiusRef = useRef(0.5);
  const radiusChangeTimeout = useRef(null);

  // Mapeia filtros brasileiros para tipos do Google Places API
  const filtrosParaTipos = useMemo(() => ({
    Bares: VENUE_TYPES.Bares.googleType,
    Restaurantes: VENUE_TYPES.Restaurantes.googleType,
    Baladas: VENUE_TYPES.Baladas.googleType,
    'Cafés': VENUE_TYPES['Cafés'].googleType,
    Lanchonetes: VENUE_TYPES.Lanchonetes.googleType,
    Adegas: VENUE_TYPES.Adegas.googleType,
    'Food Trucks': VENUE_TYPES['Food Trucks'].googleType,
  }), []);

  // Recebe filtros da tela de filtros
  useEffect(() => {
    if (params.filtros) {
      const filtrosArray = JSON.parse(params.filtros);
      setFiltrosAtivos(filtrosArray);
    }
    if (params.notaMinima) {
      const nota = parseFloat(params.notaMinima);
      if (!isNaN(nota)) {
        setNotaMinima(nota);
      }
    }
  }, [params.filtros, params.notaMinima]);

  // Solicita permissão e obtém localização atual
  useEffect(() => {
    obterLocalizacao();
  }, []);

  useEffect(() => {
    radiusRef.current = radiusKm;
  }, [radiusKm]);

  /**
   * Solicita permissão e obtém a localização atual do usuário (alta precisão).
   */
  const obterLocalizacao = async () => {
    try {
      // Solicita permissão de localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Negada',
          'Precisamos de acesso à sua localização para mostrar lugares próximos.'
        );
        setCarregando(false);
        return;
      }

      // Obtém a localização atual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const preciseRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setLocalizacaoAtual(preciseRegion);

      requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion(preciseRegion, 500);
        }
      });

      setCarregando(false);
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert('Erro', 'Não foi possível obter sua localização.');
      setCarregando(false);
    }
  };

  /**
   * Busca lugares próximos considerando filtros e raio selecionado.
   * @param {number} [customRadiusKm] - Raio em km para sobrescrever o atual (opcional).
   */
  const buscarLugaresProximos = useCallback(async (customRadiusKm) => {
    if (!localizacaoAtual) return;

    const requestId = ++requestSeqRef.current;
    setBuscando(true);
    setShowFetchProgress(true);
    setProgressPercent(0);
    try {
      let resultados = [];
      const radiusBaseKm = typeof customRadiusKm === 'number' ? customRadiusKm : radiusRef.current;
      const radiusMeters = kmToMeters(radiusBaseKm);

      if (radiusBaseKm > MAX_RADIUS_KM) {
        setHelperMessage('Aproxime mais o mapa ou reduza o raio (máx. 5km) para ver novos locais.');
        if (requestSeqRef.current === requestId) {
          setBuscando(false);
          setShowFetchProgress(false);
        }
        return;
      }

      if (zoomLevelRef.current < MIN_ZOOM_LEVEL) {
        setHelperMessage('Aproxime o mapa (zoom >= 12) para carregar os estabelecimentos.');
        if (requestSeqRef.current === requestId) {
          setBuscando(false);
          setShowFetchProgress(false);
        }
        return;
      }

      setHelperMessage(null);
      
      if (filtrosAtivos.length > 0) {
        const total = filtrosAtivos.length;
        let completed = 0;
        const acumulados = [];
        for (const filtro of filtrosAtivos) {
          const tipo = filtrosParaTipos[filtro] || 'restaurant';
          try {
            const resultadosTipo = await buscarLugaresPorTipo(
              localizacaoAtual.latitude,
              localizacaoAtual.longitude,
              tipo,
              radiusMeters
            );
            acumulados.push(...resultadosTipo);
          } catch (err) {
            console.error('Erro ao buscar filtro', filtro, err);
          }
          completed += 1;
          setProgressPercent(Math.min(100, Math.round((completed / total) * 100)));
        }
        resultados = acumulados;
        
        // Remove duplicatas
        resultados = resultados.filter((lugar, index, self) =>
          index === self.findIndex((l) => l.place_id === lugar.place_id)
        );
      } else {
        resultados = await buscarEstabelecimentosNoturnos(
          localizacaoAtual.latitude,
          localizacaoAtual.longitude,
          radiusMeters,
          (ratio) => {
            setProgressPercent(Math.min(100, Math.round(ratio * 100)));
          }
        );
      }
      
      const filtrados = filterPlacesWithinRadius(resultados, localizacaoAtual, radiusMeters);
      const comNotaMinima = notaMinima > 0
        ? filtrados.filter(lugar => (lugar.rating || 0) >= notaMinima)
        : filtrados;
      
      if (requestSeqRef.current === requestId) {
        setLugares(comNotaMinima);
      }
    } catch (error) {
      console.error('Erro ao buscar lugares:', error);
    }
    if (requestSeqRef.current === requestId) {
      setBuscando(false);
      setShowFetchProgress(false);
      setProgressPercent(100);
    }
  }, [localizacaoAtual, filtrosAtivos, filtrosParaTipos, notaMinima]);

  // Busca lugares quando localização ou filtros mudam, mas desacelera repetições
  useEffect(() => {
    if (!localizacaoAtual) return;
    const timeout = setTimeout(() => buscarLugaresProximos(), 300);
    return () => clearTimeout(timeout);
  }, [localizacaoAtual, buscarLugaresProximos]);

  useEffect(() => () => {
    if (radiusChangeTimeout.current) {
      clearTimeout(radiusChangeTimeout.current);
    }
  }, []);

  /**
   * Realiza busca por texto SEM considerar filtros ou raio.
   * A busca por texto ignora todos os filtros ativos e controles de range.
   */
  const realizarBusca = async () => {
    if (!buscaTexto.trim() || !localizacaoAtual) return;

    setBuscando(true);
    try {
      // Usa raio generoso (50km) para não limitar buscas por texto
      const resultados = await buscarPorTexto(
        buscaTexto,
        localizacaoAtual.latitude,
        localizacaoAtual.longitude,
        50000 // 50km em metros
      );
      
      // Define resultados diretamente sem aplicar filtros de raio ou nota
      setLugares(resultados);
    } catch (error) {
      console.error('Erro ao buscar:', error);
      Alert.alert('Erro', 'Não foi possível realizar a busca.');
    }
    setBuscando(false);
  };

  /**
   * Navega para a tela de detalhes do local selecionado.
   */
  const abrirDetalhes = (lugar) => {
    router.push({
      pathname: '/localDetails',
      params: { 
        placeId: lugar.place_id,
        name: lugar.name,
        address: lugar.vicinity || lugar.formatted_address || '',
        rating: lugar.rating || 0,
        totalRatings: lugar.user_ratings_total || 0,
        types: JSON.stringify(lugar.types || []),
        latitude: lugar.geometry.location.lat,
        longitude: lugar.geometry.location.lng,
        isOpen: lugar.opening_hours?.open_now ? 'true' : 'false'
      }
    });
  };

  /** Centraliza a câmera do mapa na posição atual do usuário. */
  const centralizarNoUsuario = () => {
    if (mapRef.current && localizacaoAtual) {
      mapRef.current.animateToRegion({
        ...localizacaoAtual,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 600);
    }
  };

  /** Abre o modal do controle de raio com o valor atual como rascunho. */
  const abrirModalRaio = () => {
    setRadiusDraft(radiusKm);
    setRadiusModalVisible(true);
  };

  /** Fecha o modal do controle de raio sem aplicar mudanças. */
  const cancelarModalRaio = () => {
    setRadiusModalVisible(false);
  };

  /**
   * Aplica o novo raio e dispara nova busca.
   */
  const aplicarRaio = () => {
    setRadiusKm(radiusDraft);
    setRadiusModalVisible(false);
    if (radiusChangeTimeout.current) {
      clearTimeout(radiusChangeTimeout.current);
    }
    radiusChangeTimeout.current = setTimeout(() => {
      buscarLugaresProximos(radiusDraft);
    }, 400);
  };

  /**
   * Atualiza o nível de zoom baseado na região atual para controlar o gating.
   */
  const handleRegionChangeComplete = (region) => {
    if (!region || typeof region.latitudeDelta !== 'number') return;
    const zoom = Math.max(1, Math.round(Math.log2(360 / region.latitudeDelta)));
    zoomLevelRef.current = zoom;
    setZoomLevel(zoom);
  };

  /** Abre a tela de filtros, mantendo os filtros ativos atuais. */
  const abrirFiltros = () => {
    router.push({
      pathname: '/filtros',
      params: { 
        selecionados: JSON.stringify(filtrosAtivos),
        notaMinima: notaMinima.toString()
      },
    });
  };

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C47FF" />
        <Text style={styles.loadingText}>Obtendo sua localização...</Text>
      </View>
    );
  }

  if (!localizacaoAtual) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="location-outline" size={64} color="#999" />
        <Text style={styles.errorText}>Localização não disponível</Text>
        <TouchableOpacity style={styles.retryButton} onPress={obterLocalizacao}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatRadiusLabel = () => `${radiusKm.toFixed(1)} km`;
  const formatRadiusDraftLabel = () => `${radiusDraft.toFixed(1)} km`;

  return (
    <View style={styles.container}>
      {helperMessage && (
        <View style={styles.helperBanner}>
          <Text style={styles.helperBannerText}>{helperMessage}</Text>
        </View>
      )}
      {showFetchProgress && (
        <View style={styles.progressOverlay}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.progressText}>
            {`${Math.min(progressPercent, 100)}% - buscando locais incríveis para você...`}
          </Text>
        </View>
      )}
      {/* MAPA */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.mapa}
        initialRegion={localizacaoAtual}
        showsUserLocation={true}
        showsMyLocationButton={false}
        loadingEnabled={true}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* Marcadores dos lugares encontrados */}
        {lugares.map((lugar) => {
          const config = getVenueConfigByTypes(lugar.types) || VENUE_TYPES.Bares;
          return (
            <Marker
              key={lugar.place_id}
              coordinate={{
                latitude: lugar.geometry.location.lat,
                longitude: lugar.geometry.location.lng,
              }}
              title={lugar.name}
              description={lugar.vicinity}
              onPress={() => abrirDetalhes(lugar)}
            >
              <View style={styles.markerWrapper}>
                <View style={[styles.markerBadge, { backgroundColor: config.color }]}>
                  <Ionicons name={config.icon} size={18} color="#fff" />
                </View>
                <View style={[styles.markerPointer, { borderTopColor: config.color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* BARRA DE BUSCA */}
      <View style={styles.searchBox}>
        <TextInput
          placeholder="Buscar bar, restaurante, balada..."
          placeholderTextColor="#666"
          style={styles.searchInput}
          value={buscaTexto}
          onChangeText={setBuscaTexto}
          onSubmitEditing={realizarBusca}
          returnKeyType="search"
        />
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={realizarBusca}
          disabled={buscando}
        >
          {buscando ? (
            <ActivityIndicator size="small" color="#6C47FF" />
          ) : (
            <Ionicons name="search" size={20} color="#6C47FF" />
          )}
        </TouchableOpacity>
      </View>

      {/* CONTADOR DE LUGARES */}
      {lugares.length > 0 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {lugares.length} {lugares.length === 1 ? 'lugar encontrado' : 'lugares encontrados'}
          </Text>
        </View>
      )}

      {/* BOTÕES DE AÇÃO */}
      <View style={styles.botoesContainer}>
        {/* Botão Ver Lista */}
        <TouchableOpacity 
          style={[styles.botao, styles.listaButton]}
          onPress={() => setMostrarLista(true)}
        >
          <Ionicons name="list" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Botão de centralizar */}
        <TouchableOpacity 
          style={[styles.botao, styles.locationButton]}
          onPress={centralizarNoUsuario}
        >
          <Ionicons name="navigate" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.botao, styles.radiusButton]}
          onPress={abrirModalRaio}
        >
          <Ionicons name="radio-outline" size={20} color="#fff" />
          <Text style={styles.radiusButtonLabel}>{formatRadiusLabel()}</Text>
        </TouchableOpacity>

        {/* Botão de filtros */}
        <TouchableOpacity 
          style={[styles.botao, styles.filtrosButton]}
          onPress={abrirFiltros}
        >
          <Ionicons name="filter" size={20} color="#fff" />
          {filtrosAtivos.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filtrosAtivos.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Botão de refresh */}
        <TouchableOpacity 
          style={[styles.botao, styles.refreshButton]}
          onPress={buscarLugaresProximos}
          disabled={buscando}
        >
          {buscando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL DE LISTA */}
      <Modal
        visible={mostrarLista}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMostrarLista(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lugares Próximos</Text>
            <TouchableOpacity onPress={() => setMostrarLista(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {lugares.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#999" />
                <Text style={styles.emptyText}>Nenhum lugar encontrado</Text>
              </View>
            ) : (
              lugares.map((lugar) => (
                <TouchableOpacity
                  key={lugar.place_id}
                  style={styles.lugarCard}
                  onPress={() => {
                    setMostrarLista(false);
                    abrirDetalhes(lugar);
                  }}
                >
                  <View style={styles.lugarHeader}>
                    <Ionicons name="location" size={24} color="#FF6B6B" />
                    <View style={styles.lugarInfo}>
                      <Text style={styles.lugarNome} numberOfLines={1}>
                        {lugar.name}
                      </Text>
                      <Text style={styles.lugarEndereco} numberOfLines={2}>
                        {lugar.vicinity}
                      </Text>
                    </View>
                  </View>
                  
                  {lugar.rating && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color="#FFB800" />
                      <Text style={styles.ratingText}>{lugar.rating}</Text>
                      {lugar.user_ratings_total && (
                        <Text style={styles.ratingCount}>({lugar.user_ratings_total})</Text>
                      )}
                    </View>
                  )}

                  {lugar.opening_hours && (
                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: lugar.opening_hours.open_now ? '#4CAF50' : '#F44336' }
                      ]} />
                      <Text style={styles.statusText}>
                        {lugar.opening_hours.open_now ? 'Aberto agora' : 'Fechado'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.verDetalhes}>
                    <Text style={styles.verDetalhesText}>Ver detalhes</Text>
                    <Ionicons name="chevron-forward" size={20} color="#6C47FF" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={radiusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelarModalRaio}
      >
        <View style={styles.radiusModalBackdrop}>
          <View style={styles.radiusModalContent}>
            <View style={styles.radiusModalHeader}>
              <Text style={styles.radiusModalTitle}>Raio de busca</Text>
              <TouchableOpacity onPress={cancelarModalRaio}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.radiusLabel}>Selecionado: {formatRadiusDraftLabel()}</Text>
            <Text style={styles.radiusHint}>Aplicado: {formatRadiusLabel()}</Text>
            <Slider
              style={styles.radiusSlider}
              minimumValue={0.5}
              maximumValue={5}
              value={radiusDraft}
              step={0.1}
              minimumTrackTintColor="#6C47FF"
              maximumTrackTintColor="#444"
              thumbTintColor="#6C47FF"
              onValueChange={setRadiusDraft}
            />
            <View style={styles.radiusScale}>
              <Text style={styles.radiusScaleText}>0.5 km</Text>
              <Text style={styles.radiusScaleText}>5 km</Text>
            </View>
            <View style={styles.radiusActions}>
              <TouchableOpacity
                style={[styles.radiusActionButton, styles.radiusCancel]}
                onPress={cancelarModalRaio}
              >
                <Text style={styles.radiusActionText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radiusActionButton, styles.radiusApply]}
                onPress={aplicarRaio}
              >
                <Text style={[styles.radiusActionText, styles.radiusActionTextApply]}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  helperBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 24 : 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  helperBannerText: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 24,
  },
  progressOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  progressText: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    fontSize: 13,
    textAlign: 'center',
  },
  mapa: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  // Loading
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
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#6C47FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Barra de Busca
  searchBox: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 60 : 40,
    width: "90%",
    alignSelf: "center",
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "white",
    paddingHorizontal: 15,
    fontSize: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  searchButton: {
    position: 'absolute',
    right: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info Box
  infoBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 125 : 105,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  radiusLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  radiusHint: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 12,
  },
  radiusSlider: {
    width: '100%',
    height: 40,
  },
  radiusScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  radiusScaleText: {
    color: '#aaa',
    fontSize: 12,
  },

  // Marcadores
  markerWrapper: {
    alignItems: 'center',
  },
  markerBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  markerPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -3,
  },

  // Botões
  botoesContainer: {
    position: "absolute",
    bottom: 40,
    right: 20,
    flexDirection: "column",
    gap: 12,
  },
  botao: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  listaButton: {
    backgroundColor: "#9C27B0",
  },
  locationButton: {
    backgroundColor: "#6C47FF",
  },
  radiusButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 6,
    flexDirection: 'column',
  },
  radiusButtonLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  filtrosButton: {
    backgroundColor: "#4A90E2",
  },
  refreshButton: {
    backgroundColor: "#50E3C2",
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  radiusModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  radiusModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 20,
  },
  radiusModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radiusModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  radiusActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  radiusActionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  radiusCancel: {
    backgroundColor: '#2a2a2a',
  },
  radiusApply: {
    backgroundColor: '#6C47FF',
  },
  radiusActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  radiusActionTextApply: {
    color: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Lista
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },

  // Card do Lugar
  lugarCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  lugarHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lugarInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lugarNome: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  lugarEndereco: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB800',
  },
  ratingCount: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#999',
  },
  verDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  verDetalhesText: {
    fontSize: 14,
    color: '#6C47FF',
    fontWeight: '600',
    marginRight: 4,
  },
});


/**
 * Mapa (Web)
 * - Renderiza Google Maps via @react-google-maps/api.
 * - Busca lugares próximos (Places API) conforme filtros e raio.
 * - Oferece busca por texto, lista, centralização e controle de raio.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from "react-native";
import Slider from "@react-native-community/slider";
import { useJsApiLoader, GoogleMap, MarkerF } from "@react-google-maps/api";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  buscarEstabelecimentosNoturnos,
  buscarPorTexto,
  buscarLugaresProximos as buscarLugaresPorTipo,
  kmToMeters,
} from "../services/googlePlaces";
import { VENUE_TYPES, getVenueConfigByTypes } from "../constants/venueTypes";
import { filterPlacesWithinRadius } from "../utils/distance";

/**
 * Componente principal do mapa na Web.
 */
export default function MapWeb() {
  const params = useLocalSearchParams();
  const mapRef = useRef(null);
  const markerIconCache = useRef({});
  const requestSeqRef = useRef(0);

  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [lugares, setLugares] = useState([]);
  const [filtrosAtivos, setFiltrosAtivos] = useState([]);
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [radiusKm, setRadiusKm] = useState(1);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [radiusDraft, setRadiusDraft] = useState(1);
  const DEFAULT_ZOOM = 15;

  const filtrosParaTipos = useMemo(() => ({
    Bares: VENUE_TYPES.Bares.googleType,
    Restaurantes: VENUE_TYPES.Restaurantes.googleType,
    Baladas: VENUE_TYPES.Baladas.googleType,
    Cafés: VENUE_TYPES["Cafés"].googleType,
    Lanchonetes: VENUE_TYPES.Lanchonetes.googleType,
    Adegas: VENUE_TYPES.Adegas.googleType,
    "Food Trucks": VENUE_TYPES["Food Trucks"].googleType,
  }), []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  useEffect(() => {
    if (params.filtros) {
      try {
        const filtrosArray = JSON.parse(params.filtros);
        setFiltrosAtivos(filtrosArray);
      } catch {}
    }
  }, [params.filtros]);

  useEffect(() => {
    obterLocalizacao();
  }, []);

  useEffect(() => {
    if (localizacaoAtual) {
      buscarLugaresProximos();
    }
  }, [localizacaoAtual, buscarLugaresProximos]);

  useEffect(() => {
    if (mapRef.current && localizacaoAtual) {
      mapRef.current.panTo({
        lat: localizacaoAtual.latitude,
        lng: localizacaoAtual.longitude,
      });
      mapRef.current.setZoom(DEFAULT_ZOOM);
    }
  }, [localizacaoAtual]);

  /**
   * Solicita permissão e obtém a localização atual do usuário.
   */
  const obterLocalizacao = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCarregando(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocalizacaoAtual({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setCarregando(false);
    } catch (e) {
      console.error("Erro ao obter localização (web):", e);
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
    try {
      let resultados = [];
      const radiusBaseKm = typeof customRadiusKm === "number" ? customRadiusKm : radiusKm;
      const radiusMeters = kmToMeters(radiusBaseKm);
      if (filtrosAtivos.length > 0) {
        const promises = filtrosAtivos.map((f) => {
          const tipo = filtrosParaTipos[f] || "restaurant";
          return buscarLugaresPorTipo(
            localizacaoAtual.latitude,
            localizacaoAtual.longitude,
            tipo,
            radiusMeters
          );
        });
        const todosResultados = await Promise.all(promises);
        resultados = todosResultados.flat();
        resultados = resultados.filter(
          (lugar, index, self) => index === self.findIndex((l) => l.place_id === lugar.place_id)
        );
      } else {
        resultados = await buscarEstabelecimentosNoturnos(
          localizacaoAtual.latitude,
          localizacaoAtual.longitude,
          radiusMeters
        );
      }
      const filtrados = filterPlacesWithinRadius(resultados, localizacaoAtual, radiusMeters);
      if (requestSeqRef.current === requestId) {
        setLugares(filtrados);
      }
    } catch (error) {
      console.error("Erro ao buscar lugares (web):", error);
    }
    if (requestSeqRef.current === requestId) {
      setBuscando(false);
    }
  }, [localizacaoAtual, filtrosAtivos, radiusKm, filtrosParaTipos]);

  /**
   * Realiza busca por texto com base no raio atual.
   */
  const realizarBusca = async () => {
    if (!buscaTexto.trim() || !localizacaoAtual) return;
    setBuscando(true);
    try {
      const resultados = await buscarPorTexto(
        buscaTexto,
        localizacaoAtual.latitude,
        localizacaoAtual.longitude,
        kmToMeters(radiusKm)
      );
      const filtrados = filterPlacesWithinRadius(resultados, localizacaoAtual, kmToMeters(radiusKm));
      setLugares(filtrados);
    } catch (error) {
      console.error("Erro ao buscar (web):", error);
    }
    setBuscando(false);
  };

  /**
   * Navega para a tela de detalhes do local selecionado.
   */
  const abrirDetalhes = (lugar) => {
    router.push({
      pathname: "/localDetails",
      params: {
        placeId: lugar.place_id,
        name: lugar.name,
        address: lugar.vicinity,
        rating: lugar.rating || 0,
        totalRatings: lugar.user_ratings_total || 0,
        types: JSON.stringify(lugar.types || []),
        latitude: lugar.geometry.location.lat,
        longitude: lugar.geometry.location.lng,
        isOpen: lugar.opening_hours?.open_now ? "true" : "false",
      },
    });
  };

  const center = useMemo(() => {
    if (!localizacaoAtual) return { lat: -23.55052, lng: -46.633308 };
    return { lat: localizacaoAtual.latitude, lng: localizacaoAtual.longitude };
  }, [localizacaoAtual]);

  /**
   * Callback de carregamento do mapa para manter uma ref do objeto Map.
   */
  const onMapLoad = (map) => {
    mapRef.current = map;
  };

  /**
   * Centraliza o mapa na posição atual do usuário.
   */
  const centralizarNoUsuario = () => {
    if (mapRef.current && localizacaoAtual) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(DEFAULT_ZOOM);
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
    buscarLugaresProximos(radiusDraft);
  };

  /** Abre a tela de filtros, mantendo os filtros ativos atuais. */
  const abrirFiltros = () => {
    router.push({
      pathname: "/filtros",
      params: { selecionados: JSON.stringify(filtrosAtivos) },
    });
  };

  if (carregando || !isLoaded) {
    return (
      <View style={[styles.fill, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6C47FF" />
        <Text style={styles.loadingText}>{loadError ? "Falha ao carregar o mapa" : "Carregando mapa..."}</Text>
      </View>
    );
  }

  const formatRadiusLabel = () => `${radiusKm.toFixed(1)} km`;
  const formatRadiusDraftLabel = () => `${radiusDraft.toFixed(1)} km`;

  const getMarkerIcon = (color, label) => {
    if (!window?.google?.maps) return null;
    const cacheKey = `${color}-${label}`;
    if (markerIconCache.current[cacheKey]) {
      return markerIconCache.current[cacheKey];
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg">
        <path d="M26 0C13.297 0 2.999 10.298 3 23.001C3.001 38.52 26 72 26 72C26 72 48.999 38.52 49 23.001C49.001 10.298 38.703 0 26 0Z" fill="${color}"/>
        <circle cx="26" cy="24" r="14" fill="rgba(255,255,255,0.85)" />
        <text x="26" y="29" text-anchor="middle" font-family="Arial" font-size="16" fill="${color}" font-weight="700">${label}</text>
      </svg>`;

    markerIconCache.current[cacheKey] = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(40, 55),
      anchor: new window.google.maps.Point(20, 55),
    };

    return markerIconCache.current[cacheKey];
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <GoogleMap
          onLoad={onMapLoad}
          mapContainerStyle={styles.mapStyle}
          center={center}
          zoom={DEFAULT_ZOOM}
          options={{ streetViewControl: false, fullscreenControl: false }}
        >
          {lugares.map((lugar) => {
            const config = getVenueConfigByTypes(lugar.types) || VENUE_TYPES.Bares;
            const iconConfig = getMarkerIcon(config.color, config.label[0]?.toUpperCase() || "L");
            return (
              <MarkerF
                key={lugar.place_id}
                position={{
                  lat: lugar.geometry.location.lat,
                  lng: lugar.geometry.location.lng,
                }}
                title={lugar.name}
                onClick={() => abrirDetalhes(lugar)}
                icon={iconConfig || undefined}
              />
            );
          })}
        </GoogleMap>
      </View>

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
        <TouchableOpacity style={styles.searchButton} onPress={realizarBusca} disabled={buscando}>
          {buscando ? (
            <ActivityIndicator size="small" color="#6C47FF" />
          ) : (
            <Ionicons name="search" size={20} color="#6C47FF" />
          )}
        </TouchableOpacity>
      </View>

      {lugares.length > 0 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {lugares.length} {lugares.length === 1 ? "lugar encontrado" : "lugares encontrados"}
          </Text>
        </View>
      )}

      <View style={styles.botoesContainer}>
        <TouchableOpacity style={[styles.botao, styles.listaButton]} onPress={() => setMostrarLista(true)}>
          <Ionicons name="list" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botao, styles.locationButton]} onPress={centralizarNoUsuario}>
          <Ionicons name="navigate" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botao, styles.radiusButton]} onPress={abrirModalRaio}>
          <Ionicons name="radio-outline" size={20} color="#fff" />
          <Text style={styles.radiusButtonLabel}>{formatRadiusLabel()}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botao, styles.filtrosButton]} onPress={abrirFiltros}>
          <Ionicons name="filter" size={20} color="#fff" />
          {filtrosAtivos.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filtrosAtivos.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botao, styles.refreshButton]} onPress={buscarLugaresProximos} disabled={buscando}>
          {buscando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={mostrarLista} animationType="slide" onRequestClose={() => setMostrarLista(false)}>
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
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: lugar.opening_hours.open_now ? "#4CAF50" : "#F44336" },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {lugar.opening_hours.open_now ? "Aberto agora" : "Fechado"}
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
              minimumValue={1}
              maximumValue={10}
              value={radiusDraft}
              step={0.5}
              minimumTrackTintColor="#6C47FF"
              maximumTrackTintColor="#444"
              thumbTintColor="#6C47FF"
              onValueChange={setRadiusDraft}
            />
            <View style={styles.radiusScale}>
              <Text style={styles.radiusScaleText}>1 km</Text>
              <Text style={styles.radiusScaleText}>10 km</Text>
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
  container: { flex: 1 },
  fill: { flex: 1 },
  mapContainer: { flex: 1 },
  mapStyle: { width: "100%", height: "100%" },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  loadingText: { marginTop: 16, fontSize: 16, color: "#fff" },
  searchBox: {
    position: "absolute",
    top: 40,
    width: "90%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "white",
    paddingHorizontal: 15,
    fontSize: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  searchButton: {
    position: "absolute",
    right: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBox: {
    position: "absolute",
    top: 105,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  infoText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  radiusLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  radiusHint: {
    color: "#bbb",
    fontSize: 12,
    marginBottom: 12,
  },
  radiusSlider: {
    width: "100%",
    height: 40,
  },
  radiusScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  radiusScaleText: {
    color: "#aaa",
    fontSize: 12,
  },
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
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  listaButton: { backgroundColor: "#9C27B0" },
  locationButton: { backgroundColor: "#6C47FF" },
  radiusButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 6,
    paddingVertical: 6,
    flexDirection: "column",
  },
  radiusButtonLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  filtrosButton: { backgroundColor: "#4A90E2" },
  refreshButton: { backgroundColor: "#50E3C2" },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  modalContainer: { flex: 1, backgroundColor: "#0a0a0a" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "#1a1a1a",
  },
  modalTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { marginTop: 16, fontSize: 18, color: "#999", fontWeight: "600" },
  radiusModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  radiusModalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 20,
  },
  radiusModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  radiusModalTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  radiusActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  radiusActionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  radiusCancel: { backgroundColor: "#2a2a2a" },
  radiusApply: { backgroundColor: "#6C47FF" },
  radiusActionText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  radiusActionTextApply: { color: "#fff" },
  lugarCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  lugarHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  lugarInfo: { flex: 1, marginLeft: 12 },
  lugarNome: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 4 },
  lugarEndereco: { fontSize: 14, color: "#999", lineHeight: 20 },
  ratingContainer: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  ratingText: { marginLeft: 4, fontSize: 16, fontWeight: "600", color: "#FFB800" },
  ratingCount: { marginLeft: 4, fontSize: 14, color: "#666" },
  statusContainer: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, color: "#999" },
  verDetalhes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  verDetalhesText: { fontSize: 14, color: "#6C47FF", fontWeight: "600", marginRight: 4 },
});

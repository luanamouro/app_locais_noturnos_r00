/**
 * Tela de Filtros
 * - Permite selecionar/desselecionar tipos de estabelecimentos.
 * - Aplica filtros retornando à tela do mapa.
 */
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from "react-native";
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VENUE_TYPE_LIST } from "../constants/venueTypes";

/**
 * Lista interativa que envia os filtros selecionados de volta para o mapa.
 */
export default function Filtros() {
  const params = useLocalSearchParams();
  const [selecionados, setSelecionados] = useState([]);

  useEffect(() => {
    if (params.selecionados) {
      try {
        const parsed = JSON.parse(params.selecionados);
        if (Array.isArray(parsed)) {
          setSelecionados(parsed);
        }
      } catch {
        // ignore parsing errors
      }
    }
  }, [params.selecionados]);

  /** Alterna a seleção de um filtro específico. */
  function toggleFiltro(item) {
    if (selecionados.includes(item)) {
      setSelecionados(selecionados.filter((f) => f !== item));
    } else {
      setSelecionados([...selecionados, item]);
    }
  }

  /** Persiste os filtros escolhidos e retorna ao mapa. */
  function aplicarFiltros() {
    router.replace({
      pathname: '/map',
      params: { filtros: JSON.stringify(selecionados) }
    });
  }

  /** Remove todos os filtros marcados pelo usuário. */
  function limparFiltros() {
    setSelecionados([]);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Filtros</Text>
        {selecionados.length > 0 && (
          <TouchableOpacity onPress={limparFiltros}>
            <Text style={styles.limparTexto}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.lista}>
        {VENUE_TYPE_LIST.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.item,
              selecionados.includes(item.id) && styles.itemSelecionado
            ]}
            onPress={() => toggleFiltro(item.id)}
          >
            <View style={styles.itemContent}>
              <View style={styles.iconeContainer}>
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={selecionados.includes(item.id) ? "#fff" : item.color} 
                />
              </View>
              <Text style={[
                styles.textoItem,
                selecionados.includes(item.id) && styles.textoItemSelecionado
              ]}>
                {item.label}
              </Text>
            </View>

            <View style={styles.checkbox}>
              {selecionados.includes(item.id) && (
                <Ionicons name="checkmark-circle" size={26} color="#6C47FF" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {selecionados.length > 0 && (
          <Text style={styles.countText}>
            {selecionados.length} {selecionados.length === 1 ? 'filtro selecionado' : 'filtros selecionados'}
          </Text>
        )}
        <TouchableOpacity
          style={styles.btnAplicar}
          onPress={aplicarFiltros}
        >
          <Text style={styles.btnTexto}>Aplicar Filtros</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    marginRight: 15,
  },
  titulo: {
    fontSize: 24,
    fontWeight: "700",
    color: '#fff',
    flex: 1,
  },
  limparTexto: {
    fontSize: 16,
    color: '#6C47FF',
    fontWeight: '600',
  },
  lista: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  itemSelecionado: {
    backgroundColor: '#6C47FF20',
    borderColor: '#6C47FF',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconeContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  textoItem: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  textoItemSelecionado: {
    color: '#fff',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#1a1a1a',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  countText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  btnAplicar: {
    backgroundColor: "#6C47FF",
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#6C47FF",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  btnTexto: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});

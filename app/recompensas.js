import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

/**
 * Tela de fidelidade que exibe saldo de pontos e recompensas resgatáveis.
 */
export default function Recompensas() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* Título */}
      <Text style={styles.title}>Recompensas</Text>

      {/* Pontos */}
      <Text style={styles.points}>
        Seus pontos: <Text style={styles.pointsNumber}>320</Text>
      </Text>

      {/* Subtítulo */}
      <Text style={styles.subtitle}>Descontos disponíveis</Text>

      {/* Botão 1 */}
      <TouchableOpacity style={styles.rewardButton}>
        <Text style={styles.rewardText}>10% off - Bar  (50 pts)</Text>
      </TouchableOpacity>

      {/* Botão 2 */}
      <TouchableOpacity style={styles.rewardButton}>
        <Text style={styles.rewardText}>1 drink grátis - Balada  (100 pts)</Text>
      </TouchableOpacity>

      {/* Como ganhar pontos */}
      <Text style={styles.subtitle}>Como ganhar pontos?</Text>

      <View style={styles.pointsBox}>
        <Text style={styles.pointsInfo}>📸 Fotos — 1 ponto</Text>
        <Text style={styles.pointsInfo}>⭐ Avaliação — 2 pontos</Text>
      </View>

      {/* Botão Voltar */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-circle" size={55} color="#555" />
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#222",
  },

  points: {
    fontSize: 20,
    textAlign: "center",
    color: "#333",
    marginBottom: 10,
  },

  pointsNumber: {
    fontWeight: "700",
    color: "#007BFF",
  },

  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    marginTop: 25,
    marginBottom: 12,
  },

  rewardButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "center",
    elevation: 2,
  },

  rewardText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "500",
  },

  pointsBox: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    elevation: 2,
  },

  pointsInfo: {
    fontSize: 17,
    color: "#444",
    paddingVertical: 4,
  },

  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
});

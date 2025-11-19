import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Área pessoal que centraliza métricas do usuário e atalhos para recursos sociais.
 */
export default function Perfil() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>

      {/* Ícone de Usuário */}
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={110} color="#444" />
        <Text style={styles.userName}>Nome do Usuário</Text>
        <Text style={styles.score}>⭐ Pontuação: 4.7</Text>
      </View>

      {/* Avaliações */}
      <Text style={styles.sectionTitle}>Avaliações</Text>

      <View style={styles.ratingBox}>
        <Text style={styles.ratingItem}>🍺 Bares: ⭐⭐⭐⭐☆ (4.0)</Text>
        <Text style={styles.ratingItem}>🍽 Restaurantes: ⭐⭐⭐⭐⭐ (5.0)</Text>
        <Text style={styles.ratingItem}>🎉 Baladas: ⭐⭐⭐⭐☆ (4.2)</Text>
      </View>

      {/* Botões */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/fotos")}
        >
        <Text style={styles.buttonText}>Fotos</Text>
    </TouchableOpacity>


        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/recompensas")}
        >
          <Text style={styles.buttonText}>Recompensas</Text>
        </TouchableOpacity>

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
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 10,
    color: "#222",
  },
  score: {
    fontSize: 16,
    color: "#777",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 20,
    color: "#222",
  },
  ratingBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  ratingItem: {
    fontSize: 16,
    paddingVertical: 4,
    color: "#444",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 35,
  },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    minWidth: 130,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "500",
  },
  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
  }
});

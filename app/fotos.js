import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * Tela de upload/avaliação que prepara o envio de fotos e comentários.
 */
export default function Fotos() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const photos = [
    { id: 1, uri: "https://picsum.photos/200/300" },
    { id: 2, uri: "https://picsum.photos/200/301" },
    { id: 3, uri: "https://picsum.photos/200/302" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* Ícone de fotos */}
      <View style={styles.header}>
        <Ionicons name="images-outline" size={110} color="#444" />
        <Text style={styles.subtitle}>Adicione uma foto.</Text>
      </View>

      {/* Carrossel de fotos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
        {photos.map((photo) => (
          <Image key={photo.id} source={{ uri: photo.uri }} style={styles.photo} />
        ))}
      </ScrollView>

      {/* Subtítulo Comentário */}
      <Text style={styles.commentTitle}>Adicione seu comentário:</Text>

      {/* Avaliação por estrelas */}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color="#FFB800"
              style={{ marginRight: 6 }}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Área de texto */}
      <TextInput
        style={styles.input}
        multiline
        placeholder="Escreva seu comentário..."
        value={comment}
        onChangeText={setComment}
      />

      {/* Botão Enviar */}
      <TouchableOpacity style={styles.submitButton}>
        <Text style={styles.submitText}>Enviar</Text>
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
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 25,
  },
  subtitle: {
    fontSize: 20,
    marginTop: 10,
    color: "#333",
    fontWeight: "500",
  },
  carousel: {
    marginBottom: 25,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 14,
    marginRight: 12,
  },
  commentTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    color: "#222",
  },
  starsRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    height: 120,
    fontSize: 16,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
    marginBottom: 40,
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
});

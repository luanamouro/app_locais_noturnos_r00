import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/**
 * Hub pós-login com atalhos para mapa, perfil e recompensas.
 */
export default function Inicio() {
  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Início</Text>

        <TouchableOpacity
          style={styles.userButton}
          onPress={() => router.push('/perfil')}   // tela do usuário (pode criar depois)
        >
          <Ionicons name="person-circle-outline" size={40} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* BOTÃO PRINCIPAL */}
      <TouchableOpacity
        style={styles.mainButton}
        onPress={() => router.push('/map')}
      >
        <Text style={styles.mainButtonText}>Quer ir aonde?</Text>
      </TouchableOpacity>

      {/* BOTÃO RECOMPENSAS */}
      <TouchableOpacity
        style={styles.rewardsButton}
        onPress={() => router.push('/recompensas')} 
      >
        <Ionicons name="star" size={22} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.rewardsButtonText}>Recompensas</Text>
      </TouchableOpacity>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 50,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },

  userButton: {
    padding: 4,
  },

  mainButton: {
    backgroundColor: '#6C47FF',
    paddingVertical: 20,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },

  rewardsButton: {
    flexDirection: 'row',
    backgroundColor: '#FFB800',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },

  rewardsButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});

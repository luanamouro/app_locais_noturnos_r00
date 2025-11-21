import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

/** Perfil do usuário com ações: Fotos, Recompensas, Logout */
export default function Perfil() {
  const { user, signed, refreshProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (signed) {
      loadProfile();
    }
  }, [signed]);

  async function loadProfile() {
    setLoading(true);
    try {
      await refreshProfile();
    } catch (error) {
      Alert.alert('Erro', error.message || 'Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }



  if (!signed) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Você não está logado.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Ir para Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      {loading ? (
        <View style={styles.center}> 
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.infoText}>Carregando perfil...</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Ionicons name="person-circle-outline" size={110} color="#444" />
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.score}>{user?.email}</Text>
          </View>

          <Text style={styles.sectionTitle}>Ações</Text>


          <TouchableOpacity style={styles.button} onPress={() => router.push('/fotos')}>
            <Text style={styles.buttonText}>Fotos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => router.push('/recompensas')}>
            <Text style={styles.buttonText}>Recompensas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={signOut}>
            <Text style={styles.buttonText}>Sair</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-circle" size={55} color="#555" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 10,
    color: '#222',
  },
  score: {
    fontSize: 16,
    color: '#777',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 20,
    color: '#222',
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    minWidth: 160,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#DB4437',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  infoText: {
    color: '#555',
    marginTop: 15,
    fontSize: 16,
  },
});
